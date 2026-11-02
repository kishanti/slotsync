const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: () => new Date()
  }
}, {
  timestamps: false
});

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

auditLogSchema.pre('updateOne', function(next) {
  next(new Error('AuditLog updates are not allowed'));
});

auditLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('AuditLog updates are not allowed'));
});

auditLogSchema.pre('updateMany', function(next) {
  next(new Error('AuditLog updates are not allowed'));
});

auditLogSchema.pre('deleteOne', function(next) {
  next(new Error('AuditLog deletes are not allowed'));
});

auditLogSchema.pre('findOneAndDelete', function(next) {
  next(new Error('AuditLog deletes are not allowed'));
});

auditLogSchema.pre('deleteMany', function(next) {
  next(new Error('AuditLog deletes are not allowed'));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
