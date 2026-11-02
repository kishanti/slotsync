const waitlistService = require('../services/waitlist.service');
const { success, error } = require('../utils/response');

async function joinWaitlist(req, res, next) {
  try {
    const { slotId } = req.body;
    const studentId = req.user.userId;
    
    const result = await waitlistService.joinWaitlist(studentId, slotId);
    
    if (!result.isNew) {
      return success(res, { entry: result.entry }, 'Already on waitlist', 200);
    }
    
    success(res, { entry: result.entry }, 'Added to waitlist', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  joinWaitlist
};
