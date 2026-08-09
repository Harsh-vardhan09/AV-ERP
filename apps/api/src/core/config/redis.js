// Single source of truth for Redis configuration
const Redis = require("ioredis");
const logger = require("../logging/logger");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const REDIS_DISABLED = process.env.REDIS_DISABLED === "true";

// Upstash uses the rediss:// scheme
const needsTls =
  REDIS_URL.startsWith("rediss://") || process.env.REDIS_TLS === "true";

const redisOpts = {
  maxRetriesPerRequest: null, // required by Bull
  enableReadyCheck: false, // required by Bull
  lazyConnect: false,
  ...(needsTls && {
    tls: { rejectUnauthorized: false }, // Upstash self-signed cert
  }),
};

const redisConfig = { redis: redisOpts };

let _client = null;

const getRedisClient = () => {
  if (!_client) {
    _client = new Redis(REDIS_URL, {
      ...redisOpts,
      lazyConnect: true,
      connectTimeout: 8000,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.warn("[Redis] Max retries reached — giving up");
          return null; // stop retrying
        }
        return Math.min(times * 500, 3000);
      },
    });

    _client.on("connect", () => logger.info("[Redis] Connected"));
    _client.on("error", (err) =>
      logger.warn("[Redis] Client error", { error: err.message }),
    );

    _client.connect().catch((err) => {
      logger.warn("[Redis] Initial connect failed (non-fatal)", {
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
    return await operation(client);
  } catch (err) {
    logger.warn("[Redis] safeRedisOp failed (non-fatal)", {
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

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch (err) {
    logger.warn("[Redis] Ping failed", { error: err.message });
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
