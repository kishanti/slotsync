const slotService = require('../services/slot.service');
const Booking = require('../models/booking.model');
const { success, error } = require('../utils/response');

async function createSlot(req, res, next) {
  try {
    const slot = await slotService.createSlot(req.body);
    success(res, { slot }, 'Slot created', 201);
  } catch (err) {
    next(err);
  }
}

async function updateSlot(req, res, next) {
  try {
    const { id } = req.params;
    const slot = await slotService.updateSlot(id, req.body);
    success(res, { slot }, 'Slot updated');
  } catch (err) {
    next(err);
  }
}

async function getSlots(req, res, next) {
  try {
    const { from, to, cursor, limit } = req.query;
    const filters = { from, to };
    const parsedLimit = limit ? parseInt(limit) : 20;
    const result = await slotService.getSlots(filters, cursor, parsedLimit);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function getSlotBookings(req, res, next) {
  try {
    const { id } = req.params;
    const bookings = await Booking.find({ slot: id })
      .populate('student', 'name email')
      .sort({ createdAt: 1 });
    success(res, { bookings });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSlot,
  updateSlot,
  getSlots,
  getSlotBookings
};
