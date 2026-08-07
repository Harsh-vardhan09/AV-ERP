// OASES — Audit Service
// Fire-and-forget audit logger. Never throws — failures are logged
// to console but do NOT block the main request.
const OasesAuditLog = require('../models/AuditLog');
const logger = require('../../../core/logging/logger.js');

/**
 * Log an OASES audit event asynchronously.
 * Safe to call without await — errors are swallowed.
 *
 * @param {object} params
 * @param {string} params.schoolId
 * @param {string} params.entityType
 * @param {string} [params.entityId]
 * @param {string} params.actorId
 * @param {string} params.actorRole
 * @param {string} params.action
 * @param {object} [params.details]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 */
const log = (params) => {
  OasesAuditLog.create({
    schoolId:   params.schoolId,
    entityType: params.entityType || 'System',
    entityId:   params.entityId   || null,
    actorId:    params.actorId,
    actorRole:  params.actorRole  || 'UNKNOWN',
    action:     params.action,
    details:    params.details    || {},
    ipAddress:  params.ipAddress  || '',
    userAgent:  params.userAgent  || '',
  }).catch((err) => {
    // Never throw — just log server-side
    logger.error('[OASES AuditLog] Failed to write:', err.message);
  });
};

module.exports = { log };
