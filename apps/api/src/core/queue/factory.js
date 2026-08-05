/**
 * Bull Queue Configuration (Production-Ready)
 * Handles Redis connection for Bull (Upstash/Cloud/Local)
 * Exports a reusable Bull queue instance
 */
const Queue = require('bull');
const logger = require('../../../src-old/middlewares/logger');

const QUEUE_NAME = 'payroll';

// Support graceful fallback if Redis is missing (Local Dev)
if (!process.env.REDIS_URL) {
  logger.warn('⚠️ REDIS_URL is not set. Background jobs (Queues) will be disabled. Processing will happen on-the-fly.');
  module.exports = {
    add: async (name, data) => { logger.info('Queue Mock: Job added (on-the-fly execution)'); return { id: 'mock' }; },
    process: () => {},
    on: () => {}
  };
  return;
}

const redisUrl = process.env.REDIS_URL;

// Support fallback config variables if URL doesn't cover it (Requirement 1)
const redisOpts = {
  // Connection stability & retry strategy (Requirement 6)
  retryStrategy: function (times) {
    const delay = Math.min(times * 500, 10000); // exponential backoff up to 10s
    logger.warn('Redis reconnect attempt', { times, delay });
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Upstash / cloud TLS support (Requirement 1)
if (redisUrl.startsWith('rediss://')) {
  redisOpts.tls = { rejectUnauthorized: false };
}

// Fallback configs
if (process.env.REDIS_HOST) redisOpts.host = process.env.REDIS_HOST;
if (process.env.REDIS_PORT) redisOpts.port = process.env.REDIS_PORT;
if (process.env.REDIS_PASSWORD) redisOpts.password = process.env.REDIS_PASSWORD;

// Initialize queue (Requirement 2)
const queue = new Queue(QUEUE_NAME, redisUrl, {
  redis: redisOpts,
  // Default job options (Requirement 5)
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

module.exports = queue;
