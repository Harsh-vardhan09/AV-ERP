// OASES Routes — Report (Sprint 7: oasesAuth → Redis blacklist)
// POST   /report/generate/:examId     — grade + rank
// POST   /report/publish/:examId      — decrypt + publish
// GET    /report/exam/:examId         — summary stats + chart data
// GET    /report/results/:examId      — paginated results table
// GET    /report/student/:examId/:rollNo — individual result
// GET    /report/evaluator/:examId    — evaluator stats
// GET    /report/evaluator/remuneration/:examId — pay
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../middlewares/auth');
const oasesRole  = require('../middlewares/role');
const ctrl       = require('../controllers/reportController');
const { OASES_ROLES } = require('../lib/constants');

const adminOnly   = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];
const adminOrHead = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.HEAD_EXAMINER)];

// Actions
router.post('/generate/:examId',               adminOnly,   ctrl.generateResults);
router.post('/publish/:examId',                adminOnly,   ctrl.publishResults);

// Read
router.get('/exam/:examId',                    adminOrHead, ctrl.getExamSummary);
router.get('/results/:examId',                 adminOrHead, ctrl.listResults);
router.get('/student/:examId/:rollNo',         adminOnly,   ctrl.getStudentResult);

// Evaluator analytics — remuneration BEFORE :examId to avoid route clash
router.get('/evaluator/remuneration/:examId',  adminOnly,   ctrl.getEvaluatorRemuneration);
router.get('/evaluator/:examId',               adminOnly,   ctrl.getEvaluatorStats);

module.exports = router;
