const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

// admin-only: create a counsellor account
router.post('/counsellor', authenticate, authorize('admin'), validate(registerSchema), authController.createCounsellor);

// admin-only: list all counsellors
router.get('/counsellors', authenticate, authorize('admin'), authController.getCounsellors);

module.exports = router;
