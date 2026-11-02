const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'promoted', 'expired'],
    default: 'waiting'
  }
}, {
  timestamps: true
});

waitlistSchema.index({ student: 1, slot: 1 }, { unique: true });
waitlistSchema.index({ slot: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model('WaitlistEntry', waitlistSchema);
