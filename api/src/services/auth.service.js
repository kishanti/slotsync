const User = require('../models/user.model');
const RefreshToken = require('../models/refreshtoken.model');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generateTokenFamily 
} = require('../utils/jwt');

async function register(name, email, password) {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw { statusCode: 409, message: 'Email already registered' };
  }

  const user = await User.create({ name, email, password, role: 'student' });
  return user;
}

async function createCounsellor(name, email, password) {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw { statusCode: 409, message: 'Email already registered' };
  }

  const user = await User.create({ name, email, password, role: 'counsellor' });
  return user;
}

async function login(email, password) {
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password))) {
    throw { statusCode: 401, message: 'Invalid credentials' };
  }
  
  const accessToken = generateAccessToken(user._id, user.role);
  const family = generateTokenFamily();
  const refreshToken = generateRefreshToken(user._id, family);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    family,
    expiresAt
  });
  
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

async function refresh(oldRefreshToken) {
  let decoded;
  
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    throw { statusCode: 401, message: 'Invalid refresh token' };
  }
  
  const tokenRecord = await RefreshToken.findOne({ token: oldRefreshToken });
  
  if (!tokenRecord) {
    throw { statusCode: 401, message: 'Refresh token not found' };
  }
  
  if (tokenRecord.used) {
    await RefreshToken.deleteMany({ family: tokenRecord.family });
    throw { statusCode: 401, message: 'Token reuse detected - session revoked' };
  }
  
  tokenRecord.used = true;
  await tokenRecord.save();
  
  const user = await User.findById(decoded.userId);
  
  if (!user) {
    throw { statusCode: 401, message: 'User not found' };
  }
  
  const accessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id, tokenRecord.family);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await RefreshToken.create({
    token: newRefreshToken,
    user: user._id,
    family: tokenRecord.family,
    expiresAt
  });
  
  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

async function logout(refreshToken) {
  if (refreshToken) {
    const tokenRecord = await RefreshToken.findOne({ token: refreshToken });
    
    if (tokenRecord) {
      await RefreshToken.deleteMany({ family: tokenRecord.family });
    }
  }
}

module.exports = {
  register,
  createCounsellor,
  login,
  refresh,
  logout
};
