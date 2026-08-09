/**
 * ImportWorker - Processes import jobs from queue
 * Called by Bull queue, executes actual import logic
 */

const ImportService = require('../services/importService');
const ImportLog = require('../models/ImportLog');
const logger = require('../../../core/logging/logger.js');

class ImportWorker {
  constructor(dependencies = {}) {
    this.importService = new ImportService(dependencies.config || {}, {
      queue: null, // Workers don't queue more jobs
      entityConfigs: dependencies.entityConfigs || {},
      services: dependencies.services || {},
    });
  }

  /**
   * Process import job
   * Called by Bull queue for each job
   */
  async processJob(jobData, job) {
    const { importLogId, schoolId, userId, entity, fileBuffer, fileMetadata, options } = jobData;

    try {
      logger.info(`Worker: Starting import job ${job.id}`, {
        importLogId,
        entity,
        fileSize: fileBuffer ? Buffer.byteLength(fileBuffer, 'base64') : 0,
      });

      // Update import log status
      await ImportLog.findByIdAndUpdate(importLogId, {
        status: 'processing',
        jobId: job.id,
        startedAt: new Date(),
      });

      // Decode file buffer
      const decodedBuffer = Buffer.from(fileBuffer, 'base64');

      // User context for the import
      const userContext = {
        userId,
        schoolId,
        user: { _id: userId, schoolId },
      };

      // Report progress periodically
      const progressInterval = setInterval(() => {
        job.progress(Math.floor(Math.random() * 50) + 25); // Show 25-75% progress
      }, 5000);

      try {
        // Execute the import
        const result = await this.importService.executeImport(
          importLogId,
          decodedBuffer,
          fileMetadata,
          entity,
          options,
          userContext
        );

        clearInterval(progressInterval);

        if (result.success) {
          logger.info(`Worker: Import completed successfully: ${importLogId}`, {
            summary: result.summary,
          });

          // Update import log with final status
          await ImportLog.findByIdAndUpdate(importLogId, {
            status: 'completed',
            completedAt: new Date(),
          });

          return {
            success: true,
            importLogId,
            summary: result.summary,
            message: `Successfully imported ${result.summary.results.success} records`,
          };
        } else {
          logger.error(`Worker: Import failed: ${importLogId}`, {
            error: result.error,
          });

          // Update import log with failed status
          await ImportLog.findByIdAndUpdate(importLogId, {
            status: 'failed',
            completedAt: new Date(),
            error: result.error,
          });

          throw new Error(result.error || 'Import failed');
        }
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      logger.error(`Worker: Error processing job ${job.id}:`, error);

      try {
        // Update import log with error
        await ImportLog.findByIdAndUpdate(
          importLogId,
          {
            status: 'failed',
            error: error.message,
            completedAt: new Date(),
          },
          { new: true }
        );
      } catch (updateError) {
        logger.error('Error updating import log:', updateError);
      }

      // Throw error to trigger job retry
      throw error;
    }
  }

  /**
   * Handle job retry
   */
  async handleRetry(jobData, job, error) {
    logger.warn(`Worker: Retrying job ${job.id}`, {
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      error: error.message,
    });

    try {
      await ImportLog.findByIdAndUpdate(jobData.importLogId, {
        status: 'retry',
        lastError: error.message,
        retryCount: (job.attemptsMade || 1),
      });
    } catch (updateError) {
      logger.error('Error updating import log on retry:', updateError);
    }
  }

  /**
   * Handle job failure (all retries exhausted)
   */
  async handleFailure(jobData, job, error) {
    logger.error(`Worker: Job failed permanently: ${job.id}`, {
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      error: error.message,
    });

    try {
      await ImportLog.findByIdAndUpdate(jobData.importLogId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
        retryCount: job.attemptsMade,
      });

      // TODO: Send notification email to user about failure
      // await notificationService.sendImportFailedEmail({
      //   userId: jobData.userId,
      //   importLogId: jobData.importLogId,
      //   entity: jobData.entity,
      //   error: error.message,
      // });
    } catch (updateError) {
      logger.error('Error updating import log on failure:', updateError);
    }
  }

  /**
   * Handle job completion
   */
  async handleCompletion(jobData, job, result) {
    logger.info(`Worker: Job completed successfully: ${job.id}`, {
      importLogId: jobData.importLogId,
      result,
    });

    try {
      // TODO: Send notification email to user about successful completion
      // await notificationService.sendImportCompletedEmail({
      //   userId: jobData.userId,
      //   importLogId: jobData.importLogId,
      //   entity: jobData.entity,
      //   summary: result.summary,
      // });
    } catch (error) {
      logger.error('Error sending completion notification:', error);
    }
  }
}

module.exports = ImportWorker;
