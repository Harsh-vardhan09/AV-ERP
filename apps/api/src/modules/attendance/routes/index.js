const express = require('express');
const router = express.Router();

const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorize } = require('../../../core/security/roleMiddleware.js');
const validateObjectId = require('../../../core/http/validateObjectId.js');
const attendance = require('../controllers/attendanceController');

// Every route here is authenticated. The finer rule — that only the section's
// class teacher may mark it — is a data question, not a role question, so it
// lives in attendanceService.assertCanMark rather than in middleware.
router.use(varifyToken);

const MARKERS = authorize('teacher', 'admin', 'admission');
const STAFF = authorize('teacher', 'admin', 'admission', 'exam_controller');

// ── Marking (class teacher + admin) ──────────────────────────────────────────
router.get('/section-day', MARKERS, attendance.getSectionDay);
router.post('/mark', MARKERS, attendance.markDay);

// ── Admin oversight: sections nobody is assigned to mark ─────────────────────
router.get(
  '/unassigned-sections',
  authorize('admin', 'admission'),
  attendance.getUnassignedSections
);

// ── Student's own record ─────────────────────────────────────────────────────
// Identity comes from the token, so a student cannot name another student.
router.get('/me', authorize('student'), attendance.getMyAttendance);

// ── Staff view of one student ────────────────────────────────────────────────
router.get(
  '/student/:studentId',
  STAFF,
  validateObjectId('studentId'),
  attendance.getStudentAttendance
);

module.exports = router;
