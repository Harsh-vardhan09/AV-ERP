const Queue = require('bull');
const logger = require('../logging/logger');
const { REDIS_URL, REDIS_DISABLED, redisOpts } = require('../config/redis');

// redis.js defaults REDIS_URL, so read the raw env var to tell "unset" from "defaulted"
const disabled = REDIS_DISABLED || !process.env.REDIS_URL;

let warned = false;
const warnOnce = () => {
  if (warned) return;
  warned = true;
  logger.warn('⚠️ Redis unavailable (REDIS_DISABLED set or REDIS_URL missing). Queues are no-ops; processing happens on-the-fly.');
};

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
};

const createStub = (name) => ({
  add: async () => {
    logger.info('Queue Mock: Job added (on-the-fly execution)', { queue: name });
    return { id: 'mock' };
  },
  process: () => {},
  on: () => {},
});

const buildRedisOpts = () => {
  const opts = {
    ...redisOpts,
    retryStrategy: (times) => {
      const delay = Math.min(times * 500, 10000);
      logger.warn('Redis reconnect attempt', { times, delay });
      return delay;
    },
  };
  if (process.env.REDIS_HOST)     opts.host     = process.env.REDIS_HOST;
  if (process.env.REDIS_PORT)     opts.port     = process.env.REDIS_PORT;
  if (process.env.REDIS_PASSWORD) opts.password = process.env.REDIS_PASSWORD;
  return opts;
};

// One instance per name — workers register their processors on the queue they get back
const queues = new Map();

const createQueue = (name) => {
  if (queues.has(name)) return queues.get(name);

  const queue = disabled
    ? (warnOnce(), createStub(name))
    : new Queue(name, REDIS_URL, { redis: buildRedisOpts(), defaultJobOptions });

  queues.set(name, queue);
  return queue;
};

module.exports = { createQueue };
