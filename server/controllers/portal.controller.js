const prisma = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../utils/response');

// Generate API Key
// Key format: ak_abc123... 
// Secret format: sk_xyz789...
const generateApiKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body; // e.g. "Production Server"

    if (!name) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'API Key name is required');
    }

    // Check key limit (max 5 keys per user)
    const keyCount = await prisma.apiKey.count({ where: { userId, isActive: true } });
    if (keyCount >= 5) {
      return sendError(res, 403, 'LIMIT_EXCEEDED', 'Maximum of 5 active API keys allowed per user');
    }

    // Generate exactly 32 hex characters for both (16 bytes = 32 hex chars)
    const keyString = `ak_${crypto.randomBytes(16).toString('hex')}`;
    const secretString = `as_${crypto.randomBytes(16).toString('hex')}`;

    // Hash the secret
    const salt = await bcrypt.genSalt(10);
    const secretHash = await bcrypt.hash(secretString, salt);

    // Save to DB
    const newKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        key: keyString,
        secretHash,
        isActive: true
      }
    });

    // Return the RAW secret ONLY ONCE
    return sendSuccess(res, {
      id: newKey.id,
      name: newKey.name,
      key: newKey.key,
      secret: secretString, // ONLY TIME THIS IS SHOWN
      createdAt: newKey.createdAt
    }, 'API Key generated successfully. Please copy your secret now; it will never be shown again.');

  } catch (error) {
    next(error);
  }
};

// Fetch User's API Keys
const getApiKeys = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        key: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, keys);
  } catch (error) {
    next(error);
  }
};

// Revoke API Key
const revokeApiKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const keyId = parseInt(req.params.id);

    // Ensure the key belongs to the user
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId }
    });

    if (!key) {
      return sendError(res, 404, 'NOT_FOUND', 'API Key not found');
    }

    await prisma.apiKey.delete({
      where: { id: keyId }
    });

    return sendSuccess(res, null, 'API Key revoked successfully');
  } catch (error) {
    next(error);
  }
};

// Fetch Usage Stats for Portal Dashboard
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get today's range
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Todays requests
    const todayRequests = await prisma.apiLog.count({
      where: { userId, createdAt: { gte: startOfToday } }
    });

    // Month requests
    const monthRequests = await prisma.apiLog.count({
      where: { userId, createdAt: { gte: startOfMonth } }
    });

    // Aggregating usage over last 7 days natively through raw DB
    const callsOverTimeRaw = await prisma.$queryRaw`
      SELECT DATE(date_trunc('day', "createdAt")) as name, COUNT(*)::int as calls 
      FROM "ApiLog" 
      WHERE "userId" = ${userId} AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY name 
      ORDER BY name ASC
    `;

    // Calculate limit based on Plan
    const limitMap = { 'FREE': 100, 'PREMIUM': 10000, 'PRO': 100000, 'UNLIMITED': 'Unlimited' };
    const dailyLimit = limitMap[req.user.plan] || 100;

    return sendSuccess(res, {
      todayRequests,
      dailyLimit,
      monthRequests,
      avgResponseTime: 42, // Mock ms
      successRate: 99.9, // Mock %
      callsOverTime: callsOverTimeRaw.length > 0 ? callsOverTimeRaw : [
        { name: 'Mon', calls: 0 }, { name: 'Tue', calls: 0 }
      ]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  getStats
};
