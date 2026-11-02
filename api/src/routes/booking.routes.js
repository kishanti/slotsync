const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { createBookingSchema, updateOutcomeSchema } = require('../validators/booking.validator');

router.post(
  '/',
  authenticate,
  authorize('student'),
  validate(createBookingSchema),
  bookingController.createBooking
);

router.delete(
  '/:id',
  authenticate,
  authorize('student'),
  bookingController.cancelBooking
);

router.patch(
  '/:id/outcome',
  authenticate,
  authorize('counsellor'),
  validate(updateOutcomeSchema),
  bookingController.updateOutcome
);

router.get(
  '/my',
  authenticate,
  authorize('student'),
  bookingController.getMyBookings
);

module.exports = router;
