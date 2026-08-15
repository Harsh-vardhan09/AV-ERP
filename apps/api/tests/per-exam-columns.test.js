const mongoose = require('mongoose');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser } = require('./helpers/fixtures');

// Register the schemas the aggregator populates
const academics = require('../src/modules/academics');
void academics.ClassModel;
void academics.SectionModel;
void academics.SubjectMaster;
void academics.AcademicSession;
void require('../src/modules/identity').User;

const DataAggregatorService = require('../src/modules/reportcards/services/dataAggregatorService');
const TemplateParserService = require('../src/modules/reportcards/services/templateParserService');
const Exam = require('../src/modules/examination/models/Exam');
const ExamSubjectConfig = require('../src/modules/examination/models/ExamSubjectConfig');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const db = (c) => mongoose.connection.collection(c);

/**
 * The school in the bug report: FA1 / FA2 / SA-I / SA-II are SEPARATE exam
 * documents, each holding one aggregate mark per subject, with no
 * marksDistribution anywhere. The roll-up collapses them into a single 'theory'
 * component, so a component-based template has nothing to bind and the per-exam
 * axis is lost. subject.exams is that axis.
 */
const seedSchool = async ({ examSpec }) => {
  const school = await createSchool('SCHOOLA');
  const schoolId = school._id;
  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const english = new mongoose.Types.ObjectId();
  const sanskrit = new mongoose.Types.ObjectId();
  const stu = await createUser({ school, role: 'student', email: 'stu@a.com' });
  const profileId = new mongoose.Types.ObjectId();

  await db('classmodels').insertOne({
    _id: classId,
    name: '9',
    numericOrder: 9,
    session: sessionId,
    schoolId,
  });
  await db('sectionmodels').insertOne({ _id: sectionId, name: 'A', schoolId });
  await db('academicsessions').insertOne({
    _id: sessionId,
    name: '2025-2026',
    isActive: true,
    schoolId,
  });
  for (const [id, name] of [
    [english, 'English'],
    [sanskrit, 'Sanskrit'],
  ]) {
    await db('subjectmasters').insertOne({ _id: id, name, code: name.slice(0, 3), schoolId });
    await db('classsubjectmaps').insertOne({
      classId,
      subjectId: id,
      session: sessionId,
      schoolId,
    });
  }
  await db('studentprofiles').insertOne({
    _id: profileId,
    userId: stu._id,
    schoolId,
    firstName: 'Amara',
    lastName: 'S',
    rollNo: '1',
    admissionNumber: 'ADM-1',
    scholarNo: 'SC-1',
    studentId: 'STU-1',
    classId,
    sectionId,
    session: sessionId,
    status: 'active',
    isDeleted: false,
  });

  for (const [name, type, date, marks] of examSpec) {
    const exam = await Exam.create({
      name,
      type,
      session: sessionId,
      classIds: [classId],
      startDate: new Date(date),
      endDate: new Date(date),
      createdBy: stu._id,
      createdByRole: 'admin',
      schoolId,
    });
    for (const [subjectKey, pair] of Object.entries(marks)) {
      if (!pair) continue;
      const [obt, max] = pair;
      const subjectId = subjectKey === 'english' ? english : sanskrit;
      await ExamSubjectConfig.create({
        examId: exam._id,
        classId,
        subjectId,
        schoolId,
        maxMarks: max,
        passingMarks: Math.round(max / 3),
      }); // legacy shape on purpose — no marksDistribution
      await db('marks').insertOne({
        examId: exam._id,
        classId,
        sectionId,
        subjectId,
        studentId: stu._id,
        session: sessionId,
        schoolId,
        marksObtained: obt,
        maxMarks: max,
      });
    }
  }

  return { schoolId, sessionId, profileId };
};

const FOUR_EXAMS = [
  ['FA1 Exam 1', 'unit_test', '2025-04-15', { english: [10, 10], sanskrit: [10, 10] }],
  ['FA2 Exam 1', 'unit_test', '2025-06-05', { english: [10, 10], sanskrit: [9, 10] }],
  ['SA-I (Half Yearly)', 'half_yearly', '2025-09-10', { english: [55, 60], sanskrit: [51, 60] }],
  ['SA-II (Annual)', 'annual', '2026-03-05', { english: [53, 60], sanskrit: [49, 60] }],
];

const snapshot = (ctx) =>
  DataAggregatorService.getStudentSnapshot({
    studentId: ctx.profileId,
    schoolId: ctx.schoolId,
    sessionId: ctx.sessionId,
  });

describe('per-exam breakdown', () => {
  test('each subject carries one entry per exam, in exam-date order', async () => {
    const ctx = await seedSchool({ examSpec: FOUR_EXAMS });
    const snap = await snapshot(ctx);
    const eng = snap.subjects.find((s) => s.name === 'English');

    expect(eng.exams.map((e) => e.examName)).toEqual([
      'FA1 Exam 1',
      'FA2 Exam 1',
      'SA-I (Half Yearly)',
      'SA-II (Annual)',
    ]);
    expect(eng.exams.map((e) => e.obtained)).toEqual([10, 10, 55, 53]);
    expect(eng.exams.map((e) => e.maxMarks)).toEqual([10, 10, 60, 60]);
    expect(eng.exams.map((e) => e.term)).toEqual(['term1', 'term1', 'term1', 'term2']);
  });

  test('the roll-up keys the working template depends on are untouched', async () => {
    const ctx = await seedSchool({ examSpec: FOUR_EXAMS });
    const snap = await snapshot(ctx);
    const eng = snap.subjects.find((s) => s.name === 'English');

    expect(eng.term1.total).toBe(75);
    expect(eng.term2.total).toBe(53);
    expect(eng.grandObt).toBe(128);
    expect(eng.grandMax).toBe(140);
    expect(eng.grandTotal).toBe(128);
    expect(eng.grand_total).toBe(128);
    expect(eng.total).toBe(128);
    expect(eng.grade).toBeTruthy();
    expect(eng.components.length).toBeGreaterThan(0);
    expect(eng.t1_theory).toBe(75);
  });

  test('examColumns give the header row, aligned with the body cells', async () => {
    const ctx = await seedSchool({ examSpec: FOUR_EXAMS });
    const snap = await snapshot(ctx);

    expect(snap.examColumns.map((c) => c.examName)).toEqual([
      'FA1 Exam 1',
      'FA2 Exam 1',
      'SA-I (Half Yearly)',
      'SA-II (Annual)',
    ]);
    expect(snap.examCount).toBe(4);
    // header index i and body index i describe the same exam, for every subject
    for (const sub of snap.subjects) {
      expect(sub.exams.map((e) => e.examId)).toEqual(snap.examColumns.map((c) => c.examId));
    }
  });

  test('a subject that skipped an exam gets a blank cell, not a shifted row', async () => {
    const ctx = await seedSchool({
      examSpec: [
        ['FA1 Exam 1', 'unit_test', '2025-04-15', { english: [10, 10], sanskrit: [8, 10] }],
        // Sanskrit was not assessed in FA2
        ['FA2 Exam 1', 'unit_test', '2025-06-05', { english: [9, 10], sanskrit: null }],
      ],
    });
    const snap = await snapshot(ctx);
    const san = snap.subjects.find((s) => s.name === 'Sanskrit');

    expect(san.exams).toHaveLength(2);
    expect(san.exams[0].obtained).toBe(8);
    expect(san.exams[1].obtained).toBe('');
    expect(san.exams[1].examName).toBe('FA2 Exam 1');
  });

  test('exams are grouped by term for the template', async () => {
    const ctx = await seedSchool({ examSpec: FOUR_EXAMS });
    const snap = await snapshot(ctx);
    const eng = snap.subjects.find((s) => s.name === 'English');

    expect(eng.term1Exams.map((e) => e.examName)).toEqual([
      'FA1 Exam 1',
      'FA2 Exam 1',
      'SA-I (Half Yearly)',
    ]);
    expect(eng.term2Exams.map((e) => e.examName)).toEqual(['SA-II (Annual)']);
  });
});

describe('A4 degradation', () => {
  test('six exams still fit', async () => {
    const spec = Array.from({ length: 6 }, (_, i) => [
      `Test ${i + 1}`,
      'unit_test',
      `2025-0${i + 1}-01`,
      { english: [8, 10], sanskrit: [7, 10] },
    ]);
    const snap = await snapshot(await seedSchool({ examSpec: spec }));
    expect(snap.examCount).toBe(6);
    expect(snap.examColumnsOverflow).toBe(false);
    expect(snap.examColumnsFit).toBe(true);
  });

  test('eight exams flip the layout to term totals', async () => {
    const spec = Array.from({ length: 8 }, (_, i) => [
      `Test ${i + 1}`,
      'unit_test',
      `2025-0${(i % 9) + 1}-01`,
      { english: [8, 10], sanskrit: [7, 10] },
    ]);
    const snap = await snapshot(await seedSchool({ examSpec: spec }));
    expect(snap.examCount).toBe(8);
    expect(snap.examColumnsOverflow).toBe(true);
    // falsy so {{#examColumnsFit}} skips the wide table
    expect(snap.examColumnsFit).toBeFalsy();
  });
});

describe('marks never render with spurious decimals', () => {
  test('a fractional stored mark is rounded, and integers stay integers', async () => {
    const ctx = await seedSchool({
      examSpec: [
        [
          'SA-I (Half Yearly)',
          'half_yearly',
          '2025-09-10',
          { english: [55, 60], sanskrit: [50, 60] },
        ],
      ],
    });
    // Simulate the fractional value that produced 199.91 on the real card
    await db('marks').updateOne({}, { $set: { marksObtained: 49.909999999 } });

    const snap = await snapshot(ctx);
    for (const sub of snap.subjects) {
      for (const v of [sub.grandObt, sub.grandMax, sub.term1.total, sub.term2.total]) {
        expect(String(v)).toMatch(/^\d+(\.\d{1,2})?$/);
      }
      for (const e of sub.exams) {
        if (e.obtained !== '') expect(String(e.obtained)).toMatch(/^\d+(\.\d{1,2})?$/);
      }
    }
  });
});

describe('the template engine renders the nested loop', () => {
  test('{{#subjects}} containing {{#exams}} produces one cell per exam', async () => {
    const ctx = await seedSchool({ examSpec: FOUR_EXAMS });
    const snap = await snapshot(ctx);

    const tpl = `
      <table>
        <tr><th>Subject</th>{{#examColumns}}<th>{{examName}}</th>{{/examColumns}}<th>Total</th></tr>
        {{#subjects}}
        <tr><td>{{name}}</td>{{#exams}}<td>{{obtained}}</td>{{/exams}}<td>{{grandTotal}}</td></tr>
        {{/subjects}}
      </table>`;

    const { html } = TemplateParserService.render(tpl, snap);

    expect(html).toContain('<th>FA1 Exam 1</th>');
    expect(html).toContain('<th>SA-II (Annual)</th>');
    // English row: 10, 10, 55, 53 then the total
    const engRow = html.split('\n').find((l) => l.includes('English'));
    expect(engRow).toContain('<td>10</td><td>10</td><td>55</td><td>53</td><td>128</td>');
  });
});
