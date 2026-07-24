// ══════════════════════════════════════════════════════════════════
// OASES Service — Sheet & Evaluation API (Sprint 3 — full)
// ══════════════════════════════════════════════════════════════════
import oasesAxios from '../lib/axios';

export const sheetService = {
  /** Upload sheets (multipart) */
  upload: (examConfigId, formData) =>
    oasesAxios.post(`/upload/${examConfigId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),

  /** List sheets for an exam config */
  list: (examConfigId, params = {}) =>
    oasesAxios.get(`/upload/${examConfigId}`, { params }).then((r) => r.data.data),

  /** Get unassigned sheets */
  listUnassigned: (examConfigId) =>
    oasesAxios.get(`/assignment/unassigned/${examConfigId}`).then((r) => r.data.data),

  /** Reject a sheet */
  reject: (sheetId, reason) =>
    oasesAxios.patch(`/upload/${sheetId}/reject`, { reason }).then((r) => r.data),

  /** Flag a sheet for UFM */
  flagUfm: (sheetId, note) =>
    oasesAxios.patch(`/upload/${sheetId}/flag-ufm`, { note }).then((r) => r.data),
};

export const evalService = {
  /** Get evaluator's queue */
  getQueue: (params = {}) =>
    oasesAxios.get('/evaluation/queue', { params }).then((r) => r.data.data),

  /** Fetch combined sheet data for evaluation (sheet + scheme + draft + pageUrls) */
  getSheetData: (sheetId) =>
    oasesAxios.get(`/evaluation/sheet/${sheetId}`).then((r) => r.data.data),

  /** Get saved draft marks */
  getDraft: (sheetId) =>
    oasesAxios.get(`/evaluation/draft/${sheetId}`).then((r) => r.data.data),

  /** Save single question mark (optimistic) */
  saveMark: (payload) =>
    oasesAxios.post('/evaluation/mark', payload).then((r) => r.data.data),

  /** Save draft (auto-save) */
  saveDraft: (sheetId, payload) =>
    oasesAxios.post(`/evaluation/draft/${sheetId}`, payload).then((r) => r.data.data),

  /** Sync save draft (for unmount/beforeunload) */
  saveDraftSync: (sheetId, payload) => {
    const url = `${oasesAxios.defaults.baseURL}/evaluation/draft/${sheetId}`;
    try {
      navigator.sendBeacon(url, JSON.stringify(payload));
    } catch {
      // Fallback: best-effort sync XHR
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false); // sync
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
      } catch { /* swallow */ }
    }
  },

  /** Get signed URL for single page */
  getPageUrl: (sheetId, pageNo) =>
    oasesAxios.get(`/evaluation/page/${sheetId}/${pageNo}`).then((r) => r.data.data),

  /** Mark page as reviewed */
  markPageReviewed: (sheetId, pageNo) =>
    oasesAxios.post(`/evaluation/page-reviewed/${sheetId}/${pageNo}`).then((r) => r.data.data),

  /** Flag UFM from evaluator */
  flagUfmEval: (sheetId, note) =>
    oasesAxios.post(`/evaluation/ufm/${sheetId}`, { note }).then((r) => r.data),

  /** Reject script from evaluator */
  rejectEval: (sheetId, reason) =>
    oasesAxios.post(`/evaluation/reject/${sheetId}`, { reason }).then((r) => r.data),

  /** Submit final marks */
  submitMarks: (sheetId, payload) =>
    oasesAxios.post(`/evaluation/submit/${sheetId}`, payload).then((r) => r.data.data),

  /** Phase 5: Admin approves a submitted sheet */
  approveSheet: (sheetId) =>
    oasesAxios.post(`/evaluation/approve/${sheetId}`).then((r) => r.data.data),

  /** Phase 5: Admin overrides teacher marks */
  overrideMarks: (sheetId, payload) =>
    oasesAxios.post(`/evaluation/override/${sheetId}`, payload).then((r) => r.data.data),

  // ── Legacy compat (kept for Sprint 0 SheetViewer) ──────────────
  getSheet: (sheetId) =>
    oasesAxios.get(`/evaluation/sheet/${sheetId}`).then((r) => r.data.data),
};
