const express = require('express');
const router = express.Router();
const { authorize } = require('../../../core/security/authorize.js');
const ctrl = require('../controllers/salaryStructureController');

// GET    /api/v1/payroll/structures          — List all structures
router.get('/', authorize('admin', 'accounts'), ctrl.list);

// POST   /api/v1/payroll/structures          — Create a new structure
router.post('/', authorize('admin'), ctrl.create);

// GET    /api/v1/payroll/structures/:id      — Get single structure
router.get('/:id', authorize('admin', 'accounts'), ctrl.getById);

// PUT    /api/v1/payroll/structures/:id      — Update a structure
router.put('/:id', authorize('admin'), ctrl.update);

// POST   /api/v1/payroll/structures/:id/clone — Clone a structure
router.post('/:id/clone', authorize('admin'), ctrl.clone);

// DELETE /api/v1/payroll/structures/:id      — Remove a structure
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;

