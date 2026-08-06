const express = require('express');
const router = express.Router();
const { authorize } = require('../../../src/core/security/authorize.js');
const salaryComponentController = require('../../controller/payroll/salaryComponentController');

// GET    /api/payroll/salary-components          — List all components (with optional filters)
router.get('/', authorize('admin', 'accounts'), salaryComponentController.getComponents);

// GET    /api/payroll/salary-components/:id       — Get single component
router.get('/:id', authorize('admin', 'accounts'), salaryComponentController.getComponentById);

// POST   /api/payroll/salary-components           — Create a new component
router.post('/', authorize('admin'), salaryComponentController.createComponent);

// PUT    /api/payroll/salary-components/:id       — Update a component
router.put('/:id', authorize('admin'), salaryComponentController.updateComponent);

// PATCH  /api/payroll/salary-components/:id/toggle — Toggle active/inactive
router.patch('/:id/toggle', authorize('admin'), salaryComponentController.toggleStatus);

// POST   /api/payroll/salary-components/seed      — Seed defaults
router.post('/seed', authorize('admin'), salaryComponentController.seedComponents);

module.exports = router;

