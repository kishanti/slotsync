function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function error(res, message = 'Error', statusCode = 500, errorCode = null) {
  const response = {
    success: false,
    message
  };
  
  if (errorCode) {
    response.errorCode = errorCode;
  }
  
  return res.status(statusCode).json(response);
}

module.exports = { success, error };
