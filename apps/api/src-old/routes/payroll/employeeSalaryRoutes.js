const express = require('express');
const router = express.Router();
const { authorize } = require('../../../src/core/security/authorize.js');
const ctrl = require('../../controller/payroll/employeeSalaryController');

// GET    /api/v1/payroll/employee-salaries              — List all
router.get('/', authorize('admin', 'accounts'), ctrl.list);

// POST   /api/v1/payroll/employee-salaries              — Assign salary
router.post('/', authorize('admin', 'accounts'), ctrl.assign);

// GET    /api/v1/payroll/employee-salaries/unassigned    — Get unassigned employees
router.get('/unassigned', authorize('admin', 'accounts'), ctrl.getUnassigned);

// GET    /api/v1/payroll/employee-salaries/:teacherId/current — Get current salary
router.get('/:teacherId/current', authorize('admin', 'accounts'), ctrl.getCurrent);

// GET    /api/v1/payroll/employee-salaries/:teacherId/history — Get salary history
router.get('/:teacherId/history', authorize('admin', 'accounts'), ctrl.getHistory);

// POST   /api/v1/payroll/employee-salaries/revise  — Revise salary
router.post('/revise', authorize('admin', 'accounts'), ctrl.revise);

module.exports = router;

