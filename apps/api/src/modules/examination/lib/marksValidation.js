/**
 * marksValidation.js
 * ==================
 * Single source of truth for maximum marks limits in the Report Card module.
 *
 * Rules:
 *   FA slots  (fa1_1, fa1_2, fa2_1, fa2_2, fa3_1, fa3_2, fa4_1, fa4_2) → max 10
 *   SA slots  (sa1, sa2)                                                  → max 80
 *   Co-scholastic per skill per term                                       → max 10
 */

'use strict';

// ── Slot → max marks map ─────────────────────────────────────────────────────
const SLOT_MAX = {
  fa1_1: 10,
  fa1_2: 10,
  fa2_1: 10,
  fa2_2: 10,
  sa1: 80,
  fa3_1: 10,
  fa3_2: 10,
  fa4_1: 10,
  fa4_2: 10,
  sa2: 80,
};

const CO_SCHOLASTIC_MAX = 10; // each skill per term is out of 10

/**
 * Validate a single mark value against its maximum.
 *
 * @param {*}      value  Raw value from client (may be string/number/null/undefined)
 * @param {number} max    Maximum allowed value (inclusive)
 * @returns {{ valid: boolean, parsed: number|null, error: string|null }}
 */
function validateMark(value, max) {
  // Allow empty / null → no mark entered, that's fine
  if (value === '' || value === null || value === undefined) {
    return { valid: true, parsed: null, error: null };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return { valid: false, parsed: null, error: `Marks must be a valid number (got "${value}")` };
  }

  if (parsed < 0) {
    return { valid: false, parsed, error: `Marks cannot be negative (got ${parsed})` };
  }

  if (parsed > max) {
    return { valid: false, parsed, error: `Marks cannot exceed ${max} (got ${parsed})` };
  }

  return { valid: true, parsed, error: null };
}

/**
 * Validate all slot fields of a single scholastic marks row.
 *
 * @param {object} rowInput   Object that may contain slot keys
 * @param {string} subject    Subject name (for error messages)
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateScholasticRow(rowInput, subject = 'Unknown Subject') {
  const errors = [];

  for (const [slot, max] of Object.entries(SLOT_MAX)) {
    if (!Object.prototype.hasOwnProperty.call(rowInput, slot)) continue;

    const { valid, error } = validateMark(rowInput[slot], max);
    if (!valid) {
      errors.push(`[${subject}] ${slot.toUpperCase()}: ${error}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all co-scholastic rows.
 *
 * @param {object} rowInput   Object that may contain term1Marks / term2Marks
 * @param {string} skillName  Skill name (for error messages)
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCoScholasticRow(rowInput, skillName = 'Unknown Skill') {
  const errors = [];

  for (const field of ['term1Marks', 'term2Marks']) {
    if (!Object.prototype.hasOwnProperty.call(rowInput, field)) continue;

    const { valid, error } = validateMark(rowInput[field], CO_SCHOLASTIC_MAX);
    if (!valid) {
      const label = field === 'term1Marks' ? 'Term-I' : 'Term-II';
      errors.push(`[${skillName}] ${label}: ${error}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate ALL marks and co-scholastic rows from a request body.
 * Returns an array of all error strings found.
 *
 * @param {object[]} marks         Array of scholastic mark row inputs
 * @param {object[]} coScholastic  Array of co-scholastic row inputs
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAllMarks(marks = [], coScholastic = []) {
  const allErrors = [];

  for (const rowInput of marks) {
    const label = rowInput.subject || String(rowInput._id || 'row');
    const { errors } = validateScholasticRow(rowInput, label);
    allErrors.push(...errors);
  }

  for (const rowInput of coScholastic) {
    const label = rowInput.skillName || String(rowInput._id || 'skill');
    const { errors } = validateCoScholasticRow(rowInput, label);
    allErrors.push(...errors);
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}

/**
 * Clamp a mark to [0, max]; empty → null. Non-finite → null (caller may treat as error).
 */
function clampMarkToSlot(value, max) {
  if (value === '' || value === null || value === undefined) {
    return { ok: true, value: null };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { ok: false, value: null, error: 'Must be a valid number' };
  }
  if (parsed < 0) {
    return { ok: true, value: 0 };
  }
  if (parsed > max) {
    return { ok: true, value: max };
  }
  return { ok: true, value: parsed };
}

/**
 * Sanitize scholastic rows for persistence: clamp FA to 10, SA to 80.
 * Collects errors only for non-numeric garbage (not for over-max — those are clamped).
 */
function sanitizeScholasticRows(marks = []) {
  const errors = [];
  const rows = marks.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const next = { ...row };
    for (const [slot, max] of Object.entries(SLOT_MAX)) {
      if (!Object.prototype.hasOwnProperty.call(next, slot)) continue;
      const { ok, value, error } = clampMarkToSlot(next[slot], max);
      if (!ok) {
        errors.push(`[${row.subject || row._id || 'Subject'}] ${slot.toUpperCase()}: ${error}`);
        continue;
      }
      next[slot] = value;
    }
    return next;
  });
  return { rows, errors };
}

/**
 * Sanitize co-scholastic rows (max 10 per term per skill).
 */
function sanitizeCoScholasticRows(coScholastic = []) {
  const errors = [];
  const rows = coScholastic.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const next = { ...row };
    for (const field of ['term1Marks', 'term2Marks']) {
      if (!Object.prototype.hasOwnProperty.call(next, field)) continue;
      const { ok, value, error } = clampMarkToSlot(next[field], CO_SCHOLASTIC_MAX);
      if (!ok) {
        errors.push(`[${row.skillName || row._id || 'Skill'}] ${field}: ${error}`);
        continue;
      }
      next[field] = value;
    }
    return next;
  });
  return { rows, errors };
}

/**
 * Sanitize dynamic marks rows (new exam-driven system).
 *
 * @param {object[]} marksRows  Array of { _id, subject, dynamicMarks: { [examId]: value } }
 * @param {object}   examMaxMap  Map of { [examId]: maxMarks } fetched from ExamSubjectConfig
 * @returns {{ rows: object[], errors: string[] }}
 */
function sanitizeDynamicMarks(marksRows = [], examMaxMap = {}) {
  const errors = [];
  const rows = marksRows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const next = { ...row };

    if (!next.dynamicMarks || typeof next.dynamicMarks !== 'object') {
      return next;
    }

    const sanitized = {};
    for (const [examId, value] of Object.entries(next.dynamicMarks)) {
      const max = examMaxMap[examId] !== undefined ? examMaxMap[examId] : 100;
      const { ok, value: clamped, error } = clampMarkToSlot(value, max);
      if (!ok) {
        errors.push(`[${row.subject || row._id || 'Subject'}] Exam ${examId}: ${error}`);
        sanitized[examId] = null;
      } else {
        sanitized[examId] = clamped;
      }
    }
    next.dynamicMarks = sanitized;
    return next;
  });
  return { rows, errors };
}

module.exports = {
  SLOT_MAX,
  CO_SCHOLASTIC_MAX,
  validateMark,
  validateScholasticRow,
  validateCoScholasticRow,
  validateAllMarks,
  clampMarkToSlot,
  sanitizeScholasticRows,
  sanitizeCoScholasticRows,
  sanitizeDynamicMarks,
};
