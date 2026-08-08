// ══════════════════════════════════════════════════════════════════
// OASES Admin Service — Sprint 4: add lock + audit page endpoints
// ══════════════════════════════════════════════════════════════════
import oasesAxios from '../lib/axios';

export const assignmentService = {
  assign: (payload) => oasesAxios.post('/assignment/assign', payload).then((r) => r.data.data),

  list: (params = {}) => oasesAxios.get('/assignment', { params }).then((r) => r.data.data),
};

export const conflictService = {
  list: (params = {}) => oasesAxios.get('/conflict', { params }).then((r) => r.data.data),

  getDetail: (sheetId) => oasesAxios.get(`/conflict/${sheetId}`).then((r) => r.data.data),

  routeToHead: (sheetId, headExaminerId) =>
    oasesAxios.post(`/conflict/${sheetId}/route-to-head`, { headExaminerId }).then((r) => r.data),

  resolve: (sheetId, payload) =>
    oasesAxios.post(`/conflict/${sheetId}/resolve`, payload).then((r) => r.data),
};

export const resultService = {
  generate: (examConfigId) =>
    oasesAxios.post(`/result/generate/${examConfigId}`).then((r) => r.data.data),

  list: (examConfigId, params = {}) =>
    oasesAxios.get(`/result/${examConfigId}`, { params }).then((r) => r.data.data),

  publish: (examConfigId) =>
    oasesAxios.patch(`/result/${examConfigId}/publish`).then((r) => r.data.data),
};

export const auditService = {
  /** Paginated list — supports useInfiniteQuery via page param */
  list: (params = {}) => oasesAxios.get('/audit', { params }).then((r) => r.data.data),

  /** Full entity trail (for AuditTrailDrawer) */
  getEntityTrail: (entityId, page = 1) =>
    oasesAxios.get(`/audit/${entityId}`, { params: { page, limit: 20 } }).then((r) => r.data.data),
};
