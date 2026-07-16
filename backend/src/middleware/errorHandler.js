const ApiError = require('../utils/apiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: err.message, details: err.details || undefined });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: 'validation_error', details: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, error: 'duplicate_key', details: err.keyValue });
  }

  console.error('[unhandled_error]', err);
  return res.status(500).json({ success: false, error: 'internal_server_error' });
}

module.exports = errorHandler;
