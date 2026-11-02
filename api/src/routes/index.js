const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const slotRoutes = require('./slot.routes');
const bookingRoutes = require('./booking.routes');
const waitlistRoutes = require('./waitlist.routes');
const analyticsRoutes = require('./analytics.routes');
const auditRoutes = require('./audit.routes');

router.use('/auth', authRoutes);
router.use('/slots', slotRoutes);
router.use('/bookings', bookingRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit', auditRoutes);

module.exports = router;
