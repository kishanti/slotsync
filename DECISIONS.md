Architecture Decisions

This document explains the main technical decisions made while building the SlotSync backend.

1. Cursor-Based Pagination

We chose cursor-based pagination instead of skip() because skip becomes slower when the database contains more records.

With cursor pagination, MongoDB uses the last record's ID to find the next set of results.

Example:

javascript
Slot.find({ _id: { $gt: cursor } })
  .sort({ _id: 1 })
  .limit(21);


Benefits:

Better performance with large datasets.
Uses database indexes.
Avoids skipping unnecessary records.

The only limitation is that users cannot directly jump to a specific page.

We chose this approach because SlotSync may have many slots and bookings in the future.

2. Separate Booking Collection

Instead of storing student IDs and slot IDs in arrays, we created a separate Booking collection.

Example:

javascript
{
  student: ObjectId,
  slot: ObjectId,
  status: String,
  timestamps: true
}


This makes it easier to manage bookings, update their status, prevent duplicates, and maintain booking history.

We chose this structure because SlotSync needs to handle bookings, cancellations, and waitlists efficiently.

3. Refresh Token Rotation

We use refresh token rotation to improve account security.

Whenever a refresh token is used:

The old token is marked as used.
A new token is generated.
The new token is stored and sent through a cookie.

If an already-used token is presented again, the system revokes the entire token family and requires the user to log in again.

This helps detect token reuse and reduces the risk of stolen tokens being used.

4. Append-Only Audit Logs

Audit logs store important activities, such as booking changes and user actions.

We made audit logs append-only, which means new records can be created but existing records cannot be updated or deleted through the model.

Example:

javascript
auditLogSchema.pre('updateOne', function(next) {
  next(new Error('AuditLog updates are not allowed'));
});

auditLogSchema.pre('deleteOne', function(next) {
  next(new Error('AuditLog deletes are not allowed'));
});


We also added tests to check that update and delete operations are rejected.

This helps keep activity records reliable and useful for tracking changes.

Summary

We made these decisions to keep SlotSync simple, secure, and ready to handle more users.

Cursor pagination improves database performance.
A separate Booking collection makes booking management easier.
Refresh token rotation improves authentication security.
Append-only audit logs help maintain activity history.