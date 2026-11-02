const Booking = require('../models/booking.model');
const Slot = require('../models/slot.model');
const WaitlistEntry = require('../models/waitlist.model');
const AuditLog = require('../models/auditlog.model');

const BOOKING_WINDOW_MINUTES = 30;
const CANCELLATION_CUTOFF_HOURS = 2;

async function createBooking(studentId, slotId, idempotencyKey = null) {
  // idempotency check — return existing booking for same key
  if (idempotencyKey) {
    const existing = await Booking.findOne({ idempotencyKey });
    if (existing) {
      return { booking: existing, isIdempotent: true };
    }
  }

  const slot = await Slot.findById(slotId);
  if (!slot) {
    throw { statusCode: 404, message: 'Slot not found' };
  }

  // booking window check — server time, never client
  const minutesUntilStart = (slot.startTime - new Date()) / (1000 * 60);
  if (minutesUntilStart < BOOKING_WINDOW_MINUTES) {
    throw {
      statusCode: 422,
      message: `Cannot book a slot starting in less than ${BOOKING_WINDOW_MINUTES} minutes`
    };
  }

  // overlap check — student cannot have two active bookings that overlap in time
  const activeBookings = await Booking.find({
    student: studentId,
    status: { $in: ['booked', 'attended'] }
  }).populate('slot');

  for (const b of activeBookings) {
    if (!b.slot) continue;
    const overlaps = slot.startTime < b.slot.endTime && slot.endTime > b.slot.startTime;
    if (overlaps) {
      throw {
        statusCode: 409,
        message: 'You already have a booking that overlaps with this slot',
        errorCode: 'OVERLAPPING_BOOKING'
      };
    }
  }

  // atomic capacity check + increment — this is what prevents overbooking
  // findOneAndUpdate with $expr is atomic at the document level, no transaction needed
  const updatedSlot = await Slot.findOneAndUpdate(
    { _id: slotId, $expr: { $lt: ['$confirmedCount', '$capacity'] } },
    { $inc: { confirmedCount: 1 } },
    { new: true }
  );

  if (!updatedSlot) {
    throw {
      statusCode: 409,
      message: 'Slot is full',
      errorCode: 'SLOT_FULL'
    };
  }

  const bookingData = { student: studentId, slot: slotId, status: 'booked' };
  if (idempotencyKey) bookingData.idempotencyKey = idempotencyKey;

  try {
    const booking = await Booking.create(bookingData);
    return { booking, isIdempotent: false };
  } catch (err) {
    // if booking creation fails for any reason, roll back the seat count
    await Slot.findByIdAndUpdate(slotId, { $inc: { confirmedCount: -1 } });
    throw err;
  }
}

async function cancelBooking(bookingId, studentId) {
  const booking = await Booking.findById(bookingId).populate('slot');

  if (!booking) {
    throw { statusCode: 404, message: 'Booking not found' };
  }

  if (booking.student.toString() !== studentId) {
    throw { statusCode: 403, message: 'Not your booking' };
  }

  if (booking.status !== 'booked') {
    throw { statusCode: 422, message: 'Only active bookings can be cancelled' };
  }

  const hoursUntilStart = (booking.slot.startTime - new Date()) / (1000 * 60 * 60);
  if (hoursUntilStart < CANCELLATION_CUTOFF_HOURS) {
    throw {
      statusCode: 422,
      message: `Cannot cancel within ${CANCELLATION_CUTOFF_HOURS} hours of slot start`
    };
  }

  booking.status = 'cancelled';
  await booking.save();

  await Slot.findByIdAndUpdate(booking.slot._id, { $inc: { confirmedCount: -1 } });

  // promote the earliest waitlist entry — findOneAndUpdate is atomic so two
  // simultaneous cancellations cannot promote the same entry twice
  const promoted = await WaitlistEntry.findOneAndUpdate(
    { slot: booking.slot._id, status: 'waiting' },
    { status: 'promoted' },
    { sort: { createdAt: 1 }, new: true }
  );

  if (promoted) {
    const newBooking = await Booking.create({
      student: promoted.student,
      slot: booking.slot._id,
      status: 'booked'
    });

    await Slot.findByIdAndUpdate(booking.slot._id, { $inc: { confirmedCount: 1 } });

    await AuditLog.create({
      action: 'WAITLIST_PROMOTION',
      entityType: 'Booking',
      entityId: newBooking._id,
      performedBy: null,
      details: {
        student: promoted.student,
        slot: booking.slot._id,
        reason: 'Promoted after cancellation',
        cancelledBooking: bookingId
      }
    });
  }

  return booking;
}

async function updateBookingOutcome(bookingId, counsellorId, newStatus) {
  const validTransitions = {
    booked: ['attended', 'no_show']
  };

  const booking = await Booking.findById(bookingId).populate('slot');

  if (!booking) {
    throw { statusCode: 404, message: 'Booking not found' };
  }

  if (booking.slot.counsellor.toString() !== counsellorId) {
    throw { statusCode: 403, message: 'This slot does not belong to you' };
  }

  const allowed = validTransitions[booking.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw {
      statusCode: 422,
      message: `Cannot transition from ${booking.status} to ${newStatus}`
    };
  }

  booking.status = newStatus;
  await booking.save();

  return booking;
}

async function getStudentBookings(studentId) {
  return Booking.find({
    student: studentId,
    status: { $in: ['booked', 'attended', 'no_show'] }
  })
    .populate({ path: 'slot', populate: { path: 'counsellor', select: 'name' } })
    .sort({ createdAt: -1 });
}

module.exports = {
  createBooking,
  cancelBooking,
  updateBookingOutcome,
  getStudentBookings
};
