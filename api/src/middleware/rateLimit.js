// ─── Rate Limiter Middleware ──────────────────────────────────────────────────
// Dual-window rate limiting using Redis counters
// Handles both Daily Quotas and Minutely Burst limits
// Includes Usage Alerting (80/95/100%) and Auto-Suspension

const { redis }     = require('../config/redis');
const { sendError } = require('../utils/response');
const prisma        = require('../config/db');

// Plan-based daily and burst request limits per spec (Section 11.1)
const PLAN_LIMITS = {
  FREE:      { daily: 5000,    burst: 100 },
  PREMIUM:   { daily: 50000,   burst: 500 },
  PRO:       { daily: 300000,  burst: 2000 },
  UNLIMITED: { daily: 1000000, burst: 5000 },
};

const rateLimiter = async (req, res, next) => {
  try {
    const { userId, plan, keyId, customDailyLimit, customBurstLimit, isSuspended, autoSuspendEnabled } = req.apiKeyData;

    // 1. Check if user/key is suspended
    if (isSuspended) {
      return sendError(res, 403, 'ACCOUNT_SUSPENDED', 'Your access has been suspended. Please contact support.');
    }

    // 2. Determine limits (custom overrides plan defaults)
    const defaults = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
    const dailyLimit = customDailyLimit || defaults.daily;
    const burstLimit = customBurstLimit || defaults.burst;

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // "2024-01-15"
    const currentMinute = now.toISOString().substring(0, 16); // "2024-01-15T12:34"

    const dailyKey = `ratelimit:daily:${userId}:${today}`;
    const burstKey = `ratelimit:burst:${userId}:${currentMinute}`;

    // Increment both counters
    const [dailyCurrent, burstCurrent] = await Promise.all([
      redis.incr(dailyKey),
      redis.incr(burstKey)
    ]);

    // Set expiries
    if (dailyCurrent === 1) await redis.expire(dailyKey, 90000); // ~25 hrs
    if (burstCurrent === 1) await redis.expire(burstKey, 120);   // 2 mins

    // 3. Usage Alerting Logic
    const usagePercent = (dailyCurrent / dailyLimit) * 100;
    
    // Threshold alerts (mock email logs)
    if (dailyCurrent === Math.floor(dailyLimit * 0.8)) {
      console.log(`[ALERT] 80% usage reached for User ${userId}. Sending email...`);
    } else if (dailyCurrent === Math.floor(dailyLimit * 0.95)) {
      console.log(`[ALERT] 95% usage reached for User ${userId}. Sending email + dashboard alert...`);
    } else if (dailyCurrent === dailyLimit) {
      console.log(`[ALERT] 100% usage reached for User ${userId}. Sending exceed email...`);
      
      // Auto-suspension if enabled
      if (autoSuspendEnabled) {
        console.log(`[AUTO-SUSPEND] Suspending User ${userId} for exceeding daily limit.`);
        await prisma.user.update({
          where: { id: userId },
          data: { isSuspended: true }
        });
      }
    }

    // 4. Set Headers
    const resetDaily = new Date();
    resetDaily.setUTCHours(24, 0, 0, 0);
    const resetBurst = new Date();
    resetBurst.setSeconds(0, 0);
    resetBurst.setMinutes(resetBurst.getMinutes() + 1);

    res.setHeader('X-RateLimit-Limit', dailyLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, dailyLimit - dailyCurrent));
    res.setHeader('X-RateLimit-Reset', Math.floor(resetDaily.getTime() / 1000));
    res.setHeader('X-RateLimit-Burst-Limit', burstLimit);
    res.setHeader('X-RateLimit-Burst-Remaining', Math.max(0, burstLimit - burstCurrent));

    // 5. Over Limits?
    if (dailyCurrent > dailyLimit) {
      return sendError(
        res, 429, 'RATE_LIMITED_DAILY',
        `Daily quota exceeded (${dailyLimit}). Resets at ${resetDaily.toISOString()}`
      );
    }

    if (burstCurrent > burstLimit) {
      return sendError(
        res, 429, 'RATE_LIMITED_BURST',
        `Too many requests per minute (${burstLimit}). Try again shortly.`
      );
    }

    next();
  } catch (err) {
    // Fail open but with default headers
    console.error('Rate limiter error (fail open):', err.message);
    const defaults = PLAN_LIMITS[req.apiKeyData?.plan] || PLAN_LIMITS.FREE;
    res.setHeader('X-RateLimit-Limit', defaults.daily);
    res.setHeader('X-RateLimit-Remaining', defaults.daily);
    next();
  }
};

module.exports = rateLimiter;
