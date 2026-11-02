const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/user.model');
const Slot = require('../src/models/slot.model');
const Booking = require('../src/models/booking.model');


describe('Booking Tests', () => {
  
  test('40 concurrent bookings on a 5-seat slot should result in exactly 5 confirmed', async () => {
    const counsellor = await User.create({
      name: 'Counsellor',
      email: 'counsellor@example.com',
      password: 'password123',
      role: 'counsellor'
    });
    
    const students = [];
    for (let i = 0; i < 40; i++) {
      const student = await User.create({
        name: `Student ${i}`,
        email: `student${i}@example.com`,
        password: 'password123',
        role: 'student'
      });
      students.push(student);
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);
    
    const slot = await Slot.create({
      counsellor: counsellor._id,
      title: 'Test Slot',
      startTime: tomorrow,
      endTime,
      capacity: 5
    });
    
    const loginPromises = students.map(student =>
      request(app)
        .post('/api/auth/login')
        .send({
          email: student.email,
          password: 'password123'
        })
    );
    
    const loginResponses = await Promise.all(loginPromises);
    const tokens = loginResponses.map(res => res.body.data.accessToken);
    
    const bookingPromises = tokens.map(token =>
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ slotId: slot._id.toString() })
    );
    
    const responses = await Promise.all(bookingPromises);
    
    const successCount = responses.filter(r => r.status === 201).length;
    const conflictCount = responses.filter(r => r.status === 409).length;
    
    expect(successCount).toBe(5);
    expect(conflictCount).toBe(35);
    
    const dbCount = await Booking.countDocuments({ slot: slot._id });
    expect(dbCount).toBe(5);
  }, 60000);
  
  test('booking a full slot should return 409', async () => {
    const counsellor = await User.create({
      name: 'Counsellor',
      email: 'counsellor@example.com',
      password: 'password123',
      role: 'counsellor'
    });
    
    const students = [];
    for (let i = 0; i < 3; i++) {
      const student = await User.create({
        name: `Student ${i}`,
        email: `student${i}@example.com`,
        password: 'password123',
        role: 'student'
      });
      students.push(student);
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);
    
    const slot = await Slot.create({
      counsellor: counsellor._id,
      title: 'Test Slot',
      startTime: tomorrow,
      endTime,
      capacity: 2,
      confirmedCount: 2
    });
    
    await Booking.create([
      { student: students[0]._id, slot: slot._id, status: 'booked' },
      { student: students[1]._id, slot: slot._id, status: 'booked' }
    ]);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: students[2].email,
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotId: slot._id.toString() });
    
    expect(response.status).toBe(409);
    expect(response.body.errorCode).toBe('SLOT_FULL');
  });
  
  test('overlapping booking for same student should return 409', async () => {
    const counsellor = await User.create({
      name: 'Counsellor',
      email: 'counsellor@example.com',
      password: 'password123',
      role: 'counsellor'
    });
    
    const student = await User.create({
      name: 'Student',
      email: 'student@example.com',
      password: 'password123',
      role: 'student'
    });
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const slot1End = new Date(tomorrow);
    slot1End.setHours(11, 0, 0, 0);
    
    const slot1 = await Slot.create({
      counsellor: counsellor._id,
      title: 'Slot 1',
      startTime: tomorrow,
      endTime: slot1End,
      capacity: 5
    });
    
    const slot2Start = new Date(tomorrow);
    slot2Start.setMinutes(30);
    const slot2End = new Date(tomorrow);
    slot2End.setHours(11, 30, 0, 0);
    
    const slot2 = await Slot.create({
      counsellor: counsellor._id,
      title: 'Slot 2',
      startTime: slot2Start,
      endTime: slot2End,
      capacity: 5
    });
    
    await Booking.create({
      student: student._id,
      slot: slot1._id,
      status: 'booked'
    });
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotId: slot2._id.toString() });
    
    expect(response.status).toBe(409);
    expect(response.body.errorCode).toBe('OVERLAPPING_BOOKING');
  });
  
  test('booking slot starting in 20 minutes should return 422', async () => {
    const counsellor = await User.create({
      name: 'Counsellor',
      email: 'counsellor@example.com',
      password: 'password123',
      role: 'counsellor'
    });
    
    const student = await User.create({
      name: 'Student',
      email: 'student@example.com',
      password: 'password123',
      role: 'student'
    });
    
    const soon = new Date();
    soon.setMinutes(soon.getMinutes() + 20);
    
    const endTime = new Date(soon);
    endTime.setHours(endTime.getHours() + 1);
    
    const slot = await Slot.create({
      counsellor: counsellor._id,
      title: 'Soon Slot',
      startTime: soon,
      endTime,
      capacity: 5
    });
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotId: slot._id.toString() });
    
    expect(response.status).toBe(422);
  });
  
});
