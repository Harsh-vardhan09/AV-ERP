// ══════════════════════════════════════════════════════════════════
// OASES — OASES Role Constants (frontend mirror of backend enums)
// Keep in sync with backend/src/utils/oasesConstants.js
// ══════════════════════════════════════════════════════════════════
export const OASES_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  SCAN_OPERATOR: 'SCAN_OPERATOR',
  EVALUATOR: 'EVALUATOR',
  HEAD_EXAMINER: 'HEAD_EXAMINER',
};

export const SHEET_STATUS = {
  UPLOADED: 'uploaded',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  EVAL1_DONE: 'eval1_done',
  EVAL2_DONE: 'eval2_done',
  CONFLICT: 'conflict',
  HEAD_REVIEW: 'head_review',
  LOCKED: 'locked',
  // Phase 5: teacher submit → admin approve lifecycle
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  UFM_FLAGGED: 'ufm_flagged',
};

export const SHEET_STATUS_LABELS = {
  uploaded: 'Uploaded',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  eval1_done: 'Eval 1 Done',
  eval2_done: 'Eval 2 Done',
  conflict: 'Conflict',
  head_review: 'Head Review',
  locked: '🔒 Locked',
  submitted: '📤 Submitted',
  approved: '✅ Approved',
  rejected: 'Rejected',
  ufm_flagged: '⚠️ UFM Flagged',
};

export const SHEET_STATUS_COLORS = {
  uploaded: 'bg-gray-100 text-gray-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  eval1_done: 'bg-indigo-100 text-indigo-700',
  eval2_done: 'bg-purple-100 text-purple-700',
  conflict: 'bg-red-100 text-red-700',
  head_review: 'bg-orange-100 text-orange-700',
  locked: 'bg-green-100 text-green-700',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-200 text-red-800',
  ufm_flagged: 'bg-amber-100 text-amber-700',
};

export const EXAM_TYPES = {
  THEORY: 'theory',
  MCQ: 'mcq',
  MIXED: 'mixed',
};

export const EVAL_ROUNDS = { ROUND_1: 1, ROUND_2: 2, HEAD: 3 };
