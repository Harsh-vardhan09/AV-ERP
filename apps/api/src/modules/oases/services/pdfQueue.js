// OASES — PDF Processing Queue
// Uses centralized Redis config from config/redis.js
// Queue name: 'oases-pdf'
const Bull = require('bull');
const { REDIS_URL, redisOpts, REDIS_DISABLED } = require('../../../core/config/redis.js');
const logger = require('../../../core/logging/logger.js');

let pdfQueue;
try {
  // ⚠️ TEMPORARY: Skip Bull init while Redis is disabled (request limit exceeded)
  if (REDIS_DISABLED) throw new Error('Redis temporarily disabled');

  pdfQueue = new Bull('oases-pdf', REDIS_URL, {
    redis: redisOpts,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 }, // 3s → 6s → 12s
      removeOnComplete: 200,
      removeOnFail: 100,
    },
  });

  // Suppress unhandled Redis errors — they are already logged in config/redis.js
  pdfQueue.on('error', (err) => {
    logger.warn('[OasesPdfQueue] Queue error (non-fatal):', err.message);
  });

  logger.debug('✅ OasesPdfQueue initialized');
} catch (err) {
  logger.warn('[OasesPdfQueue] Failed to init — Redis unavailable:', err.message);

  // Stub so imports don't blow up — OASES module stays functional
  pdfQueue = {
    process: () => { },
    add: async () => ({ id: null }),
    on: () => { },
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
  };
}

/**
 * Add a sheet to the PDF processing queue.
 *
 * Multi-tenancy note: always pass schoolId so workers can scope
 * Redis keys as `oases:${schoolId}:job:${jobId}`.
 *
 * @param {object} data  { sheetId, schoolId, filePath, subjectCode, year }
 */
const addPdfJob = async (data) => {
  try {
    const job = await pdfQueue.add('process-pdf', data, { priority: 5 });
    return job.id;
  } catch (err) {
    logger.warn('[OasesPdfQueue] addPdfJob skipped — queue unavailable:', err.message);
    return null;
  }
};

module.exports = { pdfQueue, addPdfJob };
