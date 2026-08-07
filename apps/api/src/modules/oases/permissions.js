// OASES roles live on user.oasesRole, not user.role, and are enforced by
// middlewares/role.js — not the ERP authorizeRoles. Names below are the
// OASES_ROLES values from lib/constants.js.
const ADMIN            = ['SCHOOL_ADMIN'];
const ADMIN_SUPER      = ['SCHOOL_ADMIN', 'SUPER_ADMIN'];
const ADMIN_SCAN       = ['SCHOOL_ADMIN', 'SCAN_OPERATOR'];
const ADMIN_HEAD       = ['SCHOOL_ADMIN', 'HEAD_EXAMINER'];
const HEAD             = ['HEAD_EXAMINER'];
const EVAL_HEAD_ADMIN  = ['EVALUATOR', 'HEAD_EXAMINER', 'SCHOOL_ADMIN'];
const EVAL_HEAD_ADMIN_TEACHER = ['EVALUATOR', 'HEAD_EXAMINER', 'SCHOOL_ADMIN', 'TEACHER'];
const ADMIN_EVAL_HEAD  = ['SCHOOL_ADMIN', 'EVALUATOR', 'HEAD_EXAMINER'];
const ANY_OASES_USER   = [];  // oasesAuth only, no role check

const permissions = {
  // routes/index.js
  'oases.health': ANY_OASES_USER,

  // /auth — oasesAuth only
  'oases.auth.me':     ANY_OASES_USER,
  'oases.auth.logout': ANY_OASES_USER,

  // /scheme
  'oases.scheme.create':       ADMIN,
  'oases.scheme.view':         ADMIN,
  'oases.scheme.update':       ADMIN,
  'oases.scheme.setAnswerKey': ADMIN,

  // /exam-config
  'oases.examConfig.create':       ADMIN,
  'oases.examConfig.list':         ADMIN,
  'oases.examConfig.view':         ADMIN,
  'oases.examConfig.update':       ADMIN,
  'oases.examConfig.updateStatus': ADMIN,
  'oases.examConfig.delete':       ADMIN,

  // /upload
  'oases.upload.listAll':     ADMIN,
  'oases.upload.listChecked': ADMIN,
  'oases.upload.uploadSheets': ADMIN_SCAN,
  'oases.upload.listSheets':   ADMIN_SCAN,
  'oases.upload.reprocess':    ADMIN,
  'oases.upload.pageUrl':      ADMIN_EVAL_HEAD,
  'oases.upload.reject':       ADMIN,
  'oases.upload.flagUfm':      ADMIN,

  // /evaluation
  'oases.evaluation.queue':          EVAL_HEAD_ADMIN,
  'oases.evaluation.getSheet':       EVAL_HEAD_ADMIN_TEACHER,
  'oases.evaluation.pageUrl':        EVAL_HEAD_ADMIN_TEACHER,
  'oases.evaluation.getDraft':       EVAL_HEAD_ADMIN_TEACHER,
  'oases.evaluation.saveMark':       EVAL_HEAD_ADMIN,
  'oases.evaluation.saveDraft':      EVAL_HEAD_ADMIN,
  'oases.evaluation.updateDraft':    EVAL_HEAD_ADMIN,
  'oases.evaluation.markPageReviewed': EVAL_HEAD_ADMIN,
  'oases.evaluation.flagUfm':        EVAL_HEAD_ADMIN,
  'oases.evaluation.rejectSheet':    EVAL_HEAD_ADMIN,
  'oases.evaluation.submitMarks':    EVAL_HEAD_ADMIN,
  'oases.evaluation.approveSheet':   ADMIN_SUPER,
  'oases.evaluation.overrideMarks':  ADMIN_SUPER,

  // /assignment
  'oases.assignment.assignSheet':      ADMIN,
  'oases.assignment.bulkAssign':       ADMIN,
  'oases.assignment.assign':           ADMIN,
  'oases.assignment.list':             ADMIN,
  'oases.assignment.listEvaluators':   ADMIN,
  'oases.assignment.autoAssign':       ADMIN,
  'oases.assignment.listUnassigned':   ADMIN,

  // /conflict
  'oases.conflict.list':        ADMIN_HEAD,
  'oases.conflict.detail':      ADMIN_HEAD,
  'oases.conflict.routeToHead': ADMIN,
  'oases.conflict.resolve':     HEAD,

  // /result
  'oases.result.generate': ADMIN_HEAD,
  'oases.result.list':     ADMIN_HEAD,
  'oases.result.publish':  ADMIN,

  // /audit
  'oases.audit.list':      ADMIN,
  'oases.audit.byEntity':  ADMIN,

  // /moderate
  'oases.moderate.listConflicts': HEAD,
  'oases.moderate.getSheet':      HEAD,
  'oases.moderate.resolve':       HEAD,

  // /report
  'oases.report.generate':             ADMIN,
  'oases.report.publish':              ADMIN,
  'oases.report.examSummary':          ADMIN_HEAD,
  'oases.report.listResults':          ADMIN_HEAD,
  'oases.report.studentResult':        ADMIN,
  'oases.report.evaluatorRemuneration': ADMIN,
  'oases.report.evaluatorStats':       ADMIN,
};

module.exports = permissions;
module.exports.ADMIN = ADMIN;
module.exports.ADMIN_HEAD = ADMIN_HEAD;
module.exports.HEAD = HEAD;
module.exports.EVAL_HEAD_ADMIN = EVAL_HEAD_ADMIN;
