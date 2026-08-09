// OASES Routes — Question Scheme
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../middlewares/auth');
const oasesRole  = require('../middlewares/role');
const ctrl       = require('../controllers/questionSchemeController');
const { OASES_ROLES } = require('../lib/constants');

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
