Performance Analysis
====================

---

1. Overlap Detection Query

When a student books a slot, we check all their active bookings to see if any time range overlaps.

Current code (booking.service.js):

const activeBookings = await Booking.find({
  student: studentId,
  status: { $in: ['booked', 'attended'] }
}).populate('slot');

for (const b of activeBookings) {
  if (!b.slot) continue;
  const overlaps = slot.startTime < b.slot.endTime && slot.endTime > b.slot.startTime;
  if (overlaps) throw { statusCode: 409, errorCode: 'OVERLAPPING_BOOKING' };
}

Without index — explain("executionStats"):

  stage:               COLLSCAN
  totalDocsExamined:   5000
  totalKeysExamined:   0
  nReturned:           12
  executionTimeMillis: 45ms

With compound index:

bookingSchema.index({ student: 1, status: 1 });

  stage:               IXSCAN (index: student_1_status_1)
  totalDocsExamined:   12
  totalKeysExamined:   12
  nReturned:           12
  executionTimeMillis: 2ms

22x faster. MongoDB goes straight to the student's bookings instead of
scanning the whole collection.

Why { student: 1, status: 1 } and not { status: 1, student: 1 }?

student is far more selective — there are 200 students, each with ~25 bookings.
status only has 4 values spread across all 5000 bookings.

Putting student first narrows the set to ~25 documents immediately.
Reversing the order would first group by status (still ~4000 docs for 'booked'),
then filter by student — much worse.

---

2. Capacity Check — Atomic vs Read-Modify-Write

This is the most important query in the system. It prevents overbooking.

Bad approach (race condition):

const slot = await Slot.findById(slotId);
if (slot.confirmedCount < slot.capacity) {
  slot.confirmedCount++;
  await slot.save();
}

Timeline with two concurrent requests:
  T1: Request A reads confirmedCount=4, capacity=5, passes check
  T2: Request B reads confirmedCount=4, capacity=5, passes check
  T3: Request A writes confirmedCount=5
  T4: Request B writes confirmedCount=5  ← WRONG, slot is now oversold

Current code — single atomic operation:

const updatedSlot = await Slot.findOneAndUpdate(
  { _id: slotId, $expr: { $lt: ['$confirmedCount', '$capacity'] } },
  { $inc: { confirmedCount: 1 } },
  { new: true }
);

if (!updatedSlot) throw { statusCode: 409, errorCode: 'SLOT_FULL' };

MongoDB acquires a document lock, evaluates the condition, and increments —
all in one step. The second concurrent request hits the same document after
the lock releases and finds confirmedCount already equals capacity, so it
returns null and gets a 409.

No transaction needed. Document-level atomicity is enough here.

Index used: _id (primary key, always indexed by MongoDB automatically).
No additional index needed — the lookup is always by specific _id.

---

3. Waitlist Promotion on Cancellation

When a booking is cancelled, the earliest waitlist entry must be promoted.
Two simultaneous cancellations must not promote the same entry twice.

const promoted = await WaitlistEntry.findOneAndUpdate(
  { slot: slotId, status: 'waiting' },
  { status: 'promoted' },
  { sort: { createdAt: 1 }, new: true }
);

findOneAndUpdate is also atomic at the document level. The first cancellation
claims the entry by flipping status to 'promoted'. The second cancellation
finds no document matching status: 'waiting' and gets null — safe.

Index supporting this:

waitlistSchema.index({ slot: 1, status: 1, createdAt: 1 });

This covers the filter (slot + status) and the sort (createdAt) in one index scan.
Without it, MongoDB would scan all waitlist entries for the slot and sort in memory.

---

4. Analytics Pipeline — No JavaScript Loops

GET /api/analytics/counsellor/:id runs a single aggregate() call with $facet.
Zero documents are pulled into Node.js — all computation happens in MongoDB.

The pipeline order matters for performance:

  1. $match status != cancelled     ← shrink dataset before joins
  2. $lookup slots                  ← join only matched bookings
  3. $unwind slot
  4. $match slot.counsellor == id   ← filter after slot data is available
  5. $facet { overview, buckets, busiestSlots, dailySeries }

Running $lookup before $match would join every booking to every slot
first, then throw most away. Moving $match first means fewer documents
enter the join stage.

Index supporting the pipeline:

bookingSchema.index({ status: 1, slot: 1 });
