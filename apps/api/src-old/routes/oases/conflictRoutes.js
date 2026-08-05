// ══════════════════════════════════════════════════════════════════
// OASES Routes — Conflict (Sprint 7: oasesAuth → Redis blacklist)
// SCHOOL_ADMIN escalates; HEAD_EXAMINER resolves
// ══════════════════════════════════════════════════════════════════
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../../middlewares/oasesAuth');
const oasesRole  = require('../../middlewares/oasesRole');
const ctrl       = require('../../controller/oases/conflictController');
const { OASES_ROLES } = require('../../utils/oasesConstants');

const adminOnly   = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];
const headOnly    = [oasesAuth, oasesRole(OASES_ROLES.HEAD_EXAMINER)];
const adminOrHead = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.HEAD_EXAMINER)];

// GET  /api/v1/oases/conflict                       — list conflict sheets
router.get('/', adminOrHead, ctrl.listConflicts);

// GET  /api/v1/oases/conflict/:sheetId              — both eval marks detail
router.get('/:sheetId', adminOrHead, ctrl.getConflictDetail);

// POST /api/v1/oases/conflict/:sheetId/route-to-head — escalate to HE
router.post('/:sheetId/route-to-head', adminOnly, ctrl.routeToHead);

// POST /api/v1/oases/conflict/:sheetId/resolve      — HE resolves conflict
router.post('/:sheetId/resolve', headOnly, ctrl.resolveConflict);

module.exports = router;
