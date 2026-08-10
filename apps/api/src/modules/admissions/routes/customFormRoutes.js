const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const { authorize } = require('../../../core/security/roleMiddleware.js');
const { checkModuleAccess } = require('../../../core/security/moduleGate.js');
const ctrl = require('../controllers/customFormController');

// Ahead of the public submit route on purpose: a retired module should not accept
// new leads either. The gate resolves from the registry, so it needs no req state.
router.use(checkModuleAccess('custom_forms'));

// Public route (form submission) — no auth required
router.post('/:token/submit', ctrl.submitForm);

// All routes below: authenticated admin only
router.use(varifyToken);
router.use(schoolIsolation);
router.use(authorize('admin'));

// Reference list of all predefined fields
router.get('/predefined-fields', ctrl.getPredefinedFields);

// Form CRUD
router.get('/', ctrl.getAllForms);
router.get('/deleted', ctrl.getDeletedForms);
router.get('/:id', ctrl.getFormById);
router.post('/', ctrl.createForm);
router.put('/:id', ctrl.updateForm);
router.delete('/:id', ctrl.deleteForm);

// Status & restore
router.patch('/:id/toggle-status', ctrl.toggleFormStatus);
router.patch('/:id/restore', ctrl.restoreForm);

// Leads
router.get('/:id/leads', ctrl.getFormLeads);

module.exports = router;
