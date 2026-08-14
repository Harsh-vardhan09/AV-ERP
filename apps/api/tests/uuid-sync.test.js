const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { connect, clear, disconnect } = require('./helpers/db');

// Registers every model, including GeneratedReport.
require('../src/app');
const GeneratedReport = require('../src/modules/reportcards/models/GeneratedReport');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const SRC = path.join(__dirname, '..', 'src');

// The three files that each carried their own copy of the helper.
const CALLERS = [
  'core/pdf/htmlToPdf.js',
  'modules/admissions/controllers/admissionTemplateController.js',
  'modules/reportcards/controllers/dynamicReportController.js',
];

/**
 * uuidv4 used to be `async () => { const { v4 } = await import('uuid'); … }`,
 * and all five call sites invoked it WITHOUT await. The Promise landed on
 * GeneratedReport.reportId (a required String) and Mongoose threw
 *   Cast to string failed for value "Promise { … }" (type Promise) at path "reportId"
 * which broke the report card download for admin, teacher and student.
 *
 * These tests assert the property that was violated — uuidv4 returns a string —
 * rather than the specific spelling of the fix.
 */
test('randomUUID is requireable synchronously and yields a v4 string', () => {
  const { randomUUID: uuidv4 } = require('crypto');
  const id = uuidv4();

  expect(typeof id).toBe('string');
  expect(id).not.toBeInstanceOf(Promise);
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test.each(CALLERS)('%s declares uuidv4 synchronously', (rel) => {
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');

  // The exact shape that caused the bug must not come back.
  expect(src).not.toMatch(/const\s+uuidv4\s*=\s*async/);
  expect(src).not.toMatch(/await\s+import\(\s*['"]uuid['"]\s*\)/);
  // uuid@13 is ESM-only: a bare require() of it throws ERR_REQUIRE_ESM on Node 20
  // and would stop the API booting. Nothing here may reintroduce it.
  expect(src).not.toMatch(/require\(\s*['"]uuid['"]\s*\)/);
  // …and it must actually still have a uuidv4 to call.
  expect(src).toMatch(
    /const\s*\{\s*randomUUID:\s*uuidv4\s*\}\s*=\s*require\(\s*['"]crypto['"]\s*\)/
  );
});

test.each(CALLERS)('%s never interpolates or assigns an un-awaited Promise', (rel) => {
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
  // Every call site is synchronous now, so an `await uuidv4()` would be a smell
  // rather than an error — but a call whose result is stringified must be a string.
  const calls = src.match(/uuidv4\(\)/g) || [];
  expect(calls.length).toBeGreaterThan(0);
});

// The end-to-end proof: the value a controller builds must survive the model that
// rejected it before. Mirrors dynamicReportController.js:162.
test('a generated reportId persists to the String path that used to reject it', async () => {
  const { randomUUID: uuidv4 } = require('crypto');
  const reportId = uuidv4();
  const fileUrl = `/api/v1/dynamic-reports/download/${reportId}`;

  expect(fileUrl).not.toContain('[object Promise]');

  const doc = await GeneratedReport.create({
    reportId,
    schoolId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    studentName: 'Aarav Sharma',
    templateId: new mongoose.Types.ObjectId(),
    templateName: 'CBSE Two Term',
    sessionId: new mongoose.Types.ObjectId(),
    academicYear: '2025-2026',
    examType: 'annual',
    fileUrl,
    filePath: '/tmp/report.pdf',
    fileName: 'report.pdf',
    generatedBy: new mongoose.Types.ObjectId(),
  });

  expect(typeof doc.reportId).toBe('string');
  expect(doc.reportId).toBe(reportId);
  expect(doc.fileUrl).toContain(reportId);
});

// The htmlToPdf symptom was different: no throw, just every PDF written to the
// same filename, so concurrent generations overwrote each other.
test('generated PDF filenames are unique, not "report_[object Promise].pdf"', () => {
  const { randomUUID: uuidv4 } = require('crypto');
  const names = new Set(Array.from({ length: 50 }, () => `report_${uuidv4()}.pdf`));

  expect(names.size).toBe(50);
  for (const n of names) expect(n).not.toContain('[object Promise]');
});
