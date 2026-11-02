const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlist.controller');
const { authenticate, authorize } = require('../middleware/auth');
const Joi = require('joi');
const { validate } = require('../middleware/validation');

const joinWaitlistSchema = Joi.object({
  slotId: Joi.string().hex().length(24).required()
});

router.post(
  '/',
  authenticate,
  authorize('student'),
  validate(joinWaitlistSchema),
  waitlistController.joinWaitlist
);

module.exports = router;
