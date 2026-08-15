/**
 * The authoritative rule for what a marks value may be.
 *
 * WHERE maxMarks COMES FROM
 *   ExamSubjectConfig — one row per (examId, classId, subjectId, schoolId). NOT
 *   the Exam, which carries no marks fields at all. In priority order:
 *     1. marksDistribution[] — per-component maxima; the subject total is their SUM
 *     2. practicalMaxMarks / projectMaxMarks — for those legacy marksTypes
 *     3. maxMarks — the flat legacy total
 *     4. 100 — only when the subject was never configured for this exam
 *
 * WHY A SUM RULE EXISTS
 *   Per-component checking alone is not enough. When a component name matches no
 *   configured distribution entry, its cap falls back to the SUBJECT TOTAL — so
 *   four components of 90 each passed individually and stored a subject total of
 *   360/100. Components must also sum to no more than the subject total.
 *
 * Rejects; never clamps. Clamping stores a number the teacher did not type and
 * reports success, which hides the typo instead of surfacing it.
 */

const ExamSubjectConfig = require('../models/ExamSubjectConfig');
const { isTotalKey } = require('../lib/marksValue');

const DEFAULT_MAX = 100;

const isBlank = (v) => v === '' || v === null || v === undefined;

/**
 * Resolve the maxima that apply to one exam + class + subject.
 * @returns {Promise<{subjectTotal:number, componentMax:object, source:string, configured:boolean}>}
 */
async function resolveMaxima({ examId, classId, subjectId, schoolId, marksType = 'theory' }) {
  const config = await ExamSubjectConfig.findOne({ examId, classId, subjectId, schoolId }).lean();

  if (!config) {
    return {
      subjectTotal: DEFAULT_MAX,
      componentMax: {},
      source: 'default (subject not configured for this exam)',
      configured: false,
    };
  }

  const dist = Array.isArray(config.marksDistribution) ? config.marksDistribution : [];
  if (dist.length) {
    const componentMax = {};
    for (const d of dist) {
      if (d?.type) componentMax[String(d.type).toLowerCase()] = Number(d.maxMarks) || 0;
    }
    const total = dist.reduce((s, d) => s + (Number(d.maxMarks) || 0), 0);
    return {
      subjectTotal: total > 0 ? total : DEFAULT_MAX,
      componentMax,
      source: 'ExamSubjectConfig.marksDistribution',
      configured: true,
    };
  }

  const type = String(marksType || 'theory').toLowerCase();
  if (type === 'practical' && Number(config.practicalMaxMarks) > 0) {
    return {
      subjectTotal: Number(config.practicalMaxMarks),
      componentMax: {},
      source: 'ExamSubjectConfig.practicalMaxMarks',
      configured: true,
    };
  }
  if (type === 'project' && Number(config.projectMaxMarks) > 0) {
    return {
      subjectTotal: Number(config.projectMaxMarks),
      componentMax: {},
      source: 'ExamSubjectConfig.projectMaxMarks',
      configured: true,
    };
  }

  const flat = Number(config.maxMarks);
  return {
    subjectTotal: Number.isFinite(flat) && flat > 0 ? flat : DEFAULT_MAX,
    componentMax: {},
    source: 'ExamSubjectConfig.maxMarks',
    configured: true,
  };
}

/** A component's own ceiling. Unconfigured components are bounded by the subject total. */
function componentCap(key, maxima) {
  const lower = String(key).toLowerCase();
  if (maxima.componentMax[lower] !== undefined) return maxima.componentMax[lower];
  const bare = lower.replace(/^t[12]_/, '');
  if (maxima.componentMax[bare] !== undefined) return maxima.componentMax[bare];
  return maxima.subjectTotal;
}

/**
 * Validate ONE student's entry, in either write shape.
 * @returns {{ errors: string[], value: number|null, fields: object|null }}
 */
function validateEntry({ entry, maxima, label = 'Student', subjectName = '' }) {
  const errors = [];
  const subj = subjectName ? `${subjectName} — ` : '';
  const max = maxima.subjectTotal;

  // ── Component shape ──
  if (entry.fields && typeof entry.fields === 'object') {
    const usable = Object.entries(entry.fields).filter(([, v]) => !isBlank(v));
    if (!usable.length) {
      return { errors: [`${label}: ${subj}no marks entered`], value: null, fields: null };
    }

    const clean = {};
    for (const [key, raw] of usable) {
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        errors.push(`${label}: ${subj}${key} — "${raw}" is not a number`);
        continue;
      }
      if (num < 0) {
        errors.push(`${label}: ${subj}${key} — ${num} is negative`);
        continue;
      }
      const cap = componentCap(key, maxima);
      if (Number.isFinite(cap) && num > cap) {
        errors.push(`${label}: ${subj}${key} — ${num} exceeds the maximum of ${cap}`);
        continue;
      }
      clean[key] = num;
    }

    // The sum rule. Auto-calculated *total* components are display-only sums of
    // their siblings; counting them here would double the subject total.
    const components = Object.entries(clean).filter(([k]) => !isTotalKey(k));
    const sum = components.reduce((s, [, v]) => s + v, 0);
    if (components.length && sum > max) {
      errors.push(
        `${label}: ${subj}the components add up to ${sum}, which is more than the ` +
          `subject total of ${max} (${components.map(([k, v]) => `${k} ${v}`).join(', ')})`
      );
    }

    // A stored total must also be within the subject total.
    for (const [k, v] of Object.entries(clean)) {
      if (isTotalKey(k) && v > max) {
        errors.push(`${label}: ${subj}${k} — ${v} exceeds the subject total of ${max}`);
      }
    }

    return { errors, value: errors.length ? null : sum, fields: errors.length ? null : clean };
  }

  // ── Legacy single-value shape ──
  if (isBlank(entry.marksObtained)) {
    return { errors: [`${label}: ${subj}no marks entered`], value: null, fields: null };
  }
  const num = Number(entry.marksObtained);
  if (!Number.isFinite(num)) {
    errors.push(`${label}: ${subj}"${entry.marksObtained}" is not a number`);
  } else if (num < 0) {
    errors.push(`${label}: ${subj}${num} is negative`);
  } else if (num > max) {
    errors.push(`${label}: ${subj}${num} exceeds the maximum of ${max}`);
  }

  return { errors, value: errors.length ? null : num, fields: null };
}

/**
 * Validate a whole batch. Returns every problem rather than the first, so a
 * teacher fixes one screen instead of resubmitting repeatedly.
 *
 * @returns {{ ok: boolean, errors: string[], entries: Array }}
 */
function validateBatch({ marks, maxima, nameOf = () => 'Student', subjectName = '' }) {
  const errors = [];
  const entries = [];

  for (const entry of Array.isArray(marks) ? marks : []) {
    if (!entry || !entry.studentId) {
      errors.push('An entry is missing its studentId');
      continue;
    }
    const result = validateEntry({
      entry,
      maxima,
      label: nameOf(entry.studentId),
      subjectName,
    });
    if (result.errors.length) errors.push(...result.errors);
    else entries.push({ ...entry, _value: result.value, _fields: result.fields });
  }

  return { ok: errors.length === 0, errors, entries };
}

module.exports = { resolveMaxima, validateEntry, validateBatch, componentCap, DEFAULT_MAX };
