const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');
const prisma = require('../config/db');

// Verify JWT token
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'AUTH_REQUIRED', 'Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    
    // Fallback secret if not in .env (for dev/testing only)
    const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
    
    const decoded = jwt.verify(token, secret);
    
    // Attach user payload to request
    req.user = decoded;
    
    // Optionally verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isActive: true, role: true }
    });

    if (!user || !user.isActive) {
      return sendError(res, 401, 'AUTH_INVALID', 'User account is inactive or deleted');
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'TOKEN_EXPIRED', 'Authentication token has expired');
    }
    return sendError(res, 401, 'AUTH_INVALID', 'Invalid authentication token');
  }
};

// Ensure user has ADMIN role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  }
  
  if (req.user.role !== 'ADMIN') {
    return sendError(res, 403, 'FORBIDDEN', 'Admin privileges required');
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
