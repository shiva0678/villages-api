// ─── Standard API Response Helper ────────────────────────────────────────────
// All API responses go through this to ensure consistent format
// Format matches the spec in Section 6.3

const { v4: uuidv4 } = require('uuid');

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {any} data - Data to return
 * @param {Object} options - count, statusCode, rateLimit
 */
const sendSuccess = (res, data, options = {}) => {
  const {
    statusCode = 200,
    count = Array.isArray(data) ? data.length : undefined,
    rateLimit = null,
    startTime = null,
  } = options;

  const responseTime = startTime ? Date.now() - startTime : undefined;

  const response = {
    success: true,
    ...(count !== undefined && { count }),
    data,
    meta: {
      requestId: `req_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      ...(responseTime !== undefined && { responseTime }),
      ...(rateLimit && { rateLimit }),
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - App-level error code (e.g. "INVALID_API_KEY")
 * @param {string} message - Human-readable message
 */
const sendError = (res, statusCode, errorCode, message) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
    },
    meta: {
      requestId: `req_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    },
  });
};

// Error codes matching Section 6.6
const ERROR_CODES = {
  INVALID_QUERY:    { status: 400, code: 'INVALID_QUERY' },
  INVALID_API_KEY:  { status: 401, code: 'INVALID_API_KEY' },
  ACCESS_DENIED:    { status: 403, code: 'ACCESS_DENIED' },
  NOT_FOUND:        { status: 404, code: 'NOT_FOUND' },
  RATE_LIMITED:     { status: 429, code: 'RATE_LIMITED' },
  INTERNAL_ERROR:   { status: 500, code: 'INTERNAL_ERROR' },
};

module.exports = { sendSuccess, sendError, ERROR_CODES };
