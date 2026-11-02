const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slot.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { createSlotSchema, updateSlotSchema } = require('../validators/slot.validator');

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createSlotSchema),
  slotController.createSlot
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateSlotSchema),
  slotController.updateSlot
);

router.get(
  '/',
  authenticate,
  slotController.getSlots
);

// get all bookings for a specific slot (counsellor or admin)
router.get(
  '/:id/bookings',
  authenticate,
  authorize('counsellor', 'admin'),
  slotController.getSlotBookings
);

module.exports = router;
