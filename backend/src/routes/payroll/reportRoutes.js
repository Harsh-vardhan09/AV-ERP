const express = require('express');
const router = express.Router();
const { authorize } = require('../../middlewares/authorize');
const ctrl = require('../../controller/payroll/reportController');

// GET    /api/v1/payroll/reports/monthly-summary        — Monthly summary
router.get('/monthly-summary', authorize('admin', 'accounts'), ctrl.monthlySummary);

// GET    /api/v1/payroll/reports/department-breakdown    — Department breakdown
router.get('/department-breakdown', authorize('admin', 'accounts'), ctrl.departmentBreakdown);

// GET    /api/v1/payroll/reports/tds-summary             — TDS summary
router.get('/tds-summary', authorize('admin', 'accounts'), ctrl.tdsSummary);

// GET    /api/v1/payroll/reports/pf-register             — PF register
router.get('/pf-register', authorize('admin', 'accounts'), ctrl.pfRegister);

// GET    /api/v1/payroll/reports/esi-register            — ESI register
router.get('/esi-register', authorize('admin', 'accounts'), ctrl.esiRegister);

// GET    /api/v1/payroll/reports/ytd                     — Year-to-date
router.get('/ytd', authorize('admin', 'accounts'), ctrl.ytd);

// POST   /api/v1/payroll/reports/export                  — Initiate export
router.post('/export', authorize('admin', 'accounts'), ctrl.exportReport);

// GET    /api/v1/payroll/reports/export/:jobId/status    — Check export status
router.get('/export/:jobId/status', authorize('admin', 'accounts'), ctrl.getExportStatus);

module.exports = router;

