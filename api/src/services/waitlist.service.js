const WaitlistEntry = require('../models/waitlist.model');

async function joinWaitlist(studentId, slotId) {
  const existing = await WaitlistEntry.findOne({
    student: studentId,
    slot: slotId
  });
  
  if (existing) {
    return { entry: existing, isNew: false };
  }
  
  const entry = await WaitlistEntry.create({
    student: studentId,
    slot: slotId,
    status: 'waiting'
  });
  
  return { entry, isNew: true };
}

async function getWaitlistForSlot(slotId) {
  return await WaitlistEntry.find({
    slot: slotId,
    status: 'waiting'
  })
  .populate('student', 'name email')
  .sort({ createdAt: 1 });
}

module.exports = {
  joinWaitlist,
  getWaitlistForSlot
};
