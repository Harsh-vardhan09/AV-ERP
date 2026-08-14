// Single source of truth for Redis configuration
const Redis = require('ioredis');
const logger = require('../logging/logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true';

// Upstash uses the rediss:// scheme
const needsTls = REDIS_URL.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

const redisOpts = {
  maxRetriesPerRequest: null, // required by Bull
  enableReadyCheck: false, // required by Bull
  lazyConnect: false,
  keepAlive: 10000, // TCP keep-alive (10s) prevents Upstash serverless idle connection drops
  ...(needsTls && {
    tls: { rejectUnauthorized: false }, // Upstash self-signed cert
  }),
};

const redisConfig = { redis: redisOpts };

let _client = null;

let _disabledWarned = false;

/**
 * Returns null when REDIS_DISABLED is set.
 *
 * This used to connect regardless of the flag, and OASES calls it on EVERY
 * request (auth middleware, evaluation cache, pdfService). So REDIS_DISABLED=true
 * silenced the queues but left this client hammering Redis — which is a large
 * part of how a testing deployment burned a 500,000-request quota, and why
 * flipping the flag did not stop the bleeding. Callers already handle a failed
 * op via safeRedisOp; returning null makes the flag mean what it says.
 */
const getRedisClient = () => {
  if (REDIS_DISABLED) {
    if (!_disabledWarned) {
      _disabledWarned = true;
      logger.warn('[Redis] REDIS_DISABLED=true — client disabled, all ops no-op');
    }
    return null;
  }
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
        return Math.min(times * 500, 3000);
      },
    });

    _client.on('connect', () => logger.info('[Redis] Connected'));
    _client.on('error', (err) => logger.warn('[Redis] Client error', { error: err.message }));

    _client.connect().catch((err) => {
      logger.warn('[Redis] Initial connect failed (non-fatal)', {
        error: err.message,
      });
    });
  }
  return _client;
};

// Never throws: the app must survive Redis being unavailable
const safeRedisOp = async (operation) => {
  try {
    const client = getRedisClient();
    // null = Redis switched off. Skip the operation entirely rather than calling
    // it with a null client and relying on the catch below — that would turn
    // every cache read into a thrown TypeError on the hot path.
    if (!client) return null;
    return await operation(client);
  } catch (err) {
    logger.warn('[Redis] safeRedisOp failed (non-fatal)', {
      error: err.message,
    });
    return null;
  }
};

const testRedisConnection = async () => {
  const client = new Redis(REDIS_URL, {
    ...redisOpts,
    lazyConnect: true,
    connectTimeout: 5000,
  });

  // ioredis rethrows an 'error' event that has no listener as an uncaught
  // exception. The try/catch below only covers the awaited calls, so an error
  // arriving between them would still crash the process.
  client.on('error', (err) => logger.warn('[Redis] probe error', { error: err.message }));

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch (err) {
    logger.warn('[Redis] Ping failed', { error: err.message });
    try {
      await client.quit();
    } catch (_) {
      /* ignore */
    }
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
