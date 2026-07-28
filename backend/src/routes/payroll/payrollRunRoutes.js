const express = require('express');
const router = express.Router();

const { authorize } = require('../../middlewares/authorize');
const ctrl = require('../../controller/payroll/payrollController');
const payslipCtrl = require('../../controller/payroll/payslipController');

// ✅ Optional: ID validation middleware
const validateId = (req, res, next) => {
  const { id } = req.params;
  if (!id || id.length !== 24) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID',
    });
  }
  next();
};

// ========================
// Payroll Runs
// ========================

// GET    /runs
router.get('/', authorize('admin', 'accounts'), ctrl.list);

// POST   /runs
router.post('/', authorize('admin', 'accounts'), ctrl.initiate);

// GET    /runs/:id
router.get('/:id', validateId, authorize('admin', 'accounts'), ctrl.getById);

// POST   /runs/:id/process
router.post('/:id/process', validateId, authorize('admin', 'accounts'), ctrl.process);

// GET    /runs/:id/status
router.get('/:id/status', validateId, authorize('admin', 'accounts'), ctrl.getStatus);

// POST   /runs/:id/approve
router.post('/:id/approve', validateId, authorize('admin', 'accounts'), ctrl.approve);

// POST   /runs/:id/lock
router.post('/:id/lock', validateId, authorize('admin', 'accounts'), ctrl.lock);

// POST   /runs/:id/cancel
router.post('/:id/cancel', validateId, authorize('admin', 'accounts'), ctrl.cancel);

// ========================
// Payslips (within run)
// ========================

// GET bulk download
router.get(
  '/:id/payslips/bulk-download',
  validateId,
  authorize('admin', 'accounts'),
  payslipCtrl.bulkDownload
);

// POST   /runs/generate (Single Teacher)
router.post('/generate', authorize('admin', 'accounts'), ctrl.generateTeacherPayroll);

module.exports = router;
