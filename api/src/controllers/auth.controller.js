const authService = require('../services/auth.service');
const User = require('../models/user.model');
const { success, error } = require('../utils/response');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const user = await authService.register(name, email, password);
    success(res, { user }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
}

async function createCounsellor(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const user = await authService.createCounsellor(name, email, password);
    success(res, { user }, 'Counsellor created', 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    success(res, {
      accessToken: result.accessToken,
      user: result.user
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    
    if (!oldRefreshToken) {
      return error(res, 'No refresh token provided', 401);
    }
    
    const result = await authService.refresh(oldRefreshToken);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    success(res, {
      accessToken: result.accessToken,
      user: result.user
    }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    
    res.clearCookie('refreshToken');
    success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return error(res, 'User not found', 404);
    }
    
    success(res, { user });
  } catch (err) {
    next(err);
  }
}

async function getCounsellors(req, res, next) {
  try {
    const counsellors = await User.find({ role: 'counsellor' }).select('name email');
    success(res, { counsellors });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  createCounsellor,
  getCounsellors,
  login,
  refreshToken,
  logout,
  getMe
};
