const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');

const Exam = require('../src/modules/examination/models/Exam');
const ExamSubjectConfig = require('../src/modules/examination/models/ExamSubjectConfig');
const { displayMarks } = require('../src/modules/examination/lib/marksValue');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const db = (c) => mongoose.connection.collection(c);

const seed = async ({ distribution = null, maxMarks = 100 } = {}) => {
  const school = await createSchool('SCHOOLA');
  const schoolId = school._id;
  const teacher = await createUser({ school, role: 'teacher', email: 't@a.com' });
  const stuUser = await createUser({ school, role: 'student', email: 's@a.com' });

  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const session = new mongoose.Types.ObjectId();
  const subjectId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();

  await db('classmodels').insertOne({
    _id: classId,
    name: '9',
    numericOrder: 9,
    session,
    schoolId,
  });
  await db('sectionmodels').insertOne({ _id: sectionId, name: 'A', schoolId });
  await db('academicsessions').insertOne({
    _id: session,
    name: '2026-27',
    isActive: true,
    schoolId,
  });
  await db('subjectmasters').insertOne({ _id: subjectId, name: 'Maths', code: 'MAT', schoolId });
  await db('classsubjectmaps').insertOne({ classId, subjectId, session, schoolId });
  await db('studentprofiles').insertOne({
    _id: profileId,
    userId: stuUser._id,
    schoolId,
    firstName: 'Amara',
    lastName: 'Singh',
    rollNo: '1',
    admissionNumber: 'A1',
    scholarNo: 'S1',
    studentId: 'ST1',
    classId,
    sectionId,
    session,
    status: 'active',
    isDeleted: false,
  });
  await db('teachersubjectassignments').insertOne({
    teacherId: teacher._id,
    subjectId,
    classId,
    sectionId,
    session,
    schoolId,
  });

  const exam = await Exam.create({
    name: 'XZY',
    type: 'unit_test',
    session,
    classIds: [classId],
    startDate: new Date('2026-08-11'),
    endDate: new Date('2026-08-19'),
    createdBy: teacher._id,
    createdByRole: 'teacher',
    schoolId,
  });
  await ExamSubjectConfig.create({
    examId: exam._id,
    classId,
    subjectId,
    schoolId,
    maxMarks,
    passingMarks: 33,
    ...(distribution && { marksDistribution: distribution }),
  });

  return { school, schoolId, teacher, stuUser, classId, sectionId, session, subjectId, exam };
};

const post = (ctx, marks) =>
  request(app)
    .post('/api/v1/teacher/marks')
    .set('Cookie', authCookie(ctx.teacher))
    .send({
      examId: String(ctx.exam._id),
      subjectId: String(ctx.subjectId),
      classId: String(ctx.classId),
      sectionId: String(ctx.sectionId),
      session: String(ctx.session),
      marks,
    });

/**
 * The reported bug: a teacher's upload created a record whose Marks column was
 * BLANK — not 0, not N/A — while the teacher name, max marks and date beside it
 * rendered fine, and totals read 0/200. The write stored a `fields` map; every
 * reader projected `marksObtained`, which those rows do not have.
 */
describe('template-driven upload survives the round trip', () => {
  test('the value the teacher entered is what the student view shows', async () => {
    const ctx = await seed();
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_pertest: 8, t1_theory: 72 }, remarks: '' },
    ]);
    expect(res.status).toBe(200);

    // …stored as a fields map, with no marksObtained — the shape that broke
    const raw = await db('marks').findOne({});
    expect(raw.fields).toEqual({ t1_pertest: 8, t1_theory: 72 });
    expect(raw.marksObtained).toBeUndefined();

    // …and the endpoint the exam view actually reads returns a usable number
    const view = await request(app)
      .get('/api/v1/student/marks')
      .set('Cookie', authCookie(ctx.stuUser));
    expect(view.status).toBe(200);

    const row = view.body.data[0];
    expect(row.marksObtained).toBe(80); // 8 + 72
    expect(row.maxMarks).toBe(100);
    expect(row.marksSource).toBe('fields');
    // The Map must not serialise as {} — a client reading fields found nothing
    expect(row.fields).toEqual({ t1_pertest: 8, t1_theory: 72 });
  });

  test('the teacher-facing read shows it too', async () => {
    const ctx = await seed();
    await post(ctx, [{ studentId: String(ctx.stuUser._id), fields: { t1_theory: 65 } }]);

    const view = await request(app)
      .get(`/api/v1/teacher/marks?examId=${ctx.exam._id}`)
      .set('Cookie', authCookie(ctx.teacher));
    expect(view.body.data[0].marksObtained).toBe(65);
  });

  test('an auto-calculated total is not double counted', async () => {
    const ctx = await seed();
    await post(ctx, [
      {
        studentId: String(ctx.stuUser._id),
        fields: { t1_pertest: 8, t1_theory: 72, t1_total: 80 },
      },
    ]);

    const view = await request(app)
      .get('/api/v1/student/marks')
      .set('Cookie', authCookie(ctx.stuUser));
    expect(view.body.data[0].marksObtained).toBe(80); // not 160
  });

  test('a legacy single-value upload still works unchanged', async () => {
    const ctx = await seed();
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), marksObtained: 55, remarks: '' },
    ]);
    expect(res.status).toBe(200);

    const view = await request(app)
      .get('/api/v1/student/marks')
      .set('Cookie', authCookie(ctx.stuUser));
    expect(view.body.data[0].marksObtained).toBe(55);
    expect(view.body.data[0].marksSource).toBe('marksObtained');
  });
});

describe('a save that cannot be stored fails loudly', () => {
  // Previously this was clamped to the cap and returned 200, so the teacher saw
  // "saved" for a number they never entered.
  test('a value above the maximum is rejected, and nothing is written', async () => {
    const ctx = await seed({ maxMarks: 100 });
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_theory: 150 } },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not saved/i);
    expect(res.body.details.code).toBe('INVALID_MARKS');
    expect(res.body.details.errors[0]).toMatch(
      /Amara Singh: t1_theory — 150 exceeds the maximum of 100/
    );
    expect(await db('marks').countDocuments({})).toBe(0);
  });

  test('a non-numeric value is rejected rather than dropped', async () => {
    const ctx = await seed();
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_theory: 'abc' } },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.details.errors[0]).toMatch(/is not a number/);
    expect(await db('marks').countDocuments({})).toBe(0);
  });

  test('a negative value is rejected', async () => {
    const ctx = await seed();
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_theory: -5 } },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.details.errors[0]).toMatch(/negative/);
  });

  test('one bad student blocks the whole batch — no partial save', async () => {
    const ctx = await seed();
    const other = await createUser({ school: ctx.school, role: 'student', email: 's2@a.com' });
    await db('studentprofiles').insertOne({
      _id: new mongoose.Types.ObjectId(),
      userId: other._id,
      schoolId: ctx.schoolId,
      firstName: 'Bo',
      lastName: 'T',
      rollNo: '2',
      admissionNumber: 'A2',
      scholarNo: 'S2',
      studentId: 'ST2',
      classId: ctx.classId,
      sectionId: ctx.sectionId,
      session: ctx.session,
      status: 'active',
      isDeleted: false,
    });

    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_theory: 60 } },
      { studentId: String(other._id), fields: { t1_theory: 999 } },
    ]);

    expect(res.status).toBe(400);
    // The good row must NOT have been written — a half-saved batch is worse than none
    expect(await db('marks').countDocuments({})).toBe(0);
  });

  test('a value within a configured component cap is accepted', async () => {
    const ctx = await seed({
      distribution: [
        { type: 'pertest', label: 'Periodic Test', maxMarks: 10 },
        { type: 'theory', label: 'Theory', maxMarks: 80 },
      ],
    });
    const ok = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_pertest: 9, t1_theory: 75 } },
    ]);
    expect(ok.status).toBe(200);

    const over = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_pertest: 11 } },
    ]);
    expect(over.status).toBe(400);
    expect(over.body.details.errors[0]).toMatch(/t1_pertest — 11 exceeds the maximum of 10/);
  });
});

/**
 * The 360/100 bug. Per-component checking alone was not enough: a component
 * whose name matches no configured distribution entry falls back to the SUBJECT
 * TOTAL as its cap, so four components of 90 each passed individually and stored
 * a subject total of 360 out of 100.
 */
describe('components must also sum within the subject total', () => {
  test('four components of 90 are rejected even though each is under 100', async () => {
    const ctx = await seed({ maxMarks: 100 });
    const res = await post(ctx, [
      {
        studentId: String(ctx.stuUser._id),
        fields: { t1_a: 90, t1_b: 90, t1_c: 90, t1_d: 90 },
      },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.details.errors[0]).toMatch(
      /add up to 360, which is more than the subject total of 100/
    );
    expect(res.body.details.subjectTotal).toBe(100);
    expect(await db('marks').countDocuments({})).toBe(0);
  });

  test('components that sum exactly to the total are accepted', async () => {
    const ctx = await seed({ maxMarks: 100 });
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_a: 40, t1_b: 60 } },
    ]);
    expect(res.status).toBe(200);

    const view = await request(app)
      .get('/api/v1/student/marks')
      .set('Cookie', authCookie(ctx.stuUser));
    expect(view.body.data[0].marksObtained).toBe(100);
  });

  test('the sum rule uses the distribution total, not a hardcoded 100', async () => {
    const ctx = await seed({
      maxMarks: 80,
      distribution: [
        { type: 'pertest', label: 'Periodic Test', maxMarks: 10 },
        { type: 'theory', label: 'Theory', maxMarks: 40 },
      ],
    });
    // subject total is 10 + 40 = 50
    const over = await post(ctx, [
      {
        studentId: String(ctx.stuUser._id),
        fields: { t1_pertest: 10, t1_theory: 40, t1_extra: 5 },
      },
    ]);
    expect(over.status).toBe(400);
    expect(over.body.details.subjectTotal).toBe(50);
    expect(over.body.details.maxSource).toBe('ExamSubjectConfig.marksDistribution');
    expect(over.body.details.errors[0]).toMatch(/add up to 55.*subject total of 50/);
  });

  test('an auto-calculated total field does not trip the sum rule', async () => {
    const ctx = await seed({ maxMarks: 100 });
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_a: 40, t1_b: 60, t1_total: 100 } },
    ]);
    expect(res.status).toBe(200); // 40+60 = 100, the total is not added again
  });

  test('a total field above the subject total is rejected', async () => {
    const ctx = await seed({ maxMarks: 100 });
    const res = await post(ctx, [
      { studentId: String(ctx.stuUser._id), fields: { t1_total: 360 } },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.details.errors[0]).toMatch(/t1_total — 360 exceeds the maximum of 100/);
  });
});

describe('the legacy single-value path rejects rather than clamping', () => {
  test('360 out of 100 is refused, not stored as 100', async () => {
    const ctx = await seed({ maxMarks: 100 });
    const res = await post(ctx, [{ studentId: String(ctx.stuUser._id), marksObtained: 360 }]);

    expect(res.status).toBe(400);
    expect(res.body.details.errors[0]).toMatch(/360 exceeds the maximum of 100/);
    expect(await db('marks').countDocuments({})).toBe(0);
  });

  test('a negative legacy mark is refused', async () => {
    const ctx = await seed();
    const res = await post(ctx, [{ studentId: String(ctx.stuUser._id), marksObtained: -3 }]);
    expect(res.status).toBe(400);
    expect(res.body.details.errors[0]).toMatch(/negative/);
  });

  test('a non-numeric legacy mark is refused', async () => {
    const ctx = await seed();
    const res = await post(ctx, [{ studentId: String(ctx.stuUser._id), marksObtained: 'ninety' }]);
    expect(res.status).toBe(400);
    expect(res.body.details.errors[0]).toMatch(/is not a number/);
  });

  test('a valid legacy mark still saves', async () => {
    const ctx = await seed({ maxMarks: 100 });
    const res = await post(ctx, [{ studentId: String(ctx.stuUser._id), marksObtained: 87 }]);
    expect(res.status).toBe(200);
    expect((await db('marks').findOne({})).marksObtained).toBe(87);
  });
});

describe('where maxMarks comes from', () => {
  const { resolveMaxima } = require('../src/modules/examination/services/marksEntryValidator');

  test('marksDistribution wins, and the total is its sum', async () => {
    const ctx = await seed({
      maxMarks: 999,
      distribution: [
        { type: 'a', label: 'A', maxMarks: 30 },
        { type: 'b', label: 'B', maxMarks: 20 },
      ],
    });
    const m = await resolveMaxima({
      examId: ctx.exam._id,
      classId: ctx.classId,
      subjectId: ctx.subjectId,
      schoolId: ctx.schoolId,
    });
    expect(m.subjectTotal).toBe(50);
    expect(m.componentMax).toEqual({ a: 30, b: 20 });
  });

  test('falls back to the flat maxMarks when there is no distribution', async () => {
    const ctx = await seed({ maxMarks: 75 });
    const m = await resolveMaxima({
      examId: ctx.exam._id,
      classId: ctx.classId,
      subjectId: ctx.subjectId,
      schoolId: ctx.schoolId,
    });
    expect(m.subjectTotal).toBe(75);
    expect(m.source).toBe('ExamSubjectConfig.maxMarks');
  });

  test('an unconfigured subject is bounded, not unlimited', async () => {
    const ctx = await seed();
    const m = await resolveMaxima({
      examId: ctx.exam._id,
      classId: ctx.classId,
      subjectId: new mongoose.Types.ObjectId(), // no config for this subject
      schoolId: ctx.schoolId,
    });
    expect(m.configured).toBe(false);
    expect(m.subjectTotal).toBe(100);
  });
});

describe('displayMarks', () => {
  test('prefers an explicit marksObtained', () => {
    expect(displayMarks({ marksObtained: 42, fields: { a: 1 } })).toBe(42);
  });

  test('sums a fields map', () => {
    expect(displayMarks({ fields: { a: 8, b: 72 } })).toBe(80);
  });

  test('handles a Map as well as a plain object', () => {
    expect(
      displayMarks({
        fields: new Map([
          ['a', 8],
          ['b', 2],
        ]),
      })
    ).toBe(10);
  });

  test('returns null when nothing was entered', () => {
    expect(displayMarks({ fields: {} })).toBeNull();
    expect(displayMarks({})).toBeNull();
    expect(displayMarks(null)).toBeNull();
  });

  test('0 is a real mark, not "nothing entered"', () => {
    expect(displayMarks({ marksObtained: 0 })).toBe(0);
    expect(displayMarks({ fields: { a: 0 } })).toBe(0);
  });

  test('falls back to total fields when they are all a row has', () => {
    expect(displayMarks({ fields: { t1_total: 80 } })).toBe(80);
  });
});
