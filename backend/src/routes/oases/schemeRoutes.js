// ══════════════════════════════════════════════════════════════════
// OASES Routes — Question Scheme (Sprint 1)
// ══════════════════════════════════════════════════════════════════
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../../middlewares/oasesAuth');
const oasesRole  = require('../../middlewares/oasesRole');
const ctrl       = require('../../controller/oases/questionSchemeController');
const { OASES_ROLES } = require('../../utils/oasesConstants');

const adminOnly  = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];
const anyOases   = [oasesAuth]; // all OASES roles can read scheme

// POST  /api/v1/oases/scheme/:examId             — create/replace
router.post('/:examId',              adminOnly, ctrl.saveScheme);

// GET   /api/v1/oases/scheme/:examId             — get scheme
router.get('/:examId',               anyOases,  ctrl.getScheme);

// PATCH /api/v1/oases/scheme/:examId             — patch questions
router.patch('/:examId',             adminOnly, ctrl.patchScheme);

// POST  /api/v1/oases/scheme/:examId/answer-key  — upload MCQ key
router.post('/:examId/answer-key',   adminOnly, ctrl.uploadAnswerKey);

module.exports = router;
