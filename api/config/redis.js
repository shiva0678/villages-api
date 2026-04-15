// ─── Redis Client (Upstash / ioredis) ────────────────────────────────────────
// Used for: caching geo data, rate limiting, API key lookups

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,   // Required for Upstash
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

// TTL constants (seconds)
const TTL = {
  STATES:         86400,   // 24 hours — states rarely change
  DISTRICTS:       3600,   // 1 hour
  SUBDISTRICTS:    3600,   // 1 hour
  VILLAGES:        3600,   // 1 hour
  SEARCH:           300,   // 5 minutes
  API_KEY:          300,   // 5 minutes — key validation cache
};

module.exports = { redis, TTL };
