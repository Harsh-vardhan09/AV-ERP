/**
 * redis.js — Single source of truth for all Redis configuration.
 *
 * Exports used across the codebase:
 *  - REDIS_URL         → string URL (for Bull queue constructors)
 *  - redisOpts         → ioredis options object (for Bull `redis:` key)
 *  - REDIS_DISABLED    → boolean flag (skip Bull init if true)
 *  - getRedisClient()  → singleton ioredis client (for oasesRedis)
 *  - safeRedisOp()     → safe wrapper that never throws (for oasesRedis)
 *  - redisConfig       → { redis: opts } shape (backward compat)
 *  - testRedisConnection() → ping helper
 */

const Redis  = require('ioredis');
const logger = require('../utils/logger');

// ─── Determine connection parameters ─────────────────────────────────────────
const REDIS_URL  = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true'; // opt-out flag

// Detect TLS requirement: Upstash uses rediss:// scheme
const needsTls = REDIS_URL.startsWith('rediss://') ||
                 (process.env.REDIS_TLS === 'true');

// ioredis options — compatible with Bull's `redis:` field
const redisOpts = {
  maxRetriesPerRequest: null,   // required by Bull
  enableReadyCheck:     false,  // required by Bull
  lazyConnect:          false,
  ...(needsTls && {
    tls: { rejectUnauthorized: false },  // Upstash self-signed cert
  }),
};

// Bull-compatible shape { redis: opts }
const redisConfig = { redis: redisOpts };

// ─── Singleton ioredis client (for OASES / non-Bull usage) ───────────────────
let _client = null;

const getRedisClient = () => {
  if (!_client) {
    _client = new Redis(REDIS_URL, {
      ...redisOpts,
      lazyConnect: true,
      connectTimeout: 8000,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.warn('[Redis] Max retries reached — giving up');
          return null; // stop retrying
        }
        return Math.min(times * 500, 3000); // 500ms → 3s back-off
      },
    });

    _client.on('connect', () => logger.info('[Redis] Connected'));
    _client.on('error',   (err) => logger.warn('[Redis] Client error', { error: err.message }));

    _client.connect().catch((err) => {
      logger.warn('[Redis] Initial connect failed (non-fatal)', { error: err.message });
    });
  }
  return _client;
};

/**
 * safeRedisOp — execute a Redis operation; return null on any error.
 * Ensures the app never crashes when Redis is temporarily unavailable.
 *
 * @param {(client: Redis) => Promise<any>} operation
 * @returns {Promise<any|null>}
 */
const safeRedisOp = async (operation) => {
  try {
    const client = getRedisClient();
    return await operation(client);
  } catch (err) {
    logger.warn('[Redis] safeRedisOp failed (non-fatal)', { error: err.message });
    return null;
  }
};

// ─── Connectivity test helper (used in index.js / health checks) ──────────────
const testRedisConnection = async () => {
  const client = new Redis(REDIS_URL, {
    ...redisOpts,
    lazyConnect:    true,
    connectTimeout: 5000,
  });

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch (err) {
    logger.warn('[Redis] Ping failed', { error: err.message });
    try { await client.quit(); } catch (_) { /* ignore */ }
    return false;
  }
};

module.exports = {
  REDIS_URL,
  REDIS_DISABLED,
  redisOpts,
  redisConfig,
  getRedisClient,
  safeRedisOp,
  testRedisConnection,
};
