function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError' && err.isJoi) {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      errors: err.details.map(d => d.message)
    });
  }
  
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errorCode: 'DUPLICATE_ENTRY'
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  const response = { success: false, message };
  if (err.errorCode) response.errorCode = err.errorCode;

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
