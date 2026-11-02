const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'No token provided', 401);
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };
    
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Invalid token', 401);
    }
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired', 401);
    }
    return error(res, 'Authentication failed', 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Not authenticated', 401);
    }
    
    if (!roles.includes(req.user.role)) {
      return error(res, 'Access denied', 403);
    }
    
    next();
  };
}

module.exports = { authenticate, authorize };
