// ══════════════════════════════════════════════════════════════════
// OASES — Constants & Enums
// All values are centralised here. Import from this file everywhere.
// ══════════════════════════════════════════════════════════════════

const OASES_ROLES = {
  SUPER_ADMIN:   'SUPER_ADMIN',
  SCHOOL_ADMIN:  'SCHOOL_ADMIN',
  SCAN_OPERATOR: 'SCAN_OPERATOR',
  EVALUATOR:     'EVALUATOR',
  HEAD_EXAMINER: 'HEAD_EXAMINER',
  TEACHER:       'EVALUATOR',   // alias: ERP teachers are EVALUATOR role in OASES
};

const EXAM_TYPES = {
  THEORY:        'theory',
  MCQ:           'mcq',
  MIXED:         'mixed',
};

const SET_TYPES = {
  SINGLE: 'single',
  MULTI:  'multi',   // set A/B/C/D
};

const Q_TYPES = {
  SUBJECTIVE: 'subjective',
  MCQ:        'mcq',
  FILL:       'fill_in_blank',
  SHORT:      'short_answer',
};

const SECTIONS = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
};

const EVAL_ROUNDS = {
  ROUND_1: 1,
  ROUND_2: 2,
  HEAD:    3,  // head-examiner round
};

const SHEET_STATUS = {
  UPLOADED:    'uploaded',
  ASSIGNED:    'assigned',
  IN_PROGRESS: 'in_progress',
  EVAL1_DONE:  'eval1_done',
  EVAL2_DONE:  'eval2_done',
  CONFLICT:    'conflict',
  HEAD_REVIEW: 'head_review',
  LOCKED:      'locked',
  // Phase 5: teacher-submitted + admin-approved lifecycle
  SUBMITTED:   'submitted',   // teacher submitted, pending admin review
  APPROVED:    'approved',    // admin approved
  // side states
  REJECTED:    'rejected',
  UFM_FLAGGED: 'ufm_flagged',
};

const PROCESSING_STATUS = {
  PENDING:    'pending',
  PROCESSING: 'processing',
  DONE:       'done',
  FAILED:     'failed',
};

const NOTIFICATION_TYPES = {
  ASSIGNMENT:  'assignment',
  STATUS_CHANGE: 'status_change',
  CONFLICT:    'conflict',
  RESULT:      'result',
  SYSTEM:      'system',
};

const DAILY_EVAL_LIMIT_DEFAULT = 20;

const SIGNED_URL_EXPIRY_SECONDS = 900; // 15 min

module.exports = {
  OASES_ROLES,
  EXAM_TYPES,
  SET_TYPES,
  Q_TYPES,
  SECTIONS,
  EVAL_ROUNDS,
  SHEET_STATUS,
  PROCESSING_STATUS,
  NOTIFICATION_TYPES,
  DAILY_EVAL_LIMIT_DEFAULT,
  SIGNED_URL_EXPIRY_SECONDS,
};
