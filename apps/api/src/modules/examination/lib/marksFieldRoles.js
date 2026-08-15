/**
 * What a template marks-field actually MEANS.
 *
 * TemplateFieldExtractor classifies a field as `category: 'marks'` by name, which
 * is right for "is this about marks?" and wrong for "is this a score?". A CBSE-ish
 * template legitimately contains:
 *
 *   Max Marks · Obtained Marks · Total Obtained · Total Marks ·
 *   Overall Percentage · Overall Grade
 *
 * Only ONE of those is a score. The rest are the denominator, an auto sum, or a
 * derived figure. Treating them all as components made a single subject worth
 * 100 + 100 + 100 + 99.98 = 399.98 and tripped the sum rule on a perfectly
 * ordinary entry.
 *
 * Roles:
 *   'capacity'   — a maximum, i.e. the denominator. Never summed, never scored.
 *   'total'      — an auto sum of its siblings. Display only.
 *   'percentage' — derived from totals. Read-only.
 *   'grade'      — derived from the percentage. Read-only, not a number.
 *   'component'  — an actual score a teacher types. THE ONLY summable role.
 */

// Order matters: 'max_marks' contains 'marks', 'total_marks' contains both.
const RULES = [
  [/grade/i, 'grade'],
  [/percent|pct/i, 'percentage'],
  [/\b(max|maximum)\b|^max[_-]|[_-]max$|max[_-]?marks/i, 'capacity'],
  [/total|grand[_-]?total|aggregate/i, 'total'],
];

/** @returns {'capacity'|'total'|'percentage'|'grade'|'component'} */
function fieldRole(key) {
  const k = String(key || '');
  for (const [re, role] of RULES) if (re.test(k)) return role;
  return 'component';
}

/** Only components are typed by a teacher and counted toward a subject total. */
const isComponent = (key) => fieldRole(key) === 'component';

/** Derived or structural — the UI fills these in and must not accept input. */
const isDerived = (key) => {
  const r = fieldRole(key);
  return r === 'total' || r === 'percentage' || r === 'grade';
};

/** A capacity field states a maximum; it is data about the exam, not a score. */
const isCapacity = (key) => fieldRole(key) === 'capacity';

/** Letter grade from a percentage — the same bands the report card uses. */
function gradeFor(pct) {
  if (!Number.isFinite(pct)) return '';
  if (pct >= 91) return 'A+';
  if (pct >= 81) return 'A';
  if (pct >= 71) return 'B+';
  if (pct >= 61) return 'B';
  if (pct >= 51) return 'C';
  if (pct >= 41) return 'D';
  return 'E';
}

/**
 * Fill in every derived field from the components a teacher typed.
 *
 * @param {object} fields raw field map from the form
 * @param {number} subjectTotal the configured maximum for the subject
 * @returns {object} a new map with total / percentage / grade recomputed
 */
function recomputeDerived(fields, subjectTotal) {
  const out = { ...fields };

  const components = Object.entries(out).filter(
    ([k, v]) =>
      isComponent(k) && v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v))
  );
  const obtained = components.reduce((s, [, v]) => s + Number(v), 0);

  // A capacity field the teacher filled in beats the configured total: a school
  // may run one subject out of 50 without reconfiguring the exam.
  const capacities = Object.entries(out).filter(
    ([k, v]) => isCapacity(k) && v !== '' && v !== null && Number.isFinite(Number(v))
  );
  const max = capacities.length
    ? capacities.reduce((s, [, v]) => s + Number(v), 0)
    : Number(subjectTotal) || 0;

  const pct = max > 0 ? Number(((obtained / max) * 100).toFixed(2)) : null;

  for (const key of Object.keys(out)) {
    const role = fieldRole(key);
    if (role === 'total') out[key] = components.length ? Number(obtained.toFixed(2)) : '';
    else if (role === 'percentage') out[key] = pct === null ? '' : pct;
    else if (role === 'grade') out[key] = pct === null ? '' : gradeFor(pct);
  }

  return out;
}

module.exports = {
  fieldRole,
  isComponent,
  isDerived,
  isCapacity,
  gradeFor,
  recomputeDerived,
};
