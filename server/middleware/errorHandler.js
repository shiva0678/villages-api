// ─── Global Error Handler Middleware ─────────────────────────────────────────
// Catches all errors thrown anywhere in the app
// Returns consistent error format matching Section 6.6

const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Prisma known errors
  if (err.code === 'P2025') {
    return sendError(res, 404, 'NOT_FOUND', 'Requested resource does not exist');
  }
  if (err.code === 'P2002') {
    return sendError(res, 400, 'INVALID_QUERY', 'Duplicate entry');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'INVALID_API_KEY', 'Invalid or malformed token');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'INVALID_API_KEY', 'Token has expired');
  }

  // Default: Internal server error
  return sendError(
    res,
    err.statusCode || 500,
    err.errorCode || 'INTERNAL_ERROR',
    err.message || 'An unexpected error occurred'
  );
};

module.exports = errorHandler;
