const bookingService = require('../services/booking.service');
const { success, error } = require('../utils/response');

async function createBooking(req, res, next) {
  try {
    const { slotId } = req.body;
    const studentId = req.user.userId;
    const idempotencyKey = req.headers['idempotency-key'];
    
    const result = await bookingService.createBooking(studentId, slotId, idempotencyKey);
    
    if (result.isIdempotent) {
      return success(res, { booking: result.booking }, 'Booking already exists', 200);
    }
    
    success(res, { booking: result.booking }, 'Booking created', 201);
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const studentId = req.user.userId;
    
    const booking = await bookingService.cancelBooking(id, studentId);
    success(res, { booking }, 'Booking cancelled');
  } catch (err) {
    next(err);
  }
}

async function updateOutcome(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const counsellorId = req.user.userId;
    
    const booking = await bookingService.updateBookingOutcome(id, counsellorId, status);
    success(res, { booking }, 'Booking outcome updated');
  } catch (err) {
    next(err);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const studentId = req.user.userId;
    const bookings = await bookingService.getStudentBookings(studentId);
    
    success(res, { bookings });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  cancelBooking,
  updateOutcome,
  getMyBookings
};
