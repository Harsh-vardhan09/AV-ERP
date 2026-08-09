// OASES Routes — Assignment (Sprint 7: oasesAuth → Redis blacklist)
const express = require('express');
const router = express.Router();
const oasesAuth = require('../middlewares/auth');
const oasesRole = require('../middlewares/role');
const ctrl = require('../controllers/assignmentController');
const { OASES_ROLES } = require('../lib/constants');

const adminOnly = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];

// POST /api/v1/oases/assignment/sheet/:sheetId  — assign single sheet
router.post('/sheet/:sheetId', adminOnly, ctrl.assignSingleSheet);

// POST /api/v1/oases/assignment/bulk/:examId   — bulk round-robin/random
router.post('/bulk/:examId', adminOnly, ctrl.bulkAssign);

// POST /api/v1/oases/assignment/assign         — bulk by sheetIds array
router.post('/assign', adminOnly, ctrl.assignSheets);

// GET  /api/v1/oases/assignment                — list all assignments
router.get('/', adminOnly, ctrl.listAssignments);

// GET  /api/v1/oases/assignment/evaluators   — list school teachers/evaluators
router.get('/evaluators', adminOnly, ctrl.getEvaluators);

// POST /api/v1/oases/assignment/auto/:examId  — smart auto-assign via subject teacher
router.post('/auto/:examId', adminOnly, ctrl.autoAssign);

// GET  /api/v1/oases/assignment/unassigned/:examConfigId
router.get('/unassigned/:examConfigId', adminOnly, ctrl.getUnassignedSheets);

module.exports = router;
