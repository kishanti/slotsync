const AuditLog = require('../models/auditlog.model');
const { success, error } = require('../utils/response');

async function getAuditLogs(req, res, next) {
  try {
    const { entity, id, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (entity) query.entityType = entity;
    if (id) query.entityId = id;
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'name email'),
      AuditLog.countDocuments(query)
    ]);
    
    success(res, {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs
};
