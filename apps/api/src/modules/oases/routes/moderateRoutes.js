// OASES Routes — Moderate (Sprint 7: oasesAuth → Redis blacklist)
// HEAD_EXAMINER only
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../middlewares/auth');
const oasesRole  = require('../middlewares/role');
const ctrl       = require('../controllers/moderateController');
const { OASES_ROLES } = require('../lib/constants');

const heOnly = [oasesAuth, oasesRole(OASES_ROLES.HEAD_EXAMINER)];

// GET  /moderate/conflicts/:examId     — list conflict sheets for exam
router.get('/conflicts/:examId',       heOnly, ctrl.listConflicts);

// GET  /moderate/sheet/:sheetId        — combined data (sheet+scheme+both marks)
router.get('/sheet/:sheetId',          heOnly, ctrl.getConflictSheet);

// POST /moderate/resolve/:sheetId      — submit HE final marks
router.post('/resolve/:sheetId',       heOnly, ctrl.resolveConflict);

module.exports = router;
