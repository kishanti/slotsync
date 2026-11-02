require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Slot = require('../models/slot.model');
const Booking = require('../models/booking.model');
const WaitlistEntry = require('../models/waitlist.model');

async function seed() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/slotsync?replicaSet=rs0';
    await mongoose.connect(uri);
    
    console.log('Connected to MongoDB');
    
    await User.deleteMany({});
    await Slot.deleteMany({});
    await Booking.deleteMany({});
    await WaitlistEntry.deleteMany({});
    
    console.log('Cleared existing data');
    
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@slotsync.com',
      password: 'admin123',
      role: 'admin'
    });
    
    console.log('Created admin');
    
    const counsellors = [];
    for (let i = 1; i <= 5; i++) {
      const counsellor = await User.create({
        name: `Counsellor ${i}`,
        email: `counsellor${i}@slotsync.com`,
        password: 'counsellor123',
        role: 'counsellor'
      });
      counsellors.push(counsellor);
    }
    
    console.log('Created 5 counsellors');
    
    const students = [];
    for (let i = 1; i <= 200; i++) {
      const student = await User.create({
        name: `Student ${i}`,
        email: `student${i}@slotsync.com`,
        password: 'student123',
        role: 'student'
      });
      students.push(student);
    }
    
    console.log('Created 200 students');
    
    const slots = [];
    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    const fourteenDaysLater = new Date(now);
    fourteenDaysLater.setDate(now.getDate() + 14);
    
    for (let i = 0; i < 300; i++) {
      const counsellor = counsellors[i % 5];
      const randomDate = new Date(
        fourteenDaysAgo.getTime() + 
        Math.random() * (fourteenDaysLater.getTime() - fourteenDaysAgo.getTime())
      );
      
      randomDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
      
      const startTime = new Date(randomDate);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);
      
      const slot = await Slot.create({
        counsellor: counsellor._id,
        title: `Counselling Session ${i + 1}`,
        startTime,
        endTime,
        capacity: 5 + Math.floor(Math.random() * 10)
      });
      
      slots.push(slot);
    }
    
    console.log('Created 300 slots');
    
    let bookingCount = 0;
    const targetBookings = 5000;
    
    for (const slot of slots) {
      if (bookingCount >= targetBookings) break;
      
      const numBookings = Math.min(
        Math.floor(Math.random() * (slot.capacity + 2)),
        targetBookings - bookingCount
      );
      
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numBookings && i < slot.capacity; i++) {
        if (bookingCount >= targetBookings) break;
        
        const student = shuffledStudents[i];
        const createdAt = new Date(slot.startTime);
        createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 10));
        
        const statuses = ['booked', 'attended', 'no_show', 'cancelled'];
        const weights = [0.5, 0.25, 0.15, 0.1];
        const random = Math.random();
        let status = 'booked';
        let cumulative = 0;
        
        for (let j = 0; j < weights.length; j++) {
          cumulative += weights[j];
          if (random < cumulative) {
            status = statuses[j];
            break;
          }
        }
        
        if (slot.startTime < now && status === 'booked') {
          status = Math.random() > 0.3 ? 'attended' : 'no_show';
        }
        
        try {
          await Booking.create({
            student: student._id,
            slot: slot._id,
            status,
            createdAt
          });
          
          if (status === 'booked' || status === 'attended' || status === 'no_show') {
            slot.confirmedCount++;
          }
          
          bookingCount++;
        } catch (err) {
          // Skip duplicate bookings
        }
      }
      
      await slot.save();
    }
    
    console.log(`Created ${bookingCount} bookings`);
    
    let waitlistCount = 0;
    const targetWaitlist = 800;
    
    for (const slot of slots) {
      if (waitlistCount >= targetWaitlist) break;
      
      const numWaitlist = Math.floor(Math.random() * 5);
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numWaitlist && waitlistCount < targetWaitlist; i++) {
        const student = shuffledStudents[i + 20];
        
        try {
          await WaitlistEntry.create({
            student: student._id,
            slot: slot._id,
            status: 'waiting'
          });
          waitlistCount++;
        } catch (err) {
          // Skip duplicate entries
        }
      }
    }
    
    console.log(`Created ${waitlistCount} waitlist entries`);
    console.log('Seed completed successfully');
    
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
