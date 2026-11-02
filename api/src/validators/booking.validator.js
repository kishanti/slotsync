const Joi = require('joi');

const createBookingSchema = Joi.object({
  slotId: Joi.string().hex().length(24).required()
});

const updateOutcomeSchema = Joi.object({
  status: Joi.string().valid('attended', 'no_show').required()
});

module.exports = {
  createBookingSchema,
  updateOutcomeSchema
};
