const express = require('express');
const router = express.Router();
const { authorize } = require('../../../core/security/authorize.js');
const taxConfigController = require('../controllers/taxConfigController');

// GET    /api/payroll/tax-config                              — List all configs
router.get('/', authorize('admin'), taxConfigController.getConfigs);

// GET    /api/payroll/tax-config/active — Get active config
router.get('/active', authorize('admin', 'accounts'), taxConfigController.getActiveConfig);

// GET    /api/payroll/tax-config/:id                          — Get single config
router.get('/template', authorize('admin'), taxConfigController.getTaxTemplate);
router.get('/:id', authorize('admin', 'accounts'), taxConfigController.getConfigById);

// POST   /api/payroll/tax-config                              — Create new config
router.post('/', authorize('admin'), taxConfigController.createConfig);

// PUT    /api/payroll/tax-config/:id                          — Update config
router.put('/:id', authorize('admin'), taxConfigController.updateConfig);

// PATCH  /api/payroll/tax-config/:id/toggle — Toggle active/inactive
router.patch('/:id/toggle', authorize('admin'), taxConfigController.toggleStatus);

// POST   /api/payroll/tax-config/seed                         — Seed defaults
router.post('/seed', authorize('admin'), taxConfigController.seedConfig);

module.exports = router;

