const express = require('express');
const router = express.Router();
const { varifyToken } = require('../middlewares/varifyToken');
const { schoolIsolation } = require('../middlewares/schoolIsolation');
const { authorize } = require('../middlewares/roleMiddleware');
const ctrl = require('../controller/studentManagementController');
const admissionCtrl = require('../controller/admissionController');
const { uploadPhoto } = require('../middlewares/multer');

// All routes: admin only
router.use(varifyToken);
router.use(schoolIsolation);
router.use(authorize('admin'));

// ── All Students (enhanced with filters + pagination)
router.get('/all', ctrl.getAllStudentsEnhanced);

// ── Bulk Edit
router.patch('/bulk-edit', ctrl.bulkEditStudents);

// ── Deleted Students
router.get('/deleted', ctrl.getDeletedStudents);
router.patch('/:id/soft-delete', ctrl.softDeleteStudent);
router.patch('/:id/restore', ctrl.restoreDeletedStudent);

// ── Passed Students
router.get('/passed', ctrl.getPassedStudents);
router.patch('/:id/mark-passed', ctrl.markStudentPassed);

// ── Dropped Students
router.get('/dropped', ctrl.getDroppedStudents);
router.patch('/:id/mark-dropped', ctrl.markStudentDropped);

// ── Suspended Students
router.get('/suspended', ctrl.getSuspendedStudents);
router.patch('/:id/suspend', ctrl.suspendStudent);
router.patch('/:id/unsuspend', ctrl.unsuspendStudent);

// ── Migration / Promotion
router.get('/promotion-preview', ctrl.getPromotionPreview);
router.post('/promote', ctrl.promoteStudents);

// ── Export (all students, no pagination, A-Z sorted)
router.get('/export', ctrl.exportStudents);

// ── Student Photo Upload (reuses admission controller + disk→Cloudinary pattern)
router.put('/:id/photo', uploadPhoto.single('photo'), admissionCtrl.uploadStudentPhoto);

module.exports = router;
