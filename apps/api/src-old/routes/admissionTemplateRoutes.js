/**
 * Admission Template Routes  (School-Scoped — READ-ONLY + PDF generation)
 *
 * WRITE OPERATIONS (create / update / delete / clone / set-default / extract-fields)
 * are handled exclusively by the Super Admin via:
 *   POST   /api/v1/superadmin/admission-templates/:schoolId
 *   PUT    /api/v1/superadmin/admission-templates/:schoolId/:templateId
 *   DELETE /api/v1/superadmin/admission-templates/:schoolId/:templateId
 *
 * School Admin + Admission Role (authenticated, school-scoped — READ & PDF only):
 *   GET    /stats             → template statistics
 *   GET    /active            → get active/default template (read-only)
 *   GET    /                  → list templates (read-only)
 *   GET    /:id               → get single template (read-only)
 *   GET    /:id/preview       → render preview HTML (read-only)
 *   POST   /preview           → preview with POST body data (read-only)
 *   POST   /generate          → generate PDF for a student
 *   GET    /download/:fileName → download generated PDF
 */
const express = require('express');
const router  = express.Router();

const { varifyToken } = require('../../src/core/security/authenticate.js');
const { authorize }   = require('../../src/core/security/roleMiddleware.js');
const ctrl = require('../controller/admissionTemplateController');

// All routes require school-user authentication
router.use(varifyToken);

// Read access: admin + admission + teacher
const readGuard = authorize('admin', 'admission', 'teacher');

// ── Statistics & active template (read-only) ──────────────────────────────────
router.get('/stats',  readGuard, ctrl.getStats);
router.get('/active', readGuard, ctrl.getActiveTemplate);

// ── Preview POST (read-only) ──────────────────────────────────────────────────
router.post('/preview', readGuard, ctrl.previewTemplate);

// ── PDF Generation & Download ─────────────────────────────────────────────────
router.post('/generate',          readGuard, ctrl.generatePDF);
router.get('/download/:fileName', readGuard, ctrl.downloadPDF);

// ── Read-only CRUD (no create / update / delete / clone / set-default) ────────
router.get('/',    readGuard, ctrl.getTemplates);
router.get('/:id', readGuard, ctrl.getTemplate);

// ── GET preview for a saved template ─────────────────────────────────────────
router.get('/:id/preview', readGuard, ctrl.previewSavedTemplate);

module.exports = router;
