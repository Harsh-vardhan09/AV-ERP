const express = require('express');
const dynamicReportController = require('../controllers/dynamicReportController');
const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorize } = require('../../../core/security/roleMiddleware.js');
const { checkModuleAccess } = require('../../../core/security/moduleGate.js');

const router = express.Router();

router.use(checkModuleAccess('report_cards'));

router.post('/generate', varifyToken, authorize('admin', 'teacher'), dynamicReportController.generateReport);
router.post('/generate-bulk', varifyToken, authorize('admin', 'teacher'), dynamicReportController.generateBulkReports);

// Student self-service
// studentId is taken from the auth token inside the controller — never from the
// request — so a student can only ever reach their own report card.
router.get('/my-report-card', varifyToken, authorize('student'), dynamicReportController.getMyReportCard);
router.get('/my-report-card/download', varifyToken, authorize('student'), dynamicReportController.downloadMyReportCard);

router.get('/preview/:studentId', varifyToken, authorize('admin', 'teacher', 'student'), dynamicReportController.previewReport);

// Dry-render and return missingFields + data coverage as JSON
router.post('/validate', varifyToken, authorize('admin', 'teacher'), dynamicReportController.validateTemplate);

// Statistics — MUST be before /:reportId to avoid Express capturing 'stats' as a param
router.get('/stats', varifyToken, authorize('admin'), dynamicReportController.getStats);

router.get('/', varifyToken, authorize('admin', 'teacher'), dynamicReportController.getReports);

router.get('/download/:reportId', varifyToken, authorize('admin', 'teacher', 'student'), dynamicReportController.downloadReport);

router.delete('/:reportId', varifyToken, authorize('admin'), dynamicReportController.deleteReport);

module.exports = router;
