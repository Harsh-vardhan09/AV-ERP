const express = require('express');
const router = express.Router();
const { authorize } = require('../../../core/security/authorize.js');
const ctrl = require('../controllers/payslipController');

// GET    /api/v1/payroll/payslips                           — List payslips (admin)
router.get('/', authorize('admin', 'accounts'), ctrl.list);

// GET    /api/v1/payroll/payslips/mine                      — Get own payslips (teacher)
router.get('/mine', authorize('admin', 'accounts', 'teacher'), ctrl.getMine);



// GET    /api/v1/payroll/payslips/:id                       — Get single payslip
router.get('/:id', authorize('admin', 'accounts', 'teacher'), ctrl.getById);

// GET    /api/v1/payroll/payslips/:id/download              — Download PDF
router.get('/:id/download', authorize('admin', 'accounts', 'teacher'), ctrl.download);

// POST   /api/v1/payroll/payslips/:id/resend-email          — Resend email
router.post('/:id/resend-email', authorize('admin'), ctrl.resendEmail);

module.exports = router;

