Quick Start Guide
=================

No replica set needed. MongoDB runs as a plain standalone instance.

---

Option 1 — Docker (easiest)

cd Backend
docker-compose up

Wait about 10 seconds for Mongo to start, then in a second terminal:

docker-compose exec api npm run seed

API is live at http://localhost:5000

---

Option 2 — Local dev

Step 1: Start MongoDB

docker run -d --name slotsync-mongo -p 27017:27017 mongo:7.0

No replica set init needed. Plain standalone works fine.

Step 2: Install dependencies

cd Backend
npm install

Step 3: Seed the database

npm run seed

Creates:
  1 admin
  5 counsellors
  200 students
  300 slots (last 14 days + next 14 days)
  ~5000 bookings
  ~800 waitlist entries

Step 4: Start the server

npm run dev

Server runs at http://localhost:5000
You should see: MongoDB connected successfully

---

Running tests

npm test

Tests spin up their own in-memory MongoDB (mongodb-memory-server) so no local
Mongo needs to be running. All 12 tests should pass.

---

Demo login credentials (after seed)

Role        Email                       Password
Admin       admin@slotsync.com          admin123
Counsellor  counsellor1@slotsync.com    counsellor123
Student     student1@slotsync.com       student123

Counsellors go up to counsellor5, students go up to student200.

---

Quick API test

Login and get a token:

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@slotsync.com","password":"student123"}'

Copy the accessToken from the response, then:

curl http://localhost:5000/api/slots \
  -H "Authorization: Bearer YOUR_TOKEN"

Book a slot:

curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slotId":"SLOT_ID_FROM_ABOVE"}'

Admin creates a counsellor:

curl -X POST http://localhost:5000/api/auth/counsellor \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Smith","email":"smith@clinic.com","password":"pass123"}'

---

Troubleshooting

Server says "MongoDB connection error":
  Make sure the MongoDB container is running: docker ps
  Check the MONGODB_URI in .env matches your setup

Port 5000 already in use:
  $processId = (Get-NetTCPConnection -LocalPort 5000).OwningProcess
  Stop-Process -Id $processId -Force

Tests failing:
  npx jest --clearCache
  Then npm test again

---

Environment variables (.env)

NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/slotsync
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
BCRYPT_ROUNDS=12
