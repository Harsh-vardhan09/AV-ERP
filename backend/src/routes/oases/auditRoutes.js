// ══════════════════════════════════════════════════════════════════
// OASES Routes — Audit Log (Sprint 7: oasesAuth → Redis blacklist)
// SCHOOL_ADMIN only — compliance view
// ══════════════════════════════════════════════════════════════════
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../../middlewares/oasesAuth');
const oasesRole  = require('../../middlewares/oasesRole');
const ctrl       = require('../../controller/oases/auditController');
const { OASES_ROLES } = require('../../utils/oasesConstants');

const adminOnly = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];

// GET /api/v1/oases/audit              — paginated school-wide audit log
router.get('/', adminOnly, ctrl.listAuditLogs);

// GET /api/v1/oases/audit/:entityId    — full trail for a specific entity
router.get('/:entityId', adminOnly, ctrl.getEntityAudit);

module.exports = router;
