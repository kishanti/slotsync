const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/user.model');


describe('Auth Tests', () => {
  
  test('login with wrong password should return 401', async () => {
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'correctpassword',
      role: 'student'
    });
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
  });
  
  test('unauthenticated request should return 401', async () => {
    const response = await request(app)
      .get('/api/auth/me');
    
    expect(response.status).toBe(401);
  });
  
  test('student hitting counsellor route should return 403', async () => {
    const user = await User.create({
      name: 'Student',
      email: 'student@example.com',
      password: 'password123',
      role: 'student'
    });
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.data.accessToken;
    
    const response = await request(app)
      .patch('/api/bookings/507f1f77bcf86cd799439011/outcome')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'attended' });
    
    expect(response.status).toBe(403);
  });
  
});
