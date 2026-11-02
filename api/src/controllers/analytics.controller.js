const mongoose = require('mongoose');
const analyticsService = require('../services/analytics.service');
const { success, error } = require('../utils/response');

async function getCounsellorAnalytics(req, res, next) {
  try {
    const { id } = req.params;
    const counsellorId = new mongoose.Types.ObjectId(id);
    
    if (req.user.role === 'counsellor' && req.user.userId !== id) {
      return error(res, 'Access denied', 403);
    }
    
    const analytics = await analyticsService.getCounsellorAnalytics(counsellorId);
    success(res, { analytics });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCounsellorAnalytics
};
