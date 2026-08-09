const Bull = require('bull');
const { REDIS_URL, redisOpts, REDIS_DISABLED } = require('../../../core/config/redis');
const logger = require('../../../core/logging/logger');

// Stubs itself out when Redis is unavailable so the server still boots
let punchQueue;
try {
  // TODO: drop this skip once the Redis request-limit issue is resolved
  if (REDIS_DISABLED) throw new Error('Redis temporarily disabled');

  punchQueue = new Bull('attendance-punches', REDIS_URL, {
    redis: redisOpts,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 500,
      removeOnFail: 200,          // kept for audit
    },
  });

  // config/redis already logs the cause; this only stops it going unhandled
  punchQueue.on('error', (err) => {
    logger.warn('[PunchQueue] Queue error (non-fatal):', err.message);
  });

  logger.info('✅ PunchQueue initialized');
} catch (err) {
  logger.warn('[PunchQueue] Failed to init Bull queue — Redis unavailable. Queue disabled:', err.message);

  punchQueue = {
    process: () => { },
    add: async () => ({ id: null }),
    on: () => { },
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
  };
}

// Called straight after the device token is validated, before any DB work
const addPunch = async (punchData) => {
  try {
    const job = await punchQueue.add('process-punch', punchData, { priority: 1 });
    return job.id;
  } catch (err) {
    logger.warn('[PunchQueue] addPunch skipped — queue unavailable:', err.message);
    return null;
  }
};

const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      punchQueue.getWaitingCount(),
      punchQueue.getActiveCount(),
      punchQueue.getCompletedCount(),
      punchQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  } catch (err) {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }
};

module.exports = { punchQueue, addPunch, getQueueStats };
