// ══════════════════════════════════════════════════════════════════
// OASES Service — Report API (Sprint 6)
// ══════════════════════════════════════════════════════════════════
import oasesAxios from '../lib/axios';

export const reportService = {
  /** Generate grades + ranks for all locked sheets of an exam */
  generate: (examId) => oasesAxios.post(`/report/generate/${examId}`).then((r) => r.data.data),

  /** Publish: decrypt rollNo, link student, set isPublished */
  publish: (examId) => oasesAxios.post(`/report/publish/${examId}`).then((r) => r.data.data),

  /** Summary stats + all chart datasets */
  getExamSummary: (examId) => oasesAxios.get(`/report/exam/${examId}`).then((r) => r.data.data),

  /** Paginated results table — supports useInfiniteQuery */
  listResults: (examId, page = 1, search = '') =>
    oasesAxios
      .get(`/report/results/${examId}`, { params: { page, limit: 50, search } })
      .then((r) => r.data.data),

  /** Individual student result (post-publish) */
  getStudentResult: (examId, rollNo) =>
    oasesAxios.get(`/report/student/${examId}/${rollNo}`).then((r) => r.data.data),

  /** Evaluator performance stats */
  getEvaluatorStats: (examId) =>
    oasesAxios.get(`/report/evaluator/${examId}`).then((r) => r.data.data),

  /** Evaluator remuneration */
  getRemuneration: (examId) =>
    oasesAxios.get(`/report/evaluator/remuneration/${examId}`).then((r) => r.data.data),

  /** Download individual result PDF (blob) */
  downloadPDF: (sheetId) =>
    oasesAxios.get(`/report/sheet/${sheetId}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};

export default reportService;
