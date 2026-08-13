const mongoose = require('mongoose');

const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser } = require('./helpers/fixtures');

// app.js is required for its side effect: it registers every mongoose model, and
// the aggregator populates SectionModel/ClassModel/SubjectMaster by ref name.
require('../src/app');

const DataAggregator = require('../src/modules/reportcards/services/dataAggregatorService');
const TemplateParser = require('../src/modules/reportcards/services/templateParserService');
const Marks = require('../src/modules/examination/models/MarksModel');
const { Exam, ExamSubjectConfig } = require('../src/modules/examination');
const { ClassSubjectMap, AcademicSession } = require('../src/modules/academics');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const oid = () => new mongoose.Types.ObjectId();

// One subject, one exam, four components — the CBSE_TWO_TERM shape. The exam is
// named "Half Yearly" so classifyTerm puts it in term1 and the row emits t1_*.
const MARKS = { pertest: 9, nb: 5, se: 4, halfyearly: 71 };
const EXPECTED_TOTAL = 89;

/**
 * Seed a full marks pipeline and return the aggregated subject row plus the
 * flat template data.
 *
 * @param {object} fields      what the teacher's upload stored in marks.fields
 * @param {object} [opts]
 * @param {boolean} [opts.useProfileId=true] key the marks by StudentProfile._id
 *        (false = User._id, which older upload paths used)
 */
const seedAndAggregate = async (fields, { useProfileId = true } = {}) => {
  const school = await createSchool('RCMARKS');
  const schoolId = school._id;
  const classId = oid();
  const sectionId = oid();
  const subjectId = oid();

  const db = mongoose.connection.collection.bind(mongoose.connection);
  await db('classmodels').insertOne({ _id: classId, name: '10', numericOrder: 10, schoolId });
  await db('sectionmodels').insertOne({ _id: sectionId, name: 'A', schoolId });
  await db('subjectmasters').insertOne({
    _id: subjectId,
    name: 'Mathematics',
    code: 'MATH',
    schoolId,
  });

  const session = await AcademicSession.create({
    name: '2025-26',
    schoolId,
    isActive: true,
    startDate: new Date('2025-04-01'),
    endDate: new Date('2026-03-31'),
  });

  const userDoc = await createUser({ school, role: 'student', email: 'rcmarks@a.com' });
  // StudentProfile demands a dozen fields the aggregator never reads; insert
  // through the driver so the fixture stays to what is under test.
  await db('studentprofiles').insertOne({
    userId: userDoc._id,
    schoolId,
    firstName: 'Asha',
    lastName: 'Rani',
    rollNo: 'R-1',
    admissionNumber: 'ADM-1',
    dateOfBirth: new Date('2009-03-12'),
    classId,
    sectionId,
    session: session._id,
    status: 'active',
    isDeleted: false,
    createdAt: new Date(),
  });
  const profile = await db('studentprofiles').findOne({ userId: userDoc._id });

  await ClassSubjectMap.create({ classId, subjectId, session: session._id, schoolId });

  const exam = await Exam.create({
    name: 'Half Yearly',
    type: 'half_yearly',
    session: session._id,
    classIds: [classId],
    schoolId,
    createdBy: oid(),
    createdByRole: 'admin',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2025-09-10'),
  });

  await ExamSubjectConfig.create({
    examId: exam._id,
    classId,
    subjectId,
    schoolId,
    maxMarks: 100,
    passingMarks: 33,
    marksDistribution: [
      { type: 'pertest', label: 'Per Test', maxMarks: 10 },
      { type: 'nb', label: 'Note Book', maxMarks: 5 },
      { type: 'se', label: 'Subject Enrichment', maxMarks: 5 },
      { type: 'halfyearly', label: 'Half Yearly', maxMarks: 80 },
    ],
  });

  await Marks.create({
    examId: exam._id,
    studentId: useProfileId ? profile._id : userDoc._id,
    subjectId,
    classId,
    sectionId,
    session: session._id,
    schoolId,
    uploadedBy: oid(),
    marksType: 'fields',
    fields,
  });

  const data = await DataAggregator.getStudentSnapshot({
    studentId: profile._id,
    schoolId,
    sessionId: session._id,
    examType: 'annual',
  });

  return { data, row: (data.subjects || [])[0] };
};

// A minimal CBSE_TWO_TERM-shaped scholastic table.
const TEMPLATE = `
<table>
  {{#subjects}}
  <tr>
    <td class="subj">{{name}}</td>
    <td class="pt">{{t1_pertest}}</td>
    <td class="nb">{{t1_nb}}</td>
    <td class="se">{{t1_se}}</td>
    <td class="hy">{{t1_halfyearly}}</td>
    <td class="tot">{{grandtotal}}</td>
  </tr>
  {{/subjects}}
</table>`;

const cell = (html, cls) => {
  const m = html.match(new RegExp(`<td class="${cls}">([^<]*)</td>`));
  return m ? m[1].trim() : null;
};

test('uploaded marks reach the rendered report card', async () => {
  const { data, row } = await seedAndAggregate(MARKS);

  expect(row).toBeDefined();
  expect(row.grandObt).toBe(EXPECTED_TOTAL);

  const { html } = TemplateParser.render(TEMPLATE, data);

  // The whole point of the test: a specific mark value is in the output.
  expect(cell(html, 'pt')).toBe('9');
  expect(cell(html, 'nb')).toBe('5');
  expect(cell(html, 'se')).toBe('4');
  expect(cell(html, 'hy')).toBe('71');
  expect(cell(html, 'subj')).toBe('Mathematics');
});

// The regression this file exists for. The upload path treats "t1_pertest" and
// "pertest" as the same component (teacherController.resolveFieldMax strips
// /^t[12]_/), but the aggregator used to look up the configured component name
// verbatim. A prefixed key therefore matched nothing: the per-cell values still
// rendered via the row's own t1_* aliases while every total came out 0.
test('a term-prefixed field key still reaches the card and the totals', async () => {
  const prefixed = Object.fromEntries(Object.entries(MARKS).map(([k, v]) => [`t1_${k}`, v]));
  const { data, row } = await seedAndAggregate(prefixed);

  expect(row.grandObt).toBe(EXPECTED_TOTAL); // was 0 before the fix
  expect(row.total).toBe(EXPECTED_TOTAL);

  const { html } = TemplateParser.render(TEMPLATE, data);
  expect(cell(html, 'pt')).toBe('9');
  expect(cell(html, 'hy')).toBe('71');
});

// Marks stored under names no ExamSubjectConfig component declares cannot be
// addressed by the template — nothing can map "FA1" onto "t1_pertest". They must
// still count toward the subject total rather than silently reporting zero.
test('field keys outside the configured components still count toward the total', async () => {
  const { row } = await seedAndAggregate({ FA1: 9, notebook: 5, enrichment: 4, exam: 71 });
  expect(row.grandObt).toBe(EXPECTED_TOTAL); // was 0 before the fix
});

// MarksModel.studentId is declared ref:'User' but different upload paths wrote
// StudentProfile._id, which is why migration 2026-07-24-13 resolves students with
// $or on both. MarksSourceService queries with $in over both ids.
test('marks keyed by User._id are found just like StudentProfile._id', async () => {
  const { row } = await seedAndAggregate(MARKS, { useProfileId: false });
  expect(row.grandObt).toBe(EXPECTED_TOTAL);
  expect(row.t1_pertest).toBe(9);
});
