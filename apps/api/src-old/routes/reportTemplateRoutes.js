const express = require('express');
const reportTemplateController = require('../controller/reportTemplateController');
const superAdminController     = require('../controller/superAdminController');
const { varifyToken } = require('../middlewares/varifyToken');
const { authorize } = require('../middlewares/roleMiddleware');
const { checkModuleAccess } = require('../middlewares/checkModuleAccess');

const router = express.Router();

// Module guard
router.use(checkModuleAccess('report_cards'));

/**
 * SCHOOL-FACING TEMPLATE ROUTES — READ + SELECT ONLY.
 *
 * Report card templates are authored by Super Admins and shared globally; see
 * routes/superAdminRoutes.js (`/api/super-admin/templates/*`). A school admin
 * browses the gallery and adopts one via the /selection endpoints, which write
 * SchoolSettings.selectedReportTemplateId and nothing else.
 *
 * The create / update / delete / clone / set-default / extract-fields /
 * validate / preview endpoints that used to live here have MOVED to super
 * admin — a school admin can no longer mutate template content.
 */

// ── Browse ───────────────────────────────────────────────────────────────────
// Returns global templates plus this school's own legacy (pre-split) templates.
router.get('/', varifyToken, authorize('admin', 'teacher'), reportTemplateController.getTemplates);
router.get('/stats', varifyToken, authorize('admin'), reportTemplateController.getStats);

// ── Class-Group Template Resolution ──────────────────────────────────────────
// MUST be placed BEFORE /:id routes to avoid Express wildcard conflicts.
router.get('/for-class', varifyToken, authorize('admin', 'teacher'), reportTemplateController.getTemplateForClass);

// ── School-wide template selection ───────────────────────────────────────────
// Also BEFORE /:id — otherwise Express reads "selection" as a template id.
router.get('/selection', varifyToken, authorize('admin', 'teacher'), reportTemplateController.getSelection);
router.put('/selection', varifyToken, authorize('admin'), reportTemplateController.setSelection);

router.get('/:id', varifyToken, authorize('admin', 'teacher'), reportTemplateController.getTemplate);

// ── Template-Driven Marks Form API ───────────────────────────────────────────
// GET /api/v1/report-templates/:id/fields?examId=...&classId=...
// Returns fields grouped by subject for dynamic teacher form generation.
router.get('/:id/fields', varifyToken, authorize('admin', 'teacher'), superAdminController.getTemplateFields);

module.exports = router;
