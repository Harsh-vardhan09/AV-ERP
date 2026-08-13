/**
 * Import System Initialization
 * Bootstraps the entire import system with all components
 */

const ImportQueue = require('./queue/importQueue');
const ImportWorker = require('./queue/importWorker');
const ImportController = require('./controller/importController');
const ImportService = require('./services/importService');
const STUDENT_IMPORT_CONFIG = require('./configs/studentImportConfig');
const StudentAdapter = require('./adapters/studentAdapter');
const ATTENDANCE_IMPORT_CONFIG = require('./configs/attendanceImportConfig');
const AttendanceAdapter = require('./adapters/attendanceAdapter');
const logger = require('../../core/logging/logger.js');

class ImportSystemInitializer {
  constructor(app, redis, services) {
    this.app = app;
    this.redis = redis;
    this.services = services;
    this.queue = null;
    this.controller = null;
    this.service = null;
  }

  /**
   * Initialize the entire import system
   */
  async initialize() {
    try {
      logger.info('Initializing Import System...');

      // Step 1: Initialize queue
      logger.info('Step 1: Initializing import queue...');
      this.queue = new ImportQueue(this.redis);
      this.app.locals.importQueue = this.queue;

      // Step 2: Setup queue processor (worker)
      logger.info('Step 2: Setting up queue processor...');
      this.setupQueueProcessor();

      // Step 3: Initialize service
      logger.info('Step 3: Initializing import service...');
      this.service = new ImportService(
        {},
        {
          queue: this.queue.queue,
          entityConfigs: {},
          services: this.services,
        }
      );

      // Step 4: Register entity adapters
      logger.info('Step 4: Registering entity adapters...');
      this.registerAdapters();

      // Step 5: Initialize controller
      logger.info('Step 5: Initializing import controller...');
      this.controller = new ImportController({
        queue: this.queue.queue,
        services: this.services,
      });
      this.app.locals.importController = this.controller;

      // Step 6: Setup routes
      logger.info('Step 6: Setting up import routes...');
      this.setupRoutes();

      // Step 7: Setup periodic maintenance
      logger.info('Step 7: Setting up maintenance tasks...');
      this.setupMaintenance();

      logger.info('✓ Import System initialized successfully');

      return {
        success: true,
        queue: this.queue,
        service: this.service,
        controller: this.controller,
      };
    } catch (error) {
      logger.error('Error initializing import system:', error);
      throw error;
    }
  }

  /**
   * Register entity adapters
   */
  registerAdapters() {
    // Student adapter
    const studentAdapter = new StudentAdapter(STUDENT_IMPORT_CONFIG, this.services);
    STUDENT_IMPORT_CONFIG.adapter = async (rowData, schoolId, context) => {
      return await studentAdapter.importRow(rowData, schoolId, context);
    };
    this.service.registerEntityConfig('student', STUDENT_IMPORT_CONFIG);
    logger.info('  ✓ Student adapter registered');

    // Attendance adapter. Until this was registered the config carried a stub
    // that threw 'Adapter not configured', so every attendance row failed.
    const attendanceAdapter = new AttendanceAdapter(ATTENDANCE_IMPORT_CONFIG, this.services);
    ATTENDANCE_IMPORT_CONFIG.adapter = async (rowData, schoolId, context) => {
      return await attendanceAdapter.importRow(rowData, schoolId, context);
    };
    this.service.registerEntityConfig('attendance', ATTENDANCE_IMPORT_CONFIG);
    logger.info('  ✓ Attendance adapter registered');

    // TODO: Register other adapters
    // - TeacherAdapter
    // - FeeAdapter
    // - etc.
  }

  /**
   * Setup queue processor
   */
  setupQueueProcessor() {
    const worker = new ImportWorker({
      config: {},
      entityConfigs: {},
      services: this.services,
    });

    this.queue.processJobs(async (jobData, job) => {
      return await worker.processJob(jobData, job);
    });

    logger.info('  ✓ Queue processor started');
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    const importRoutes = require('./routes/importRoutes');
    this.app.use('/api/v1/import', importRoutes);
    logger.info('  ✓ Import routes registered at /api/v1/import');
  }

  /**
   * Setup periodic maintenance tasks
   */
  setupMaintenance() {
    // Clean old jobs every hour
    setInterval(async () => {
      try {
        await this.queue.cleanOldJobs();
      } catch (error) {
        logger.error('Error in maintenance task:', error);
      }
    }, 3600000); // Every 1 hour

    logger.info('  ✓ Maintenance tasks scheduled');
  }

  /**
   * Get system status
   */
  async getStatus() {
    try {
      const stats = await this.queue.getQueueStats();
      return {
        status: 'healthy',
        queue: stats,
        initialized: true,
      };
    } catch (error) {
      logger.error('Error getting system status:', error);
      return {
        status: 'error',
        error: error.message,
        initialized: false,
      };
    }
  }

  /**
   * Shutdown the import system
   */
  async shutdown() {
    try {
      logger.info('Shutting down Import System...');
      if (this.queue) {
        await this.queue.close();
      }
      logger.info('✓ Import System shutdown complete');
    } catch (error) {
      logger.error('Error shutting down import system:', error);
      throw error;
    }
  }
}

/**
 * Initialize function to be called from main app
 */
async function initializeImportSystem(app, redis, services) {
  const initializer = new ImportSystemInitializer(app, redis, services);
  return await initializer.initialize();
}

module.exports = {
  ImportSystemInitializer,
  initializeImportSystem,
};
