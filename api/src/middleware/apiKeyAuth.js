// ─── API Key Authentication Middleware ───────────────────────────────────────
// Validates X-API-Key header on every /v1/* request
// Caches key lookups in Redis to avoid DB hit on every request

const bcrypt = require('bcryptjs');
const prisma  = require('../config/db');
const { redis, TTL } = require('../config/redis');
const { sendError }  = require('../utils/response');

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return sendError(res, 401, 'INVALID_API_KEY', 'API key is required. Include X-API-Key header.');
    }

    // ── 1. Check Redis cache first (fast path) ──────────────────────────
    const cacheKey = `apikey:${apiKey}`;
    let cached = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (redisErr) {
      console.warn('Redis Cache Miss (Error):', redisErr.message);
    }

    let keyRecord;      // Reconstructed DB record or actual DB record
    let fromCache = false;

    if (cached) {
      keyRecord = JSON.parse(cached);
      fromCache = true;
    } else {
      // ── 2. Look up in DB (slow path — only on cache miss) ───────────────
      keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: {
          user: {
            select: { 
              id: true, email: true, role: true, plan: true, isActive: true,
              customDailyLimit: true, customBurstLimit: true, 
              isSuspended: true, autoSuspendEnabled: true 
            }
          }
        }
      });
    }

    // Key doesn't exist
    if (!keyRecord) {
      return sendError(res, 401, 'INVALID_API_KEY', 'API key not found or invalid');
    }

    // Key is revoked
    if (!keyRecord.isActive) {
      return sendError(res, 401, 'INVALID_API_KEY', 'API key has been revoked');
    }

    // User account is deactivated
    const isUserActive = fromCache ? keyRecord.userIsActive : keyRecord.user.isActive;
    if (!isUserActive) {
      return sendError(res, 403, 'ACCESS_DENIED', 'Your account has been deactivated');
    }

    // ── 3. Validate Secret for WRITE Operations ─────────────────────────
    const isWriteCommand = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    
    if (isWriteCommand) {
      const apiSecret = req.headers['x-api-secret'];
      if (!apiSecret) {
        return sendError(res, 401, 'INVALID_API_SECRET', 'X-API-Secret header is required for write operations');
      }

      const isMatch = await bcrypt.compare(apiSecret, keyRecord.secretHash);
      if (!isMatch) {
         // Prevent timing attacks by standardizing response
         return sendError(res, 401, 'INVALID_API_SECRET', 'API secret is invalid');
      }
    }

    // ── 4. Store in Redis cache (5 min TTL) if not from cache ───────────
    if (!fromCache) {
      const keyDataCache = {
        id: keyRecord.id, // For legacy keyId reference later
        userId: keyRecord.user.id,
        userEmail: keyRecord.user.email,
        userRole: keyRecord.user.role,
        userPlan: keyRecord.user.plan,
        userIsActive: keyRecord.user.isActive,
        secretHash: keyRecord.secretHash,
        isActive: keyRecord.isActive,
        customDailyLimit: keyRecord.user.customDailyLimit,
        customBurstLimit: keyRecord.user.customBurstLimit,
        isSuspended: keyRecord.user.isSuspended,
        autoSuspendEnabled: keyRecord.user.autoSuspendEnabled
      };
      
      try {
        await redis.setex(cacheKey, TTL.API_KEY, JSON.stringify(keyDataCache));
      } catch (e) {}
      
      // Map for the request payload later
      keyRecord = keyDataCache;
    }

    const keyData = {
      keyId:  keyRecord.id,
      userId: keyRecord.userId,
      email:  keyRecord.userEmail,
      role:   keyRecord.userRole,
      plan:   keyRecord.userPlan,
      customDailyLimit: keyRecord.customDailyLimit,
      customBurstLimit: keyRecord.customBurstLimit,
      isSuspended: keyRecord.isSuspended,
      autoSuspendEnabled: keyRecord.autoSuspendEnabled
    };

    // ── 4. Update lastUsedAt (non-blocking) ─────────────────────────────
    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {}); // fire and forget

    req.apiKeyData = keyData;
    next();

  } catch (err) {
    next(err);
  }
};

module.exports = apiKeyAuth;
