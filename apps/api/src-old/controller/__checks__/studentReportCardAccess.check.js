/**
 * Access-control guard for the student self-service report card.
 * Run: node src/controller/__checks__/studentReportCardAccess.check.js
 *
 * The invariant: the student is resolved from the auth token and nothing else.
 * These assertions fail loudly if someone later wires a client-supplied id into
 * that path — the exact change that would turn this into an IDOR.
 *
 * Source-level rather than runtime because the property being protected is
 * "this input never reaches the lookup", which no amount of fixture data proves.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../dynamicReportController.js'),
  'utf8'
);

/** Extract a top-level function/handler body by name. */
function bodyOf(name) {
  const start = SRC.indexOf(name);
  assert(start !== -1, `${name} not found — was it renamed?`);
  // Read to the next top-level declaration, or EOF.
  const rest = SRC.slice(start);
  const next = rest.slice(1).search(/\n(?:exports\.|async function |const _|\/\/ ═)/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

const builder  = bodyOf('async function _buildOwnReportCard');
const getter   = bodyOf('exports.getMyReportCard');
const download = bodyOf('exports.downloadMyReportCard');

// 1. The student lookup is keyed on the token's user id
assert(
  /StudentProfile\.findOne\(\{\s*userId:\s*req\.user\._id,\s*schoolId\s*\}/.test(builder),
  'student must be looked up by req.user._id + schoolId'
);

// 2. No client-supplied identity reaches the student-facing path
for (const [name, body] of [['_buildOwnReportCard', builder], ['getMyReportCard', getter], ['downloadMyReportCard', download]]) {
  assert(!/req\.params/.test(body), `${name} must not read req.params`);
  assert(!/req\.body/.test(body),   `${name} must not read req.body`);
  assert(!/studentId:\s*req\./.test(body), `${name} must not take studentId from the request`);
}

// 3. Only examId and session are accepted from the query string
const queryKeys = [...builder.matchAll(/req\.query\.(\w+)/g)].map(m => m[1]);
assert(queryKeys.length > 0, 'expected some query params');
queryKeys.forEach(k =>
  assert(['examId', 'session'].includes(k), `unexpected query param "${k}" in the student path`)
);

// 4. Every lookup in the builder is school-scoped
const findCalls = [...builder.matchAll(/\.(?:findOne|find)\(\{[^}]*\}/g)].map(m => m[0]);
assert(findCalls.length >= 3, 'expected several scoped lookups');
findCalls.forEach(call =>
  assert(/schoolId/.test(call), `unscoped query found: ${call.slice(0, 70)}…`)
);

// 5. The exam filter is pinned to the student's own class
assert(
  /examFilter\s*=\s*\{\s*classIds:\s*classId,\s*session:\s*session\._id,\s*schoolId\s*\}/.test(builder),
  'exam lookup must be scoped to the student class + session + school'
);

// 6. The download endpoint refuses to emit a PDF unless published
assert(
  /if\s*\(!result\.published\)/.test(download),
  'download must gate on result.published'
);
assert(
  download.indexOf('if (!result.published)') < download.indexOf('PDFService.generatePDF'),
  'the published gate must run before the PDF is generated'
);

// 7. The legacy preview route enforces ownership for students
const preview = bodyOf('exports.previewReport');
assert(
  /req\.user\.role === 'student'/.test(preview) && /String\(own\._id\) !== String\(studentId\)/.test(preview),
  'previewReport must reject a student requesting another student id'
);

console.log('studentReportCardAccess.check.js — all assertions passed');
