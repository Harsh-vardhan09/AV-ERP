const express = require('express');
const router  = express.Router();
const { varifyToken }     = require('../middlewares/varifyToken');
const { schoolIsolation } = require('../middlewares/schoolIsolation');
const { authorize }       = require('../middlewares/roleMiddleware');
const ctrl = require('../controller/teacherManagementController');

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
