// ══════════════════════════════════════════════════════════════════
// OASES Service — Moderate API (Head Examiner, Sprint 5)
// ══════════════════════════════════════════════════════════════════
import oasesAxios from '../lib/axios';

export const moderateService = {
  /** List conflict sheets for an exam — HE view */
  listConflicts: (examId, params = {}) =>
    oasesAxios.get(`/moderate/conflicts/${examId}`, { params }).then((r) => r.data.data),

  /** Get full conflict sheet detail (sheet + scheme + both marks) */
  getConflictSheet: (sheetId) =>
    oasesAxios.get(`/moderate/sheet/${sheetId}`).then((r) => r.data.data),

  /** Submit HE final marks to resolve conflict */
  resolve: (sheetId, payload) =>
    oasesAxios.post(`/moderate/resolve/${sheetId}`, payload).then((r) => r.data.data),
};

export default moderateService;
