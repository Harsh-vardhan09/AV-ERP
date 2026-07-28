const express = require('express');
const reportTemplateController = require('../controller/reportTemplateController');
const superAdminController     = require('../controller/superAdminController');
const { varifyToken } = require('../middlewares/varifyToken');
const { authorize } = require('../middlewares/roleMiddleware');
const { checkModuleAccess } = require('../middlewares/checkModuleAccess');

const router = express.Router();

// Module guard
router.use(checkModuleAccess('report_cards'));

// Template CRUD routes
router.post('/', varifyToken, authorize('admin'), reportTemplateController.createTemplate);
router.get('/', varifyToken, authorize('admin', 'teacher'), reportTemplateController.getTemplates);
router.get('/stats', varifyToken, authorize('admin'), reportTemplateController.getStats);

// ── Class-Group Template Resolution ──────────────────────────────────────────
// MUST be placed BEFORE /:id routes to avoid Express wildcard conflicts.
// GET /for-class?classId=xxx&examType=annual → resolves best template for a class
router.get('/for-class', varifyToken, authorize('admin', 'teacher'), reportTemplateController.getTemplateForClass);

router.get('/:id', varifyToken, authorize('admin', 'teacher'), reportTemplateController.getTemplate);
router.put('/:id', varifyToken, authorize('admin'), reportTemplateController.updateTemplate);
router.delete('/:id', varifyToken, authorize('admin'), reportTemplateController.deleteTemplate);

// Template utility routes
router.post('/extract-fields', varifyToken, authorize('admin', 'teacher'), reportTemplateController.extractFields);
router.post('/validate', varifyToken, authorize('admin', 'teacher'), reportTemplateController.validateTemplate);
router.post('/preview', varifyToken, authorize('admin', 'teacher'), reportTemplateController.previewTemplate);
router.put('/:id/set-default', varifyToken, authorize('admin'), reportTemplateController.setDefault);
router.post('/:id/clone', varifyToken, authorize('admin'), reportTemplateController.cloneTemplate);

// ── Template-Driven Marks Form API ───────────────────────────────────────────
// GET /api/report-templates/:id/fields?examId=...&classId=...
// Returns fields grouped by subject for dynamic teacher form generation
router.get('/:id/fields', varifyToken, authorize('admin', 'teacher'), superAdminController.getTemplateFields);

module.exports = router;
