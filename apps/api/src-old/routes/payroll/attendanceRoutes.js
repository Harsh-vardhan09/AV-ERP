const express = require('express');
const router = express.Router();
const { authorize } = require('../../../src/core/security/authorize.js');
const ctrl = require('../../controller/payroll/attendanceController');

// GET    /api/v1/payroll/attendance              — List attendance records
router.get('/', authorize('admin'), ctrl.list);

// POST   /api/v1/payroll/attendance              — Mark single attendance
router.post('/', authorize('admin'), ctrl.markSingle);

// POST   /api/v1/payroll/attendance/bulk         — Mark bulk attendance
router.post('/bulk', authorize('admin'), ctrl.markBulk);

// POST   /api/v1/payroll/attendance/auto-mark-monthly — Auto-mark present for month
router.post('/auto-mark-monthly', authorize('admin'), ctrl.autoMarkMonthly);

// GET    /api/v1/payroll/attendance/summary       — Monthly summary (admin)
router.get('/summary', authorize('admin', 'accounts'), ctrl.getMonthlySummary);

// GET    /api/v1/payroll/attendance/my-summary    — Own monthly summary (teacher)
router.get('/my-summary', authorize('admin', 'accounts', 'teacher'), ctrl.getMyMonthlySummary);

// PUT    /api/v1/payroll/attendance/:id           — Edit attendance record
router.put('/:id', authorize('admin'), ctrl.edit);

module.exports = router;

