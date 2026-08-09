// OASES Routes — ExamConfig (Sprint 1 ─ updated)
// Adds PATCH /:id/status for status transitions
// Switches from varifyToken + oasesRole to oasesAuth middleware
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../middlewares/auth');
const oasesRole  = require('../middlewares/role');
const ctrl       = require('../controllers/examConfigController');
const { OASES_ROLES } = require('../lib/constants');

// All authenticated OASES users can READ exam configs
// (scanner needs exam list to pick which exam to upload for,
//  evaluators need to know which exams are in evaluation, etc.)
const readRoles  = [oasesAuth, oasesRole(
  OASES_ROLES.SCHOOL_ADMIN,
  OASES_ROLES.SCAN_OPERATOR,
  OASES_ROLES.EVALUATOR,
  OASES_ROLES.HEAD_EXAMINER,
)];

// Only School Admins can create/update/delete
const adminOnly  = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];

router.post('/',                adminOnly,  ctrl.createExamConfig);
router.get('/',                 readRoles,  ctrl.listExamConfigs);
router.get('/:id',              readRoles,  ctrl.getExamConfig);
router.patch('/:id',            adminOnly,  ctrl.updateExamConfig);
router.patch('/:id/status',     adminOnly,  ctrl.changeStatus);
router.delete('/:id',           adminOnly,  ctrl.deleteExamConfig);

module.exports = router;
