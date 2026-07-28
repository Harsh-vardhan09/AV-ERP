/**
 * Import Routes - API endpoints for import system
 * Provides full CRUD for import operations
 */

const express = require('express');
const multer = require('multer');
const ImportController = require('../controller/importController');
// ── FIX: use real middleware functions from the main codebase ──────────────
const { varifyToken } = require('../../middlewares/varifyToken');
const { authorize }   = require('../../middlewares/authorize');
const { fileUploadValidator } = require('../middlewares/fileUploadValidator');

const router = express.Router();

// Configure multer for file upload (memory storage — no disk writes)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype;
    if (
      mimeType === 'text/csv' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      // Some browsers send these for CSV
      mimeType === 'application/octet-stream' ||
      mimeType === 'text/plain'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and XLSX files are allowed'));
    }
  },
});

// Singleton controller instance (lazy-initialized on first request)
let importController;

// Middleware to initialize controller on first request
const initializeController = (req, res, next) => {
  if (!importController) {
    importController = new ImportController({
      queue: req.app.locals.importQueue,
      services: {
        studentService: req.app.locals.studentService,
        classService: req.app.locals.classService,
        feeService: req.app.locals.feeService,
      },
    });
  }
  next();
};

// Apply auth to all routes — varifyToken sets req.user + req.schoolId
router.use(varifyToken);
router.use(initializeController);

// ============================================================================
// IMPORT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/import/preview
 * Preview import without actually importing
 * Body (multipart): file, entity
 */
router.post(
  '/preview',
  upload.single('file'),
  authorize('admin', 'admission'),
  fileUploadValidator,
  async (req, res) => {
    await importController.previewImport(req, res);
  }
);

/**
 * POST /api/v1/import/start
 * Start import — synchronous for small files (<500 rows), queued for large
 * Body (multipart): file, entity, duplicateMode, strictness
 */
router.post(
  '/start',
  upload.single('file'),
  authorize('admin', 'admission'),
  fileUploadValidator,
  async (req, res) => {
    await importController.startImport(req, res);
  }
);

/**
 * GET /api/import/:importLogId/status
 * Get import status
 */
router.get(
  '/:importLogId/status',
  authorize('admin', 'admission'),
  async (req, res) => {
    await importController.getImportStatus(req, res);
  }
);

/**
 * GET /api/import/:importLogId/errors
 * Get import errors with pagination
 * Query: page, limit
 */
router.get(
  '/:importLogId/errors',
  authorize('admin', 'admission'),
  async (req, res) => {
    await importController.getImportErrors(req, res);
  }
);

/**
 * GET /api/import/:importLogId/error-report
 * Download error report
 * Query: format (csv|xlsx)
 */
router.get(
  '/:importLogId/error-report',
  authorize('admin', 'admission'),
  async (req, res) => {
    await importController.downloadErrorReport(req, res);
  }
);

/**
 * GET /api/import/history/:entity
 * Get import history for entity
 * Query: days (default 30)
 */
router.get(
  '/history/:entity',
  authorize('admin', 'admission'),
  async (req, res) => {
    await importController.getImportHistory(req, res);
  }
);

/**
 * GET /api/import/profiles/:entity
 * Get import profiles (templates) for entity
 */
router.get(
  '/profiles/:entity',
  authorize('admin', 'admission'),
  async (req, res) => {
    await importController.getImportProfiles(req, res);
  }
);

/**
 * POST /api/import/profile
 * Save import profile (template)
 * Body: name, description, entity, columnMapping, transformations, settings
 */
router.post(
  '/profile',
  authorize('admin', 'admission'),
  async (req, res) => {
    await importController.saveImportProfile(req, res);
  }
);

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// Handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum limit (100MB)',
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
});

module.exports = router;
