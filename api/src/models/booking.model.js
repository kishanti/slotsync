const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
    enum: ['booked', 'attended', 'no_show', 'cancelled'],
    default: 'booked'
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true  // unique:true + sparse here creates the index, no schema.index needed
  }
}, {
  timestamps: true
});

bookingSchema.index({ student: 1, slot: 1 }, { unique: true });
bookingSchema.index({ slot: 1, status: 1 });
bookingSchema.index({ student: 1, status: 1 });
// removed idempotencyKey index — already created by unique+sparse above

module.exports = mongoose.model('Booking', bookingSchema);
