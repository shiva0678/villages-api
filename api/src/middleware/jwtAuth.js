const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const prisma = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-dev';

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'Missing or invalid authentication token'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach to req
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'Token expired'));
    }
    return res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid token'));
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json(errorResponse('FORBIDDEN', 'Admin access required'));
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
