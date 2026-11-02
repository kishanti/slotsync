const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/user.model');
const Slot = require('../src/models/slot.model');
const Booking = require('../src/models/booking.model');
const WaitlistEntry = require('../src/models/waitlist.model');
const AuditLog = require('../src/models/auditlog.model');


describe('Cancellation Tests', () => {
  
  test('cancel inside 2-hour cutoff should return 422', async () => {
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
    soon.setMinutes(soon.getMinutes() + 90);
    
    const endTime = new Date(soon);
    endTime.setHours(endTime.getHours() + 1);
    
    const slot = await Slot.create({
      counsellor: counsellor._id,
      title: 'Soon Slot',
      startTime: soon,
      endTime,
      capacity: 5,
      confirmedCount: 1
    });
    
    const booking = await Booking.create({
      student: student._id,
      slot: slot._id,
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
      .delete(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(422);
  });
  
  test('cancel outside cutoff should promote earliest waitlist entry', async () => {
    const counsellor = await User.create({
      name: 'Counsellor',
      email: 'counsellor@example.com',
      password: 'password123',
      role: 'counsellor'
    });
    
    const student1 = await User.create({
      name: 'Student 1',
      email: 'student1@example.com',
      password: 'password123',
      role: 'student'
    });
    
    const student2 = await User.create({
      name: 'Student 2',
      email: 'student2@example.com',
      password: 'password123',
      role: 'student'
    });
    
    const student3 = await User.create({
      name: 'Student 3',
      email: 'student3@example.com',
      password: 'password123',
      role: 'student'
    });
    
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
      capacity: 5,
      confirmedCount: 1
    });
    
    const booking = await Booking.create({
      student: student1._id,
      slot: slot._id,
      status: 'booked'
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const waitlist1 = await WaitlistEntry.create({
      student: student2._id,
      slot: slot._id,
      status: 'waiting'
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const waitlist2 = await WaitlistEntry.create({
      student: student3._id,
      slot: slot._id,
      status: 'waiting'
    });
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student1@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    
    const updatedWaitlist1 = await WaitlistEntry.findById(waitlist1._id);
    expect(updatedWaitlist1.status).toBe('promoted');
    
    const updatedWaitlist2 = await WaitlistEntry.findById(waitlist2._id);
    expect(updatedWaitlist2.status).toBe('waiting');
    
    const promotedBooking = await Booking.findOne({
      student: student2._id,
      slot: slot._id,
      status: 'booked'
    });
    expect(promotedBooking).toBeTruthy();
    
    const auditLog = await AuditLog.findOne({
      action: 'WAITLIST_PROMOTION',
      entityId: promotedBooking._id
    });
    expect(auditLog).toBeTruthy();
  });
  
});
