// Transcribed from routes/examControllerRoutes.js as-is: that router applies a single
// router-level authorize('exam_controller'), so every key carries the same role.
// Nothing reads this map yet — the route file still does the enforcing.
const EXAM_CONTROLLER_ONLY = ['exam_controller'];

const permissions = {
  'examination.sessions.viewActive': EXAM_CONTROLLER_ONLY,
  'examination.sessions.list': EXAM_CONTROLLER_ONLY,

  'examination.classes.list': EXAM_CONTROLLER_ONLY,
  'examination.sections.list': EXAM_CONTROLLER_ONLY,

  'examination.examSubjects.listByExam': EXAM_CONTROLLER_ONLY,
  'examination.reportTemplates.list': EXAM_CONTROLLER_ONLY,
  'examination.marksAuditLog.list': EXAM_CONTROLLER_ONLY,

  'examination.exams.create': EXAM_CONTROLLER_ONLY,
  'examination.exams.list': EXAM_CONTROLLER_ONLY,
  'examination.exams.view': EXAM_CONTROLLER_ONLY,
  'examination.exams.update': EXAM_CONTROLLER_ONLY,
  'examination.exams.delete': EXAM_CONTROLLER_ONLY,
  'examination.exams.startEvaluation': EXAM_CONTROLLER_ONLY,
  'examination.exams.completeEvaluation': EXAM_CONTROLLER_ONLY,
  'examination.exams.linkTemplate': EXAM_CONTROLLER_ONLY,

  'examination.examSubjects.create': EXAM_CONTROLLER_ONLY,
  'examination.examSubjects.update': EXAM_CONTROLLER_ONLY,
  'examination.examSubjects.remove': EXAM_CONTROLLER_ONLY,

  'examination.marks.studentsForMarks': EXAM_CONTROLLER_ONLY,
  'examination.marks.myExams': EXAM_CONTROLLER_ONLY,
  'examination.marks.template': EXAM_CONTROLLER_ONLY,
  'examination.marks.upload': EXAM_CONTROLLER_ONLY,
  'examination.marks.uploadExcel': EXAM_CONTROLLER_ONLY,
  'examination.marks.list': EXAM_CONTROLLER_ONLY,
};

module.exports = permissions;
module.exports.EXAM_CONTROLLER_ONLY = EXAM_CONTROLLER_ONLY;
