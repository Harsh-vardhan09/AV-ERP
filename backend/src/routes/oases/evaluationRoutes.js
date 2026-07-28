// ══════════════════════════════════════════════════════════════════
// OASES Routes — Evaluation (Sprint 7: rate limiting + locked guard)
// EVALUATOR and HEAD_EXAMINER access
// ══════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const oasesAuth = require('../../middlewares/oasesAuth');
const oasesRole = require('../../middlewares/oasesRole');
const ctrl = require('../../controller/oases/evaluationController');
const lockedSheetGuard = require('../../middlewares/lockedSheetGuard');
const {
  pageFetchLimiter,
  markSaveLimiter,
  generalOasesLimiter,
} = require('../../middlewares/oasesRateLimiter');
const { OASES_ROLES } = require('../../utils/oasesConstants');

// Write routes — evaluators, head examiners, school admins, and teachers
const evalOrHead = [
  oasesAuth,
  oasesRole(OASES_ROLES.EVALUATOR, OASES_ROLES.HEAD_EXAMINER, OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.TEACHER),
];

// Read routes — also allow SCHOOL_ADMIN (admin can view any sheet for review)
const readRoles = [
  oasesAuth,
  oasesRole(OASES_ROLES.EVALUATOR, OASES_ROLES.HEAD_EXAMINER, OASES_ROLES.SCHOOL_ADMIN),
];

// ── Read-only ─────────────────────────────────────────────────────
// GET /evaluation/queue
router.get('/queue', generalOasesLimiter, evalOrHead, ctrl.getEvalQueue);

// GET /evaluation/sheet/:sheetId — combined sheet + scheme + draft
// Admin (SCHOOL_ADMIN) can view any sheet — read-only
router.get('/sheet/:sheetId', pageFetchLimiter, readRoles, ctrl.getSheetForEval);

// GET /evaluation/page/:sheetId/:pageNo — signed URL for one page
router.get('/page/:sheetId/:pageNo', pageFetchLimiter, readRoles, ctrl.getPageUrl);

// GET /evaluation/draft/:sheetId
router.get('/draft/:sheetId', generalOasesLimiter, readRoles, ctrl.getDraft);

// ── Mutations (locked guard on all) ───────────────────────────────
// POST /evaluation/mark
router.post('/mark', markSaveLimiter, evalOrHead, lockedSheetGuard, ctrl.saveMark);

// POST/PUT /evaluation/draft/:sheetId
router.post('/draft/:sheetId', generalOasesLimiter, evalOrHead, lockedSheetGuard, ctrl.saveDraft);
router.put('/draft/:sheetId', generalOasesLimiter, evalOrHead, lockedSheetGuard, ctrl.saveDraft);

// POST /evaluation/page-reviewed/:sheetId/:pageNo
router.post('/page-reviewed/:sheetId/:pageNo', generalOasesLimiter, evalOrHead, lockedSheetGuard, ctrl.markPageReviewed);

// POST /evaluation/ufm/:sheetId
router.post('/ufm/:sheetId', generalOasesLimiter, evalOrHead, lockedSheetGuard, ctrl.flagUfm);

// POST /evaluation/reject/:sheetId
router.post('/reject/:sheetId', generalOasesLimiter, evalOrHead, lockedSheetGuard, ctrl.rejectSheet);

// POST /evaluation/submit/:sheetId
router.post('/submit/:sheetId', generalOasesLimiter, evalOrHead, lockedSheetGuard, ctrl.submitMarks);

// ── Phase 5: Admin-only actions ────────────────────────────────────
const adminOnly = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.SUPER_ADMIN)];

// POST /evaluation/approve/:sheetId — Admin approves a submitted sheet
router.post('/approve/:sheetId', generalOasesLimiter, adminOnly, ctrl.approveSheet);

// POST /evaluation/override/:sheetId — Admin overrides teacher marks
router.post('/override/:sheetId', generalOasesLimiter, adminOnly, ctrl.overrideMarks);

module.exports = router;
