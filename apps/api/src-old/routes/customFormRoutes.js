const express = require('express');
const router  = express.Router();
const { varifyToken }     = require('../../src/core/security/authenticate.js');
const { schoolIsolation } = require('../../src/core/security/tenantScope.js');
const { authorize }       = require('../../src/core/security/roleMiddleware.js');
const ctrl = require('../controller/customFormController');

// ── Public route (form submission) — no auth required ─────────────────────────
router.post('/:token/submit', ctrl.submitForm);

// ── All routes below: authenticated admin only ────────────────────────────────
router.use(varifyToken);
router.use(schoolIsolation);
router.use(authorize('admin'));

// ── Reference list of all predefined fields ───────────────────────────────────
router.get('/predefined-fields', ctrl.getPredefinedFields);

// ── Form CRUD ─────────────────────────────────────────────────────────────────
router.get('/',          ctrl.getAllForms);
router.get('/deleted',   ctrl.getDeletedForms);
router.get('/:id',       ctrl.getFormById);
router.post('/',         ctrl.createForm);
router.put('/:id',       ctrl.updateForm);
router.delete('/:id',    ctrl.deleteForm);

// ── Status & restore ──────────────────────────────────────────────────────────
router.patch('/:id/toggle-status', ctrl.toggleFormStatus);
router.patch('/:id/restore',       ctrl.restoreForm);

// ── Leads ─────────────────────────────────────────────────────────────────────
router.get('/:id/leads', ctrl.getFormLeads);

module.exports = router;
