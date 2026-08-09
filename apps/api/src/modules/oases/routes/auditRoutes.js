// OASES Routes — Audit Log (Sprint 7: oasesAuth → Redis blacklist)
// SCHOOL_ADMIN only — compliance view
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../middlewares/auth');
const oasesRole  = require('../middlewares/role');
const ctrl       = require('../controllers/auditController');
const { OASES_ROLES } = require('../lib/constants');

const adminOnly = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];

// GET /api/v1/oases/audit              — paginated school-wide audit log
router.get('/', adminOnly, ctrl.listAuditLogs);

// GET /api/v1/oases/audit/:entityId    — full trail for a specific entity
router.get('/:entityId', adminOnly, ctrl.getEntityAudit);

module.exports = router;
