const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/user.model');
const Slot = require('../src/models/slot.model');
const Booking = require('../src/models/booking.model');


describe('Analytics Tests', () => {
  
  test('analytics should return correct utilization percentage', async () => {
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    
    const counsellor = await User.create({
      name: 'Counsellor',
      email: 'counsellor@example.com',
      password: 'password123',
      role: 'counsellor'
    });
    
    const students = [];
    for (let i = 0; i < 5; i++) {
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
    
    const slot1End = new Date(tomorrow);
    slot1End.setHours(11, 0, 0, 0);
    
    const slot1 = await Slot.create({
      counsellor: counsellor._id,
      title: 'Slot 1',
      startTime: tomorrow,
      endTime: slot1End,
      capacity: 10,
      confirmedCount: 5
    });
    
    const slot2Start = new Date(tomorrow);
    slot2Start.setHours(14, 0, 0, 0);
    const slot2End = new Date(tomorrow);
    slot2End.setHours(15, 0, 0, 0);
    
    const slot2 = await Slot.create({
      counsellor: counsellor._id,
      title: 'Slot 2',
      startTime: slot2Start,
      endTime: slot2End,
      capacity: 10,
      confirmedCount: 3
    });
    
    for (let i = 0; i < 5; i++) {
      await Booking.create({
        student: students[i]._id,
        slot: slot1._id,
        status: 'booked'
      });
    }
    
    for (let i = 0; i < 3; i++) {
      await Booking.create({
        student: students[i]._id,
        slot: slot2._id,
        status: 'attended'
      });
    }
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .get(`/api/analytics/counsellor/${counsellor._id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.analytics.totalSlots).toBe(2);
    expect(response.body.data.analytics.totalConfirmedBookings).toBe(8);
    expect(response.body.data.analytics.utilization).toBe(40);
  });
  
});
