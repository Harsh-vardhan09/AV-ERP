/**
 * The ONE place a marks document is turned into a displayable value.
 *
 * A Marks document has two shapes and the readers only ever knew one:
 *   OLD: { marksObtained: 55, marksType: 'theory' }
 *   NEW: { fields: { t1_pertest: 8, t1_theory: 72 }, marksType: 'fields' }
 *
 * Teacher uploads write the NEW shape (teacherController.uploadMarks:1016), but
 * getMyMarks / getMarks projected `marksObtained` — absent on those rows. React
 * renders undefined as nothing, so the Marks column came out BLANK while the
 * teacher name, max marks and date beside it rendered fine, and totals read
 * 0/200. The values were never lost; nothing translated them.
 *
 * Every reader goes through here so that cannot happen again.
 */

const { fieldRole, isComponent } = require('./marksFieldRoles');

/** `fields` is a Map on a hydrated doc and a plain object after .lean(). */
function toPlainFields(fields) {
  if (!fields) return {};
  if (fields instanceof Map) return Object.fromEntries(fields);
  return typeof fields === 'object' ? { ...fields } : {};
}

const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

/**
 * A component whose name says "total" is an auto-calculated sum of its siblings,
 * filled in by the marks-entry form. Adding it to the siblings double-counts.
 */
const isTotalKey = (k) => fieldRole(k) === 'total';

/**
 * The single number to show for one marks document.
 * @returns {number|null} null when nothing was ever entered
 */
function displayMarks(doc) {
  if (!doc) return null;
  if (isNum(doc.marksObtained)) return Number(doc.marksObtained);

  const f = toPlainFields(doc.fields);
  const entries = Object.entries(f).filter(([, v]) => isNum(v));
  if (!entries.length) return null;

  // SCORES only. A template legitimately carries Max Marks, Overall Percentage
  // and Overall Grade as 'marks' fields; adding those to the score made one
  // subject read 399.98 out of 100. See lib/marksFieldRoles.
  const components = entries.filter(([k]) => isComponent(k));
  if (components.length) {
    const sum = components.reduce((acc, [, v]) => acc + Number(v), 0);
    return Number(sum.toFixed(2));
  }

  // No scored component — fall back to a stored total, which is what a row that
  // only carries derived fields has to offer.
  const totals = entries.filter(([k]) => isTotalKey(k));
  if (!totals.length) return null;

  const sum = totals.reduce((acc, [, v]) => acc + Number(v), 0);
  // Marks on a screen must never carry float noise from summing.
  return Number(sum.toFixed(2));
}

/**
 * Attach the derived value to a document for the API response, and serialise the
 * Map so `fields` is not an empty object.
 *
 * m.toObject() without flattenMaps turns a Map into {} — so even a client that
 * knew to read `fields` found nothing there.
 */
function withDisplayMarks(doc) {
  const plain =
    typeof doc?.toObject === 'function' ? doc.toObject({ flattenMaps: true }) : { ...doc };
  plain.fields = toPlainFields(plain.fields);
  const value = displayMarks(plain);

  return {
    ...plain,
    // Back-fill the key every existing reader already projects, so a caller that
    // has not been updated still shows the right number.
    marksObtained: value,
    // Explicit provenance for anything that needs to tell them apart.
    marksSource: isNum(doc?.marksObtained) ? 'marksObtained' : value === null ? 'none' : 'fields',
  };
}

module.exports = { displayMarks, withDisplayMarks, toPlainFields, isTotalKey, isNum };
