const express = require('express');
const dynamicReportController = require('../controller/dynamicReportController');
const { varifyToken } = require('../middlewares/varifyToken');
const { authorize } = require('../middlewares/roleMiddleware');
const { checkModuleAccess } = require('../middlewares/checkModuleAccess');

const router = express.Router();

// Module guard
router.use(checkModuleAccess('report_cards'));

// Report generation routes
router.post('/generate', varifyToken, authorize('admin', 'teacher'), dynamicReportController.generateReport);
router.post('/generate-bulk', varifyToken, authorize('admin', 'teacher'), dynamicReportController.generateBulkReports);

// Preview route
router.get('/preview/:studentId', varifyToken, authorize('admin', 'teacher', 'student'), dynamicReportController.previewReport);

// Validate: dry-render and return missingFields + data coverage as JSON (Issue 6)
router.post('/validate', varifyToken, authorize('admin', 'teacher'), dynamicReportController.validateTemplate);

// Statistics — MUST be before /:reportId to avoid Express capturing 'stats' as a param
router.get('/stats', varifyToken, authorize('admin'), dynamicReportController.getStats);

// List reports
router.get('/', varifyToken, authorize('admin', 'teacher'), dynamicReportController.getReports);

// Download route
router.get('/download/:reportId', varifyToken, authorize('admin', 'teacher', 'student'), dynamicReportController.downloadReport);

// Delete report — param route last to avoid swallowing static paths
router.delete('/:reportId', varifyToken, authorize('admin'), dynamicReportController.deleteReport);

module.exports = router;
