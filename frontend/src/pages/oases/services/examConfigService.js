// ══════════════════════════════════════════════════════════════════
// OASES — Exam Config API Service (Sprint 1 — full)
// ══════════════════════════════════════════════════════════════════
import oasesAxios from '../lib/axios';

export const examConfigService = {
  /** List with optional filters (status, academicYear, page, limit) */
  list: (filters = {}) =>
    oasesAxios.get('/exam-config', { params: filters }).then((r) => r.data.data),

  /** Single config by ID */
  get: (id) =>
    oasesAxios.get(`/exam-config/${id}`).then((r) => r.data.data),

  /** Create */
  create: (payload) =>
    oasesAxios.post('/exam-config', payload).then((r) => r.data.data),

  /** Update (blocked server-side if not draft) */
  update: (id, payload) =>
    oasesAxios.patch(`/exam-config/${id}`, payload).then((r) => r.data.data),

  /** Change status */
  updateStatus: (id, status) =>
    oasesAxios.patch(`/exam-config/${id}/status`, { status }).then((r) => r.data.data),

  /** Soft delete → archives */
  remove: (id) =>
    oasesAxios.delete(`/exam-config/${id}`).then((r) => r.data),

  /** Get question scheme for an exam config */
  getScheme: (examConfigId) =>
    oasesAxios.get(`/scheme/${examConfigId}`).then((r) => r.data.data),

  /** Save (create/replace) question scheme */
  saveScheme: (examConfigId, scheme) =>
    oasesAxios.post(`/scheme/${examConfigId}`, scheme).then((r) => r.data.data),

  /** Patch individual questions in scheme */
  patchScheme: (examConfigId, questions) =>
    oasesAxios.patch(`/scheme/${examConfigId}`, { questions }).then((r) => r.data.data),

  /** Upload MCQ answer key (pre-parsed from CSV) */
  uploadAnswerKey: (examConfigId, answerKey) =>
    oasesAxios.post(`/scheme/${examConfigId}/answer-key`, { answerKey }).then((r) => r.data.data),
};

export default examConfigService;
