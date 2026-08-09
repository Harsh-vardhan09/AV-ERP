const express = require('express');
const router  = express.Router();
const { varifyToken }     = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const { authorize }       = require('../../../core/security/roleMiddleware.js');
const ctrl = require('../controllers/teacherManagementController');

// All routes: authenticated admin only
router.use(varifyToken);
router.use(schoolIsolation);
router.use(authorize('admin'));

// ── Teacher list (paginated, searchable) ──────────────────────────────────────
router.get('/all',     ctrl.getAllTeachersEnhanced);

// ── Deleted Teachers ──────────────────────────────────────────────────────────
router.get('/deleted',           ctrl.getDeletedTeachers);
router.patch('/:id/soft-delete', ctrl.softDeleteTeacher);
router.patch('/:id/restore',     ctrl.restoreTeacher);

// ── Status toggle ─────────────────────────────────────────────────────────────
router.patch('/:id/toggle-status', ctrl.toggleTeacherStatus);

module.exports = router;
