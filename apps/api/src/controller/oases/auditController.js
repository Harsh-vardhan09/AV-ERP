// ══════════════════════════════════════════════════════════════════
// OASES Controller — Audit Log
// Read-only endpoints for audit trail viewing (append-only model).
// ══════════════════════════════════════════════════════════════════
const AuditLog = require('../../models/oases/AuditLog');
const { oasesSuccess, oasesError } = require('../../utils/oasesResponse');
const oasesAsyncHandler = require('../../utils/oasesAsyncHandler');

// ── GET /api/v1/oases/audit ──────────────────────────────────
// Paginated audit log for the school (infinite scroll / useInfiniteQuery)
exports.listAuditLogs = oasesAsyncHandler(async (req, res) => {
  const { entityType, entityId, actorId, action, page = 1, limit = 20 } = req.query;

  const filter = { schoolId: req.schoolId };
  if (entityType) filter.entityType = entityType;
  if (entityId)   filter.entityId   = entityId;
  if (actorId)    filter.actorId    = actorId;
  if (action)     filter.action     = action;

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await AuditLog.countDocuments(filter);
  const logs  = await AuditLog.find(filter)
    .populate('actorId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const hasMore  = skip + logs.length < total;
  const nextPage = hasMore ? Number(page) + 1 : undefined;

  return oasesSuccess(res, { logs, total, page: Number(page), limit: Number(limit), hasMore, nextPage }, 'Audit logs fetched.');
});

// ── GET /api/v1/oases/audit/:entityId ────────────────────────
// Complete history for a specific entity (e.g. one AnswerSheet)
exports.getEntityAudit = oasesAsyncHandler(async (req, res) => {
  const logs = await AuditLog.find({
    schoolId: req.schoolId,
    entityId: req.params.entityId,
  })
    .populate('actorId', 'name email')
    .sort({ createdAt: 1 });

  return oasesSuccess(res, logs, 'Entity audit trail fetched.');
});
