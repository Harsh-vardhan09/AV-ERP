// ══════════════════════════════════════════════════════════════════
// OASES — Upload API Service (Sprint 2)
// ══════════════════════════════════════════════════════════════════
import oasesAxios from '../lib/axios';

export const uploadService = {
  /**
   * Upload 1-30 PDF sheets for an exam config.
   * @param {string}   examConfigId
   * @param {FormData} formData   — field name 'sheets' (multiple files)
   * @param {function} onProgress — (percent: number) => void
   */
  uploadSheets: (examConfigId, formData, onProgress) =>
    oasesAxios.post(`/upload/${examConfigId}`, formData, {
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
      timeout: 5 * 60 * 1000, // 5 min for large batches
    }).then((r) => r.data.data),

  /** List sheets for an exam config with optional filters */
  listSheets: (examConfigId, filters = {}) =>
    oasesAxios.get(`/upload/${examConfigId}`, { params: filters }).then((r) => r.data.data),

  /** Admin: all sheets across exams, with filters */
  listAllSheets: (filters = {}) =>
    oasesAxios.get('/upload/all', { params: filters }).then((r) => r.data.data),

  /** Admin: checked copies (eval1_done, submitted, approved, locked) */
  listCheckedSheets: (filters = {}) =>
    oasesAxios.get('/upload/checked', { params: filters }).then((r) => r.data.data),

  /** Reprocess a failed sheet */
  reprocess: (sheetId) =>
    oasesAxios.get(`/upload/${sheetId}/reprocess`).then((r) => r.data.data),

  /** Get signed URL for a specific page */
  getPageUrl: (sheetId, pageNo) =>
    oasesAxios.get(`/upload/${sheetId}/page/${pageNo}`).then((r) => r.data.data),

  /** Reject a sheet */
  reject: (sheetId, reason) =>
    oasesAxios.patch(`/upload/${sheetId}/reject`, { reason }).then((r) => r.data),

  /** Flag sheet for UFM */
  flagUfm: (sheetId, note) =>
    oasesAxios.patch(`/upload/${sheetId}/flag-ufm`, { note }).then((r) => r.data),
};

export const assignmentService = {
  /** Get all evaluators for an exam config */
  getEvaluators: (schoolId) =>
    oasesAxios.get('/assignment', { params: { schoolId } }).then((r) => r.data.data),

  /** Assign single sheet to evaluator */
  assignSingle: (sheetId, payload) =>
    oasesAxios.post(`/assignment/sheet/${sheetId}`, payload).then((r) => r.data.data),

  /** Bulk assign — round-robin or random */
  bulkAssign: (examId, payload) =>
    oasesAxios.post(`/assignment/bulk/${examId}`, payload).then((r) => r.data.data),

  /** Get unassigned sheets for an exam */
  getUnassigned: (examConfigId) =>
    oasesAxios.get(`/assignment/unassigned/${examConfigId}`).then((r) => r.data.data),

  /** List all assignment records */
  listAssignments: (filters = {}) =>
    oasesAxios.get('/assignment', { params: filters }).then((r) => r.data.data),
};

export default uploadService;
