/**
 * ImportQueue - Bull queue setup for async import processing
 * Falls back to null (synchronous processing) if Redis is not available.
 */

const Queue  = require('bull');
const logger = require('../../../src/core/logging/logger.js');

class ImportQueue {
  constructor(redisClient) {
    this.redis = redisClient;
    this.queue = null;

    // Only init Bull if Redis is configured
    if (!process.env.REDIS_HOST) {
      logger.warn('[ImportQueue] REDIS_HOST not set — import will run synchronously (no queue).');
      return;
    }

    try {
      this.queue = new Queue('import_data', {
        redis: {
          host:     process.env.REDIS_HOST || 'localhost',
          port:     process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
        },
        settings: {
          lockDuration:    30000,
          lockRenewTime:   15000,
          retryProcessDelay: 5000,
          maxStalledCount: 2,
          stalledInterval: 5000,
          guardInterval:   5000,
        },
      });

      // Suppress unhandled errors from Bull connection retries
      this.queue.on('error', (err) => {
        logger.warn('[ImportQueue] Redis queue error (falling back to sync):', err.message);
      });

      this.setupEventHandlers();
      logger.info('[ImportQueue] Bull queue initialized — async processing active.');
    } catch (err) {
      logger.warn('[ImportQueue] Failed to create Bull queue — running synchronously:', err.message);
      this.queue = null;
    }
  }

  /**
   * Setup event handlers for job monitoring
   */
  setupEventHandlers() {
    // Job started
    this.queue.on('active', (job) => {
      logger.info(`Import job started: ${job.id}`, {
        data: {
          importLogId: job.data.importLogId,
          entity: job.data.entity,
        },
      });
    });

    // Job completed
    this.queue.on('completed', (job, result) => {
      logger.info(`Import job completed: ${job.id}`, {
        data: {
          importLogId: job.data.importLogId,
          summary: result.summary,
        },
      });
    });

    // Job failed
    this.queue.on('failed', (job, err) => {
      logger.error(`Import job failed: ${job.id}`, {
        error: err.message,
        data: {
          importLogId: job.data.importLogId,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
        },
      });
    });

    // Job progress
    this.queue.on('progress', (job, progress) => {
      logger.debug(`Import job progress: ${job.id}`, {
        progress,
        importLogId: job.data.importLogId,
      });
    });

    // Job error (before failure)
    this.queue.on('error', (error) => {
      logger.error('Import queue error:', error);
    });

    // Stalled job (detected but not failed)
    this.queue.on('stalled', (job) => {
      logger.warn(`Import job stalled: ${job.id}`, {
        data: {
          importLogId: job.data.importLogId,
        },
      });
    });
  }

  /**
   * Add import job to queue
   */
  async addJob(jobData, options = {}) {
    try {
      const job = await this.queue.add(jobData, {
        jobId: jobData.importLogId, // Use importLogId as job ID for uniqueness
        priority: options.priority || 3, // 1-10, higher = more important
        attempts: options.attempts || 3, // Retry 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2s, exponential backoff
        },
        timeout: options.timeout || 600000, // 10 minutes default
        removeOnComplete: {
          age: 3600, // Remove after 1 hour if completed
        },
        removeOnFail: false, // Keep failed jobs for review
      });

      logger.info(`Import job queued: ${job.id}`, {
        importLogId: jobData.importLogId,
        entity: jobData.entity,
        priority: options.priority || 3,
      });

      return job;
    } catch (error) {
      logger.error('Error adding import job:', error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    return await this.queue.getJob(jobId);
  }

  /**
   * Get job progress
   */
  async getJobProgress(jobId) {
    const job = await this.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress(),
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      data: job.data,
    };
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId) {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Import job cancelled: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Retry job
   */
  async retryJob(jobId) {
    const job = await this.getJob(jobId);
    if (job) {
      // Increment attempts and add back to queue
      job.attemptsMade = 0;
      await job.update(job.data);
      logger.info(`Import job retried: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [active, completed, failed, delayed, paused, waiting] = await Promise.all([
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.getPausedCount(),
      this.queue.getWaitingCount(),
    ]);

    return {
      active,
      completed,
      failed,
      delayed,
      paused,
      waiting,
      total: active + completed + failed + delayed + paused + waiting,
    };
  }

  /**
   * Process import jobs
   */
  async processJobs(workerFunction) {
    try {
      // Process with concurrency of 2 (adjust based on server capacity)
      this.queue.process(2, async (job) => {
        try {
          logger.info(`Processing import job: ${job.id}`);

          // Update progress callback
          job.progress = async (progress) => {
            await job.progress(progress);
          };

          // Execute the import
          const result = await workerFunction(job.data, job);

          return result;
        } catch (error) {
          logger.error(`Error processing job ${job.id}:`, error);
          throw error;
        }
      });

      logger.info('Import queue processor started');
    } catch (error) {
      logger.error('Error starting queue processor:', error);
      throw error;
    }
  }

  /**
   * Clean old completed jobs
   */
  async cleanOldJobs() {
    try {
      // Remove jobs completed more than 24 hours ago
      await this.queue.clean(86400000, 1000, 'completed');

      // Remove jobs failed more than 7 days ago
      await this.queue.clean(604800000, 1000, 'failed');

      logger.info('Cleaned old jobs from queue');
    } catch (error) {
      logger.error('Error cleaning old jobs:', error);
    }
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(start = 0, end = -1) {
    try {
      const jobs = await this.queue.getFailed(start, end);
      return {
        jobs,
        count: jobs.length,
      };
    } catch (error) {
      logger.error('Error getting failed jobs:', error);
      return { jobs: [], count: 0 };
    }
  }

  /**
   * Close queue
   */
  async close() {
    await this.queue.close();
    logger.info('Import queue closed');
  }
}

module.exports = ImportQueue;
