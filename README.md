SlotSync Backend

A backend for managing counselling appointments, built with a focus on secure bookings, concurrency handling, and reliable data management.

Features
JWT authentication with refresh token rotation
Role-based access (Admin, Counsellor, Student)
Safe booking with atomic MongoDB operations (no transactions needed)
Automatic waitlist promotion on cancellation
Analytics using a single MongoDB aggregation pipeline
Idempotent booking API via Idempotency-Key header
Optimistic concurrency control on slot edits
Append-only audit logging

Tech Stack
Backend: Node.js, Express
Database: MongoDB, Mongoose (standalone — no replica set required)
Authentication: JWT, bcrypt (cost 12)
Validation: Joi
Testing: Jest, Supertest, mongodb-memory-server
Containerization: Docker, Docker Compose

Requirements
Node.js 20+
MongoDB running locally or via Docker
Docker and Docker Compose (optional)

Getting Started

Local Setup

1. Copy environment variables
cp .env.example .env

2. Install dependencies
npm install

3. Start MongoDB (plain standalone — no replica set needed)
docker run -d --name mongo -p 27017:27017 mongo:7.0

4. Seed the database
npm run seed

5. Start the server
npm run dev

Server runs at http://localhost:5000

Using Docker
docker-compose up

Running Tests
npm test

Uses an in-memory MongoDB replica set (via mongodb-memory-server) so tests are fully isolated and need no local MongoDB running.

API Endpoints

Authentication
POST   /api/auth/register              Register a student (public)
POST   /api/auth/login                 Login (rate limited: 5/15min)
POST   /api/auth/refresh               Refresh access token (httpOnly cookie)
POST   /api/auth/logout                Logout and invalidate refresh token
GET    /api/auth/me                    Get current user
POST   /api/auth/counsellor            Create counsellor account (Admin only)
GET    /api/auth/counsellors           List all counsellors (Admin only)

Slots
POST   /api/slots                      Create slot (Admin)
PATCH  /api/slots/:id                  Update slot with version check (Admin)
GET    /api/slots                      List slots with cursor pagination (all auth)
GET    /api/slots/:id/bookings         Get bookings for a slot (Counsellor/Admin)

Bookings
POST   /api/bookings                   Book a slot (Student) — supports Idempotency-Key
DELETE /api/bookings/:id               Cancel booking (Student)
PATCH  /api/bookings/:id/outcome       Mark attended or no_show (Counsellor, own slots only)
GET    /api/bookings/my                Get my bookings (Student)

Waitlist
POST   /api/waitlist                   Join waitlist (Student, idempotent)

Analytics
GET    /api/analytics/counsellor/:id   Full analytics for a counsellor (Admin/Counsellor)

Audit
GET    /api/audit                      Paginated audit log (Admin)

Key Design Decisions

1. No transactions needed for concurrency

Booking uses a single atomic findOneAndUpdate with $expr to check and increment capacity in one operation. MongoDB guarantees document-level atomicity so no replica set or multi-document transaction is needed. A findOne + save approach would have a race condition — this does not.

2. Students and slots connected through Booking collection

Arrays on both sides would cause document growth, make queries harder to index, and create consistency problems when both sides need updating. A separate Booking document keeps the relationship clean, queryable, and indexable.

3. Waitlist promotion on cancellation

Uses findOneAndUpdate with sort: { createdAt: 1 } to atomically claim the earliest waiting entry. Two simultaneous cancellations cannot promote the same entry because the second update finds no document matching status: 'waiting' after the first already changed it.

4. All timestamps UTC, ISO-8601 in responses

No business logic depends on server timezone. The analytics IST bucketing is done inside the aggregation pipeline using timezone: 'Asia/Kolkata' in $dateToString.

5. Booking status transitions enforced in one place

The validTransitions map in booking.service.js is the single source of truth. Adding a new allowed transition means changing one line.

Project Structure
Backend/
├── src/
│   ├── config/          database connection
│   ├── controllers/     request handlers (thin layer, delegates to services)
│   ├── middleware/      auth, validation, error handler
│   ├── models/          Mongoose schemas with indexes
│   ├── routes/          index.js imports all routes, server.js mounts /api
│   ├── services/        all business logic lives here
│   ├── scripts/         seed.js
│   ├── utils/           jwt helpers, response wrapper
│   ├── validators/      Joi schemas
│   └── server.js        app setup + conditional listen (not called during tests)
├── __tests__/           12 Jest tests including concurrency test
├── Dockerfile           multi-stage, non-root user
├── docker-compose.yml
├── DECISIONS.md
├── PERFORMANCE.md
└── package.json
