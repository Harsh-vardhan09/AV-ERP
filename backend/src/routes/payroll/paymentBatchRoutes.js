const express = require('express');
const router = express.Router();
const { authorize } = require('../../middlewares/authorize');
const ctrl = require('../../controller/payroll/paymentBatchController');

// POST   /api/v1/payroll/payment-batches                  — Generate batch
router.post('/', authorize('admin'), ctrl.generate);

// GET    /api/v1/payroll/payment-batches/:payrollId       — Get batches for payroll
router.get('/:payrollId', authorize('admin', 'accounts'), ctrl.getByPayrollId);

// PATCH  /api/v1/payroll/payment-batches/:id/submit       — Mark as submitted
router.patch('/:id/submit', authorize('admin'), ctrl.markSubmitted);

// GET    /api/v1/payroll/payment-batches/:id/download     — Download batch file
router.get('/:id/download', authorize('admin'), ctrl.download);

module.exports = router;

