const mongoose = require('mongoose');
const Slot = require('../models/slot.model');
const User = require('../models/user.model');
const Booking = require('../models/booking.model');

async function createSlot(slotData) {
  const counsellor = await User.findById(slotData.counsellor);
  
  if (!counsellor || counsellor.role !== 'counsellor') {
    throw { statusCode: 400, message: 'Invalid counsellor' };
  }
  
  const overlapping = await Slot.findOne({
    counsellor: slotData.counsellor,
    $or: [
      {
        startTime: { $lt: slotData.endTime },
        endTime: { $gt: slotData.startTime }
      }
    ]
  });
  
  if (overlapping) {
    throw { 
      statusCode: 409, 
      message: 'Counsellor has an overlapping slot',
      errorCode: 'OVERLAPPING_SLOT'
    };
  }
  
  const slot = await Slot.create(slotData);
  return slot;
}

async function updateSlot(slotId, updates) {
  const { version, ...updateData } = updates;
  
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, version },
    {
      ...updateData,
      $inc: { version: 1 }
    },
    { new: true }
  );
  
  if (!slot) {
    throw { 
      statusCode: 409, 
      message: 'Version conflict - slot was modified by another request',
      errorCode: 'VERSION_CONFLICT'
    };
  }
  
  if (updateData.capacity !== undefined) {
    const confirmedCount = await Booking.countDocuments({
      slot: slotId,
      status: 'booked'
    });
    
    if (updateData.capacity < confirmedCount) {
      throw { 
        statusCode: 422, 
        message: 'Cannot reduce capacity below confirmed bookings count' 
      };
    }
    
    slot.confirmedCount = confirmedCount;
    await slot.save();
  }
  
  return slot;
}

async function getSlots(filters, cursor, limit = 20) {
  const query = {};
  
  if (filters.from) {
    query.startTime = { $gte: new Date(filters.from) };
  }
  
  if (filters.to) {
    query.endTime = { $lte: new Date(filters.to) };
  }
  
  if (cursor) {
    query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
  }
  
  const slots = await Slot.find(query)
    .populate('counsellor', 'name email')
    .sort({ _id: 1 })
    .limit(limit + 1);
  
  const hasMore = slots.length > limit;
  const results = hasMore ? slots.slice(0, limit) : slots;
  const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;
  
  return {
    slots: results,
    nextCursor,
    hasMore
  };
}

module.exports = {
  createSlot,
  updateSlot,
  getSlots
};
