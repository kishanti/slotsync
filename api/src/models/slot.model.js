const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  counsellor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  confirmedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  version: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

slotSchema.index({ counsellor: 1, startTime: 1 });
slotSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('Slot', slotSchema);
