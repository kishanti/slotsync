const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/user.model');
const Slot = require('../src/models/slot.model');
const Booking = require('../src/models/booking.model');


describe('Authorization Tests', () => {
  
  test('counsellor marking outcome on another counsellor slot should return 403', async () => {
    const counsellor1 = await User.create({
      name: 'Counsellor 1',
      email: 'counsellor1@example.com',
      password: 'password123',
      role: 'counsellor'
    });
    
    const counsellor2 = await User.create({
      name: 'Counsellor 2',
      email: 'counsellor2@example.com',
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
    
    const endTime = new Date(tomorrow);
    endTime.setHours(endTime.getHours() + 1);
    
    const slot = await Slot.create({
      counsellor: counsellor1._id,
      title: 'Slot',
      startTime: tomorrow,
      endTime,
      capacity: 5
    });
    
    const booking = await Booking.create({
      student: student._id,
      slot: slot._id,
      status: 'booked'
    });
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'counsellor2@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .patch(`/api/bookings/${booking._id}/outcome`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'attended' });
    
    expect(response.status).toBe(403);
  });
  
  test('illegal status transition should return 422', async () => {
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
    
    const endTime = new Date(tomorrow);
    endTime.setHours(endTime.getHours() + 1);
    
    const slot = await Slot.create({
      counsellor: counsellor._id,
      title: 'Slot',
      startTime: tomorrow,
      endTime,
      capacity: 5
    });
    
    const booking = await Booking.create({
      student: student._id,
      slot: slot._id,
      status: 'cancelled'
    });
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'counsellor@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .patch(`/api/bookings/${booking._id}/outcome`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'attended' });
    
    expect(response.status).toBe(422);
  });
  
});
