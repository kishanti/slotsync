const Joi = require('joi');

const createSlotSchema = Joi.object({
  counsellor: Joi.string().hex().length(24).required(),
  title: Joi.string().trim().min(3).max(200).required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
  capacity: Joi.number().integer().min(1).max(100).required()
});

const updateSlotSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  startTime: Joi.date().iso(),
  endTime: Joi.date().iso(),
  capacity: Joi.number().integer().min(1).max(100),
  version: Joi.number().integer().required()
}).min(2);

module.exports = {
  createSlotSchema,
  updateSlotSchema
};
