const Queue = require('bull');
const logger = require('../logging/logger');
const { REDIS_URL, REDIS_DISABLED, redisOpts } = require('../config/redis');

// redis.js defaults REDIS_URL, so read the raw env var to tell "unset" from "defaulted"
const disabled = REDIS_DISABLED || !process.env.REDIS_URL;

let warned = false;
const warnOnce = () => {
  if (warned) return;
  warned = true;
  logger.warn(
    '⚠️ Redis unavailable (REDIS_DISABLED set or REDIS_URL missing). Queues are no-ops; processing happens on-the-fly.'
  );
};

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
};

/**
 * Bull polls Redis continuously even when a queue is completely idle, and the
 * stock intervals are tuned for a self-hosted Redis with no request cap:
 *
 *   guardInterval   5s  → 12 req/min   (delayed-job guard)
 *   stalledInterval 30s →  2 req/min   (stalled-job check)
 *   drainDelay       5s → 12 req/min   (blocking pop re-issue)
 *                        ≈ 26 req/min PER QUEUE, doing nothing
 *
 * With ~7 queues carrying processors that is ~260k requests/day, which burns a
 * 500,000-request Upstash free tier in under two days of an idle deployment —
 * exactly what happened here. These intervals cut that by roughly 8×. Latency on
 * delayed/stalled jobs rises to ~1 minute, which is irrelevant for digests, fee
 * reminders and PDF generation.
 *
 * ponytail: tuned for a metered free tier. On a self-hosted Redis with no
 * request cap, Bull's defaults are fine — drop these settings then.
 */
const lowTrafficSettings = {
  guardInterval: 60000, // 5s → 60s
  stalledInterval: 300000, // 30s → 5min
  drainDelay: 30, // 5s → 30s
};

/**
 * A Bull queue is an EventEmitter. An 'error' event with no listener is rethrown
 * by Node as an uncaught exception — which is how an exhausted Redis quota took
 * the whole API down instead of just disabling queues.
 */
const attachErrorHandler = (queue, name) => {
  queue.on('error', (err) => {
    if (err?.code === 'ECONNRESET' || /ECONNRESET/.test(err?.message || '')) {
      logger.debug(`[Queue:${name}] Redis connection reset (reconnecting)`);
      return;
    }
    logger.warn(`[Queue:${name}] Redis error (non-fatal)`, { error: err?.message });
  });
  return queue;
};

/**
 * No-op stand-in used when Redis is off.
 *
 * It must cover every Queue method a worker calls AT REQUIRE TIME, not just
 * add/process/on — digestWorker calls getRepeatableJobs/removeRepeatableByKey
 * while wiring its daily schedule, and a stub missing those throws a TypeError
 * during bootJobs, which is the same crash-before-listen this whole change
 * exists to prevent. Read methods return empty rather than throwing.
 */
const createStub = (name) => ({
  add: async () => {
    logger.info('Queue Mock: Job added (on-the-fly execution)', { queue: name });
    return { id: 'mock' };
  },
  process: () => {},
  on: () => {},
  getJobs: async () => [],
  getRepeatableJobs: async () => [],
  removeRepeatableByKey: async () => undefined,
  clean: async () => [],
  close: async () => undefined,
  isReady: async () => false,
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
  if (process.env.REDIS_HOST) opts.host = process.env.REDIS_HOST;
  if (process.env.REDIS_PORT) opts.port = process.env.REDIS_PORT;
  if (process.env.REDIS_PASSWORD) opts.password = process.env.REDIS_PASSWORD;
  return opts;
};

// One instance per name — workers register their processors on the queue they get back
const queues = new Map();

const createQueue = (name) => {
  if (queues.has(name)) return queues.get(name);

  const queue = disabled
    ? (warnOnce(), createStub(name))
    : attachErrorHandler(
        new Queue(name, REDIS_URL, {
          redis: buildRedisOpts(),
          defaultJobOptions,
          settings: lowTrafficSettings,
        }),
        name
      );

  queues.set(name, queue);
  return queue;
};

module.exports = { createQueue };
