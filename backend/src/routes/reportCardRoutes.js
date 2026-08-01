const express = require('express');
const reportCard = require('../controller/reportCardController');
const { varifyToken } = require('../middlewares/varifyToken');
const { authorize } = require('../middlewares/roleMiddleware');
const { checkModuleAccess } = require('../middlewares/checkModuleAccess');

const router = express.Router();

// ─── Module Guard ─────────────────────────────────────────────────────────────
router.use(checkModuleAccess('report_cards'));



// DEPRECATED for admin — the legacy generator screen it powered has been
// retired in favour of the template engine (/api/v1/dynamic-reports/generate).
// Still routed because the TEACHER report-card screen calls it. Do not extend;
// remove once the teacher surface is migrated too.
router.post('/generate', varifyToken, authorize('admin', 'teacher'), reportCard.generateReportCards);
router.post('/finalize/:id', varifyToken, authorize('admin', 'teacher'), reportCard.finalizeReportCard);
router.post('/unlock/:id', varifyToken, authorize('admin'), reportCard.unlockReportCard);
router.get('/class/:classId', varifyToken, authorize('admin', 'teacher', 'exam_controller'), reportCard.getClassReportCards);
// MUST be before /:studentId so Express doesn't treat "exams" as a student ID
router.get('/exams', varifyToken, authorize('admin', 'teacher', 'student'), reportCard.getExamsForClass);
// Per-subject marks submission status — also before /:studentId
router.get('/readiness', varifyToken, authorize('admin', 'teacher', 'exam_controller'), reportCard.getMarksReadiness);
router.get('/:studentId', varifyToken, authorize('admin', 'teacher', 'student'), reportCard.getReportCard);
router.put('/:id', varifyToken, authorize('admin', 'teacher'), reportCard.updateReportCard);

module.exports = router;
