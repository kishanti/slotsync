const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get(
  '/counsellor/:id',
  authenticate,
  authorize('admin', 'counsellor'),
  analyticsController.getCounsellorAnalytics
);

module.exports = router;
