// OASES — Redis Client (re-exports centralized singleton)
//
// ❌ REMOVED: independent ioredis instantiation (caused duplicate
//    connections, conflicting TLS config, and ECONNRESET loops).
//
// ✅ NOW: delegates entirely to config/redis.js which provides
//    a single shared client with correct TLS + retry strategy.
const { getRedisClient, safeRedisOp } = require('../../../core/config/redis.js');

/**
 * Returns the singleton ioredis client.
 * Kept for backward compatibility with existing OASES controller imports.
 */
const getRedis = () => getRedisClient();

/**
 * Check whether the Redis client is in a connected/ready state.
 */
const isRedisConnected = () => {
  try {
    const client = getRedisClient();
    return client.status === 'ready';
  } catch {
    return false;
  }
};

/**
 * Safely execute a Redis operation with a null fallback.
 * The app will NOT crash if Redis is unavailable.
 *
 * @param {Function} operation  Receives redis client, returns Promise
 * @returns {Promise<any|null>}
 *
 * @example
 * // Multi-tenancy safe key pattern
 * await safeRedisOperation(r => r.set(`oases:${schoolId}:job:${jobId}`, 'processing', 'EX', 3600));
 */
const safeRedisOperation = (operation) => safeRedisOp(operation);

module.exports = { getRedis, isRedisConnected, safeRedisOperation };
