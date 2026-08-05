// ══════════════════════════════════════════════════════════════════
// OASES Routes — Result (Sprint 7: oasesAuth → Redis blacklist)
// SCHOOL_ADMIN / HEAD_EXAMINER generate and publish results
//
// Two-step pipeline:
//   1. POST /result/generate/:examConfigId  → resultController
//      Creates ResultSheet documents from locked AnswerSheets.
//   2. POST /result/:examConfigId/publish   → reportController (full)
//      Decrypts rollNo, links Student model, sets isPublished.
//      (The old resultController.publishResults was a simple updateMany
//      that skipped rollNo decryption — now fixed to use the canonical
//      reportController.publishResults.)
// ══════════════════════════════════════════════════════════════════
const express      = require('express');
const router       = express.Router();
const oasesAuth    = require('../../middlewares/oasesAuth');
const oasesRole    = require('../../middlewares/oasesRole');
const ctrl         = require('../../controller/oases/resultController');
const reportCtrl   = require('../../controller/oases/reportController'); // P1 fix
const { OASES_ROLES } = require('../../utils/oasesConstants');

const adminOrHead = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.HEAD_EXAMINER)];
const adminOnly   = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];

// POST  /api/v1/oases/result/generate/:examConfigId — Step 1: create ResultSheet docs
router.post('/generate/:examConfigId', adminOrHead, ctrl.generateResults);

// GET   /api/v1/oases/result/:examConfigId           — list results (paginated)
router.get('/:examConfigId', adminOrHead, ctrl.listResults);

// PATCH /api/v1/oases/result/:examConfigId/publish   — Step 3: full publish (P1 fix)
// Bridges examConfigId → examId so reportController can read it.
// reportController.publishResults: decrypts rollNo, links Student model, sets isPublished.
router.patch('/:examConfigId/publish', adminOnly, (req, _res, next) => {
  req.params.examId = req.params.examConfigId; // bridge param name
  next();
}, reportCtrl.publishResults);

module.exports = router;

