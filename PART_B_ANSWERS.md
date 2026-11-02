PART B — Debug & Review
=======================

---

B1 — React
-----------

**Bug 1 — day is not in the dependency array**

The effect only re-runs when counsellorId changes, but day is also used inside it.
So when the user picks a different day, the fetch never fires and the old list stays on screen.
Students end up looking at the wrong day's slots without realising it.

fix:
```
}, [counsellorId, day]);
```

---

**Bug 2 — directly mutating state and passing the same array reference**

```
slots[i].seatsLeft = slots[i].seatsLeft - 1;  // mutates the existing object
setSlots(slots);                               // same reference, React skips re-render
```

React compares the old and new reference. Same array = no update = nothing changes on screen.
The user clicks Book, seat count doesn't move, they click again and get double-booked.

fix:
```
const updated = slots.map((s, idx) =>
  idx === i ? { ...s, seatsLeft: s.seatsLeft - 1 } : s
);
setSlots(updated);
```

---

**Bug 3 — missing Content-Type header on the POST**

```
body: JSON.stringify({ slotId: slots[i]._id })
// no headers
```

Without `Content-Type: application/json`, Express never parses the body.
req.body is undefined on the server so slotId is always undefined and the booking fails every time.

fix: add `headers: { "Content-Type": "application/json" }` to the fetch options.

---

**Bug 4 — no error handling, optimistic update never rolls back**

The seat count drops before the API call. If the server returns 409 (slot full) or the network dies,
the count stays decremented. User sees a seat gone but has no booking. No error shown either.

fix:
```
try {
  const res = await fetch("/api/bookings", { ... });
  if (!res.ok) {
    setSlots(slots); // put old data back
  }
} catch {
  setSlots(slots);
}
```

---

**Bug 5 — key={i} uses array index**

```
slots.map((s, i) => <Slot key={i} ... />)
```

When a slot is removed from the middle of the list, React reuses the wrong component instance
for the shifted items. Local state (like an open dropdown or input) ends up on the wrong slot.

fix: `key={s._id}` — use the slot's own database ID.

---

B2 — Express + Mongoose
------------------------

**Bug 1 — race condition on the capacity check (most critical)**

```
const slot = await Slot.findById(slotId);
if (slot.booked >= slot.capacity) return res.status(400)...
slot.booked = slot.booked + 1;
await slot.save();
```

Two requests hit this at the same time. Both read booked=4, both pass the check,
both write booked=5. A 5-seat slot ends up with 6 bookings. This will definitely
happen in production — it doesn't even need heavy load, two quick clicks does it.

fix — one atomic operation, no separate read:
```
const slot = await Slot.findOneAndUpdate(
  { _id: slotId, $expr: { $lt: ["$booked", "$capacity"] } },
  { $inc: { booked: 1 } },
  { new: true }
);
if (!slot) return res.status(409).json({ error: "full" });
```

---

**Bug 2 — wrong status code, 400 instead of 409**

400 means the request itself is bad (missing field, wrong format).
Here the request is fine, the slot just happens to be full. That is a 409 Conflict.
If frontend checks `status === 400` to show "slot full", it will also catch validation
errors and show the wrong message.

fix: `res.status(409)`

---

**Bug 3 — N+1 queries building the classmates list**

```
for (const b of await Booking.find({ slot: slotId })) {
  classmates.push(await User.findById(b.student));
}
```

30 students in the slot = 31 separate DB round trips. Under any real load this
adds seconds of latency per request and hammers the database connection pool.

fix:
```
const bookings = await Booking.find({ slot: slotId }).populate("student", "name email");
const classmates = bookings.map(b => b.student);
```

---

**Bug 4 — past-slot check runs after the booking is already written**

```
const booking = await Booking.create(...);  // already in DB
// ...classmates loop runs...
if (new Date(slot.startsAt) < new Date()) {
  await Booking.deleteOne({ _id: booking._id });
  return res.status(400)...
}
```

A ghost booking is created, the classmates loop wastes queries, then cleanup is attempted.
If deleteOne fails the ghost stays in the DB. The booked counter is also already incremented
and never corrected.

fix — check before touching anything:
```
if (new Date(slot.startsAt) < new Date()) {
  return res.status(422).json({ error: "slot already started" });
}
```

---

**Bug 5 — no try/catch, unhandled rejection can crash the server**

Any throw (bad ObjectId, DB timeout, network blip) hits Node's unhandled rejection handler.
In Node 18+ that terminates the process and takes every other live request down with it.

fix: wrap everything in `try { } catch (err) { next(err); }`

---

B3 — Aggregation
-----------------

**Bug 1 — $match comes after both $lookups, kills performance**

Current order: lookup users → unwind → lookup slots → unwind → match

Both joins run on the full bookings collection first. With 5000 bookings,
MongoDB is joining every single one before throwing most away. The match should
come before the lookups so only the relevant documents get joined.

corrected order:
```
1. $match  status != cancelled          ← shrink the set first
2. $lookup slots                        ← join only what passed the filter
3. $unwind slot
4. $match  slot.counsellor == id        ← filter by counsellor after slot is available
5. $addFields leadMinutes               ← compute the field before $group needs it
6. $group
7. $sort
8. $limit 5
```

The user $lookup can be removed entirely — student data is never used in the $group output.

index to create:
```
bookingSchema.index({ status: 1, slot: 1 });
```
This lets the first $match + subsequent slot filter use an index scan instead of a collscan.

---

**Bug 2 — counsellor ID compared as string, never matches**

```
"slot.counsellor": req.params.counsellorId   // plain string from URL
```

The counsellor field stored in MongoDB is an ObjectId, not a string. They never equal each other.
Pipeline returns zero results silently — no error, just empty data every time.

fix:
```
"slot.counsellor": new mongoose.Types.ObjectId(req.params.counsellorId)
```

---

**Bug 3 — $leadMinutes doesn't exist on the document**

```
avgLead: { $avg: "$leadMinutes" }
```

leadMinutes is not stored on the booking. $avg of a missing field returns null.
Every row in the result has avgLead: null.

fix — compute it before the $group:
```
{ $addFields: {
    leadMinutes: {
      $divide: [{ $subtract: ["$slot.startsAt", "$createdAt"] }, 60000]
    }
}}
```

---

**Bug 4 — day buckets are in UTC, wrong for Indian users**

```
{ $dateToString: { format: "%Y-%m-%d", date: "$slot.startsAt" } }
```

MongoDB stores everything in UTC. India is UTC+5:30.
A slot at 00:15 IST on Nov 5 is stored as 18:45 UTC on Nov 4.
Without a timezone, that slot gets bucketed under Nov 4, not Nov 5.
Daily reports will always be one row off for IST users.

fix:
```
{ $dateToString: { format: "%Y-%m-%d", date: "$slot.startsAt", timezone: "Asia/Kolkata" } }
```
