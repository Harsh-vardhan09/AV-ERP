// ══════════════════════════════════════════════════════════════════
// Attendance / Biometric Punch Queue
// ── Uses centralized Redis config from config/redis.js ──────────
// ══════════════════════════════════════════════════════════════════
const Bull = require('bull');
const { REDIS_URL, redisOpts, REDIS_DISABLED } = require('../config/redis');

// ─── Punch Queue ──────────────────────────────────────────────────────────────
// Gracefully degrade when Redis is unavailable (e.g. local dev without Redis).
// The queue stubs itself out so the server boots normally.
let punchQueue;
try {
  // ⚠️ TEMPORARY: Skip Bull init while Redis is disabled (request limit exceeded)
  if (REDIS_DISABLED) throw new Error('Redis temporarily disabled');

  punchQueue = new Bull('attendance-punches', REDIS_URL, {
    redis: redisOpts,
    defaultJobOptions: {
      attempts: 5,                // retry up to 5 times on failure
      backoff: {
        type: 'exponential',
        delay: 2000,              // 2s → 4s → 8s → 16s → 32s
      },
      removeOnComplete: 500,      // keep last 500 completed jobs for debugging
      removeOnFail: 200,      // keep last 200 failed jobs for audit
    },
  });

  // Suppress unhandled Redis errors — they are already logged in config/redis.js
  punchQueue.on('error', (err) => {
    console.warn('[PunchQueue] Queue error (non-fatal):', err.message);
  });

  console.log('✅ PunchQueue initialized');
} catch (err) {
  console.warn('[PunchQueue] Failed to init Bull queue — Redis unavailable. Queue disabled:', err.message);

  // Stub so imports don't blow up — app remains functional without queue
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

/**
 * Add a punch event to the queue.
 * Called by the server immediately after validating the device token.
 *
 * @param {Object} punchData
 * @param {string} punchData.schoolId
 * @param {string} punchData.deviceId
 * @param {string} punchData.deviceUserId  - device's internal user ID (e.g. "001")
 * @param {Date}   punchData.punchTime     - exact timestamp of the punch
 * @param {string} [punchData.rawPayload]  - original device payload (for audit)
 */
const addPunch = async (punchData) => {
  try {
    const job = await punchQueue.add('process-punch', punchData, { priority: 1 });
    return job.id;
  } catch (err) {
    console.warn('[PunchQueue] addPunch skipped — queue unavailable:', err.message);
    return null;
  }
};

/**
 * Get queue stats for admin monitoring.
 */
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
