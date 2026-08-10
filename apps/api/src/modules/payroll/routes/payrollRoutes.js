/**
 * Payroll Module — Main Router
 * Mounted at: /api/v1/payroll
 * Auth: Applied by main ERP's varifyToken BEFORE this router (in index.js)
 * Do NOT add verifyToken/varifyToken here again.
 */
const express = require('express');
const router = express.Router();

const { checkModuleAccess } = require('../../../core/security/moduleGate');

router.use(checkModuleAccess('payroll'));

// Sub-routes (all in the same directory)
const salaryComponentRoutes = require('./salaryComponentRoutes');
const salaryStructureRoutes = require('./salaryStructureRoutes');
const employeeSalaryRoutes = require('./employeeSalaryRoutes');
const taxConfigRoutes = require('./taxConfigRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const payrollRunRoutes = require('./payrollRunRoutes');
const payslipRoutes = require('./payslipRoutes');
const paymentBatchRoutes = require('./paymentBatchRoutes');
const reportRoutes = require('./reportRoutes');
const bankFileRoutes = require('./bankFileRoutes');

router.use('/components', salaryComponentRoutes);
router.use('/structures', salaryStructureRoutes);
router.use('/employee-salaries', employeeSalaryRoutes);
router.use('/tax-config', taxConfigRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/runs', payrollRunRoutes);
router.use('/payslips', payslipRoutes);
router.use('/payment-batches', paymentBatchRoutes);
router.use('/bank-files', bankFileRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
