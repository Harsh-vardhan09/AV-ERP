/**
 * digestWorker.js — Phase 3
 *
 * Two Bull queues:
 *   'digest-emails'    — collects individual email jobs during the day
 *   'digest-scheduler' — fires at 6 PM IST (12:30 UTC) to batch-send digests
 */

const logger = require('../../../core/logging/logger');
const { createQueue } = require('../../../core/queue/factory');

// These two queues used to be built with `new Queue(name, REDIS_URL)` directly.
// That bypassed BOTH safety nets the factory provides:
//   - it ignored REDIS_DISABLED, so the queues connected regardless;
//   - it attached no 'error' listener, and a Bull queue is an EventEmitter, so
//     when Redis started rejecting AUTH (Upstash request quota exhausted) the
//     ReplyError was rethrown as an uncaught exception and killed the process
//     before server.listen() — the API went 502 with "No open ports detected".
// Going through createQueue means a stub when Redis is off, a handled 'error'
// when it is on, and the low-traffic polling settings either way.
const digestQueue = createQueue('digest-emails');
const digestSchedulerQueue = createQueue('digest-scheduler');

// PROCESSOR: collect jobs (no-op — jobs sit until scheduler fires)
digestQueue.process('collect', async (job) => {
  logger.info('[DigestWorker] Email collected for digest', {
    userId: job.data.userId,
    type: job.data.type,
  });
  return { collected: true };
});

// PROCESSOR: daily scheduler — runs at 6 PM IST
digestSchedulerQueue.process(async () => {
  logger.info('[DigestWorker] Starting daily digest processing');

  // Lazy-require to avoid circular dependency at boot
  const { generateDigestEmail } = require('../lib/digestTemplate');

  try {
    // Fetch all waiting / delayed jobs from the digest collection queue
    const waitingJobs = await digestQueue.getJobs(['waiting', 'delayed', 'active']);

    if (!waitingJobs.length) {
      logger.info('[DigestWorker] No digest emails to send');
      return;
    }

    // Group by userId
    const userEmailMap = {};
    for (const j of waitingJobs) {
      const uid = j.data.userId?.toString();
      if (!uid) continue;
      if (!userEmailMap[uid]) {
        userEmailMap[uid] = {
          to: j.data.to,
          schoolId: j.data.schoolId,
          notifications: [],
        };
      }
      userEmailMap[uid].notifications.push({
        type: j.data.type,
        subject: j.data.subject,
        html: j.data.html,
      });
    }

    const userIds = Object.keys(userEmailMap);
    logger.info(`[DigestWorker] Sending digest to ${userIds.length} users`);

    // Send one digest email per user
    const nodemailer = require('nodemailer');

    for (const userId of userIds) {
      const userData = userEmailMap[userId];
      try {
        const { subject, html } = generateDigestEmail({
          notifications: userData.notifications,
          recipientEmail: userData.to,
        });

        const { getTransporter } = require('../lib/emailService');
        const transporter = getTransporter();
        const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;

        await transporter.sendMail({
          from,
          to: userData.to,
          subject,
          html,
        });

        logger.info('[DigestWorker] Digest sent', {
          userId,
          count: userData.notifications.length,
        });
      } catch (userErr) {
        logger.warn('[DigestWorker] Failed to send digest for user', {
          userId,
          error: userErr.message,
        });
      }
    }

    // Clean up processed jobs from collection queue
    await digestQueue.clean(0, 'completed');
    await digestQueue.clean(0, 'active');
    await digestQueue.clean(0, 'wait');
  } catch (err) {
    logger.error('[DigestWorker] Digest processing failed', {
      error: err.message,
    });
  }
});

// Schedule daily 6 PM IST job (cron: 30 12 * * * = 12:30 UTC = 18:00 IST)
const scheduleDigestJob = async () => {
  try {
    // Remove any stale repeatable jobs first to avoid duplicates
    const existing = await digestSchedulerQueue.getRepeatableJobs();
    for (const job of existing) {
      await digestSchedulerQueue.removeRepeatableByKey(job.key);
    }

    await digestSchedulerQueue.add(
      { trigger: 'daily-digest' },
      {
        repeat: { cron: '30 12 * * *' }, // 6 PM IST (UTC+5:30)
        removeOnComplete: true,
      }
    );

    logger.info('[DigestWorker] Daily digest scheduled at 6 PM IST (12:30 UTC)');
  } catch (err) {
    logger.warn('[DigestWorker] Failed to schedule digest job', {
      error: err.message,
    });
  }
};

// Boot scheduling when the worker process loads
scheduleDigestJob();

// Error event handlers
digestQueue.on('failed', (job, err) => {
  logger.warn('[DigestWorker] digestQueue job failed', {
    jobId: job.id,
    error: err.message,
  });
});

digestSchedulerQueue.on('failed', (job, err) => {
  logger.warn('[DigestWorker] schedulerQueue job failed', {
    jobId: job.id,
    error: err.message,
  });
});

logger.info('[DigestWorker] Digest worker initialized');

module.exports = { digestQueue, digestSchedulerQueue };
