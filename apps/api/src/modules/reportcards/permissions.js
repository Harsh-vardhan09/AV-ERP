const ADMIN_ONLY        = ['admin'];
const ADMIN_TEACHER     = ['admin', 'teacher'];
const ADMIN_TEACHER_EXAM = ['admin', 'teacher', 'exam_controller'];
const ADMIN_TEACHER_STUDENT = ['admin', 'teacher', 'student'];
const STUDENT_ONLY      = ['student'];

const permissions = {
  // /api/v1/report-card
  'reportcards.cards.generate':     ADMIN_TEACHER,
  'reportcards.cards.finalize':     ADMIN_TEACHER,
  'reportcards.cards.unlock':       ADMIN_ONLY,
  'reportcards.cards.listByClass':  ADMIN_TEACHER_EXAM,
  'reportcards.cards.listExams':    ADMIN_TEACHER_STUDENT,
  'reportcards.cards.readiness':    ADMIN_TEACHER_EXAM,
  'reportcards.cards.view':         ADMIN_TEACHER_STUDENT,
  'reportcards.cards.update':       ADMIN_TEACHER,

  // /api/v1/dynamic-reports
  'reportcards.reports.generate':      ADMIN_TEACHER,
  'reportcards.reports.generateBulk':  ADMIN_TEACHER,
  'reportcards.reports.viewOwn':       STUDENT_ONLY,
  'reportcards.reports.downloadOwn':   STUDENT_ONLY,
  'reportcards.reports.preview':       ADMIN_TEACHER_STUDENT,
  'reportcards.reports.validate':      ADMIN_TEACHER,
  'reportcards.reports.stats':         ADMIN_ONLY,
  'reportcards.reports.list':          ADMIN_TEACHER,
  'reportcards.reports.download':      ADMIN_TEACHER_STUDENT,
  'reportcards.reports.delete':        ADMIN_ONLY,

  // /api/v1/report-templates — read and select only; authoring lives in tenancy
  // under /api/super-admin/templates/*
  'reportcards.templates.list':         ADMIN_TEACHER,
  'reportcards.templates.stats':        ADMIN_ONLY,
  'reportcards.templates.forClass':     ADMIN_TEACHER,
  'reportcards.templates.getSelection': ADMIN_TEACHER,
  'reportcards.templates.setSelection': ADMIN_ONLY,
  'reportcards.templates.view':         ADMIN_TEACHER,
  'reportcards.templates.fields':       ADMIN_TEACHER,
};

module.exports = permissions;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
module.exports.ADMIN_TEACHER = ADMIN_TEACHER;
module.exports.ADMIN_TEACHER_EXAM = ADMIN_TEACHER_EXAM;
module.exports.ADMIN_TEACHER_STUDENT = ADMIN_TEACHER_STUDENT;
module.exports.STUDENT_ONLY = STUDENT_ONLY;
