const express = require('express');
const router = express.Router();
const ctrl = require('../controller/superAdminController');
const { verifySuperAdmin } = require('../middlewares/superAdminAuth');

// ─── PUBLIC AUTH ROUTES ───────────────────────────────────────────────────────
router.post('/auth/login',  ctrl.login);
router.post('/auth/logout', ctrl.logout);

// ─── PROTECTED AUTH ROUTES ───────────────────────────────────────────────────
router.get('/auth/check', verifySuperAdmin, ctrl.checkAuth);

// ─── PROTECTED SCHOOL MANAGEMENT ROUTES ──────────────────────────────────────
router.get('/schools',              verifySuperAdmin, ctrl.getAllSchools);
router.get('/schools/:id',          verifySuperAdmin, ctrl.getSchoolById);
router.post('/schools',             verifySuperAdmin, ctrl.createSchool);
router.patch('/schools/:id',        verifySuperAdmin, ctrl.updateSchool);
router.patch('/schools/:id/status', verifySuperAdmin, ctrl.toggleSchoolStatus);
router.delete('/schools/:id',       verifySuperAdmin, ctrl.deleteSchool);

// ─── MODULE MANAGEMENT ROUTES (Phase 2) ───────────────────────────────────────
// NOTE: bulk MUST be registered before /:id/modules so Express doesn't treat
// "bulk" as a moduleKey param. Actually bulk route is PUT, others are GET/PATCH so
// order doesn't matter, but keeping it explicit is cleaner.

// GET  /api/super-admin/schools/:id/modules   → full module status for school
router.get('/schools/:id/modules',      verifySuperAdmin, ctrl.getSchoolModules);

// PATCH /api/super-admin/schools/:id/modules  → toggle a single module
router.patch('/schools/:id/modules',    verifySuperAdmin, ctrl.updateSchoolModule);

// PUT  /api/super-admin/schools/:id/modules/bulk → update several modules atomically
router.put('/schools/:id/modules/bulk', verifySuperAdmin, ctrl.bulkUpdateSchoolModules);

// ─── SCHOOL STAFF MANAGEMENT (Super Admin) ────────────────────────────────────
// GET  /api/super-admin/schools/:id/staff   → list admin/admission/accounts staff
router.get('/schools/:id/staff',  verifySuperAdmin, ctrl.getSchoolStaff);
// POST /api/super-admin/schools/:id/staff   → create staff for any school
router.post('/schools/:id/staff', verifySuperAdmin, ctrl.createStaffForSchool);

// ─── REPORT TEMPLATE MANAGEMENT (Super Admin — cross-school) ─────────────────
// GET  /api/super-admin/schools/:id/templates          → list templates for a school
router.get('/schools/:id/templates',                     verifySuperAdmin, ctrl.getSchoolTemplates);
// POST /api/super-admin/schools/:id/templates          → upload template to a school
router.post('/schools/:id/templates',                    verifySuperAdmin, ctrl.uploadTemplateForSchool);
// DELETE /api/super-admin/schools/:id/templates/:tid  → delete a template from a school
router.delete('/schools/:id/templates/:templateId',      verifySuperAdmin, ctrl.deleteSchoolTemplate);
// PATCH  /api/super-admin/schools/:id/templates/:tid  → update status/targeting/default (no re-upload)
router.patch('/schools/:id/templates/:templateId',       verifySuperAdmin, ctrl.updateSchoolTemplate);

// ─── ADMISSION FORM TEMPLATE MANAGEMENT (Super Admin — cross-school) ──────────
// GET  /api/super-admin/schools/:id/admission-templates          → list admission templates for a school
router.get('/schools/:id/admission-templates',                     verifySuperAdmin, ctrl.getSchoolAdmissionTemplates);
// POST /api/super-admin/schools/:id/admission-templates          → upload admission template to a school
router.post('/schools/:id/admission-templates',                    verifySuperAdmin, ctrl.uploadAdmissionTemplateForSchool);
// DELETE /api/super-admin/schools/:id/admission-templates/:tid  → delete admission template
router.delete('/schools/:id/admission-templates/:templateId',      verifySuperAdmin, ctrl.deleteSchoolAdmissionTemplate);
// PATCH  /api/super-admin/schools/:id/admission-templates/:tid  → update status/default/active
router.patch('/schools/:id/admission-templates/:templateId',       verifySuperAdmin, ctrl.updateSchoolAdmissionTemplate);

module.exports = router;

