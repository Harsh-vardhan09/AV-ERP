const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');

const Exam = require('../src/modules/examination/models/Exam');
const ExamSubjectConfig = require('../src/modules/examination/models/ExamSubjectConfig');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const DIST = [
  { type: 'pertest', label: 'Periodic Test', maxMarks: 10 },
  { type: 'nb', label: 'Notebook', maxMarks: 5 },
  { type: 'se', label: 'Subject Enrichment', maxMarks: 5 },
  { type: 'theory', label: 'Theory', maxMarks: 80 },
];

const db = (c) => mongoose.connection.collection(c);

const seed = async () => {
  const school = await createSchool('SCHOOLA');
  const admin = await createUser({ school, role: 'admin', email: 'admin@a.com' });
  const teacher = await createUser({ school, role: 'teacher', email: 't@a.com' });
  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const session = new mongoose.Types.ObjectId();
  const subjectA = new mongoose.Types.ObjectId();
  const subjectB = new mongoose.Types.ObjectId();

  // session matters: createExam with scope:'all' resolves classes by session
  await db('classmodels').insertOne({
    _id: classId,
    name: '9',
    numericOrder: 9,
    session,
    schoolId: school._id,
  });
  await db('sectionmodels').insertOne({ _id: sectionId, name: 'A', schoolId: school._id });
  await db('academicsessions').insertOne({
    _id: session,
    name: '2026-27',
    isActive: true,
    schoolId: school._id,
  });
  for (const [id, name] of [
    [subjectA, 'Mathematics'],
    [subjectB, 'Science'],
  ]) {
    await db('subjectmasters').insertOne({
      _id: id,
      name,
      code: name.slice(0, 4),
      schoolId: school._id,
    });
    await db('classsubjectmaps').insertOne({
      classId,
      subjectId: id,
      session,
      schoolId: school._id,
    });
  }
  return { school, admin, teacher, classId, sectionId, session, subjectA, subjectB };
};

describe('exam creation requires a marks breakdown for report-card exam types', () => {
  // An exam with no distribution can only ever store one aggregate number, which
  // the aggregator surfaces as t1_theory — every component column comes out blank.
  test.each(['half_yearly', 'annual', 'pre_board'])(
    'refuses a %s exam with no distribution',
    async (type) => {
      const ctx = await seed();
      const res = await request(app)
        .post('/api/v1/admin/exam')
        .set('Cookie', authCookie(ctx.admin))
        .send({ name: `${type} exam`, type, session: String(ctx.session), scope: 'all' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/marks distribution/i);
      expect(res.body.details.code).toBe('MARKS_DISTRIBUTION_REQUIRED');
      expect(await Exam.countDocuments({})).toBe(0);
    }
  );

  test('accepts the same exam once a distribution is supplied', async () => {
    const ctx = await seed();
    const res = await request(app)
      .post('/api/v1/admin/exam')
      .set('Cookie', authCookie(ctx.admin))
      .send({
        name: 'Half Yearly',
        type: 'half_yearly',
        session: String(ctx.session),
        scope: 'all',
        defaultDistribution: DIST,
      });

    expect(res.status).toBe(201);
    const cfgs = await ExamSubjectConfig.find({}).lean();
    expect(cfgs).toHaveLength(2);
    cfgs.forEach((c) =>
      expect(c.marksDistribution.map((d) => d.type)).toEqual(['pertest', 'nb', 'se', 'theory'])
    );
  });

  // Unit tests legitimately are not component-based; they must stay unrestricted.
  test('leaves unit_test unrestricted', async () => {
    const ctx = await seed();
    const res = await request(app)
      .post('/api/v1/admin/exam')
      .set('Cookie', authCookie(ctx.admin))
      .send({ name: 'unit test 2', type: 'unit_test', session: String(ctx.session), scope: 'all' });

    expect(res.status).toBe(201);
  });
});

describe('the distribution is no longer silently dropped', () => {
  // addExamSubject destructured req.body without marksDistribution, so every
  // subject added after exam creation was legacy-shaped, permanently.
  test('addExamSubject persists an explicit distribution', async () => {
    const ctx = await seed();
    const exam = await Exam.create({
      name: 'Half Yearly',
      type: 'half_yearly',
      session: ctx.session,
      classIds: [ctx.classId],
      createdBy: ctx.admin._id,
      createdByRole: 'admin',
      schoolId: ctx.school._id,
    });

    const res = await request(app)
      .post('/api/v1/admin/exam-subject')
      .set('Cookie', authCookie(ctx.admin))
      .send({
        examId: String(exam._id),
        classId: String(ctx.classId),
        subjectId: String(ctx.subjectA),
        maxMarks: 100,
        passingMarks: 33,
        marksDistribution: DIST,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.marksDistribution.map((d) => d.type)).toEqual([
      'pertest',
      'nb',
      'se',
      'theory',
    ]);
  });

  test('addExamSubject inherits from a sibling subject when none is given', async () => {
    const ctx = await seed();
    const exam = await Exam.create({
      name: 'Half Yearly',
      type: 'half_yearly',
      session: ctx.session,
      classIds: [ctx.classId],
      createdBy: ctx.admin._id,
      createdByRole: 'admin',
      schoolId: ctx.school._id,
    });
    await ExamSubjectConfig.create({
      examId: exam._id,
      classId: ctx.classId,
      subjectId: ctx.subjectA,
      schoolId: ctx.school._id,
      maxMarks: 100,
      passingMarks: 33,
      marksDistribution: DIST,
    });

    const res = await request(app)
      .post('/api/v1/admin/exam-subject')
      .set('Cookie', authCookie(ctx.admin))
      .send({
        examId: String(exam._id),
        classId: String(ctx.classId),
        subjectId: String(ctx.subjectB),
        maxMarks: 100,
        passingMarks: 33,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.marksDistribution.map((d) => d.type)).toEqual([
      'pertest',
      'nb',
      'se',
      'theory',
    ]);
  });

  // Every teacher-created test used to be legacy by construction.
  test('a teacher test inherits the class distribution', async () => {
    const ctx = await seed();
    await db('teachersubjectassignments').insertOne({
      teacherId: ctx.teacher._id,
      subjectId: ctx.subjectA,
      classId: ctx.classId,
      sectionId: ctx.sectionId,
      session: ctx.session,
      schoolId: ctx.school._id,
    });
    const prior = await Exam.create({
      name: 'Half Yearly',
      type: 'half_yearly',
      session: ctx.session,
      classIds: [ctx.classId],
      createdBy: ctx.admin._id,
      createdByRole: 'admin',
      schoolId: ctx.school._id,
    });
    await ExamSubjectConfig.create({
      examId: prior._id,
      classId: ctx.classId,
      subjectId: ctx.subjectA,
      schoolId: ctx.school._id,
      maxMarks: 100,
      passingMarks: 33,
      marksDistribution: DIST,
    });

    const res = await request(app)
      .post('/api/v1/teacher/test')
      .set('Cookie', authCookie(ctx.teacher))
      .send({ name: 'unit test 3', session: String(ctx.session) });

    expect(res.status).toBe(201);
    const created = await Exam.findOne({ name: 'unit test 3' });
    const cfg = await ExamSubjectConfig.findOne({ examId: created._id }).lean();
    expect(cfg.marksDistribution.map((d) => d.type)).toEqual(['pertest', 'nb', 'se', 'theory']);
  });
});

describe('config health reports which subjects cannot feed a report card', () => {
  test('counts legacy subjects and lists the components in use', async () => {
    const ctx = await seed();
    const exam = await Exam.create({
      name: 'Half Yearly',
      type: 'half_yearly',
      session: ctx.session,
      classIds: [ctx.classId],
      createdBy: ctx.admin._id,
      createdByRole: 'admin',
      schoolId: ctx.school._id,
    });
    await ExamSubjectConfig.create({
      examId: exam._id,
      classId: ctx.classId,
      subjectId: ctx.subjectA,
      schoolId: ctx.school._id,
      maxMarks: 100,
      passingMarks: 33,
      marksDistribution: DIST,
    });
    await ExamSubjectConfig.create({
      examId: exam._id,
      classId: ctx.classId,
      subjectId: ctx.subjectB,
      schoolId: ctx.school._id,
      maxMarks: 100,
      passingMarks: 33, // legacy — no distribution
    });

    const res = await request(app)
      .get(`/api/v1/admin/exam/${exam._id}/config-health`)
      .set('Cookie', authCookie(ctx.admin));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ total: 2, configured: 1, legacy: 1 });
    expect(res.body.data.components).toEqual(['pertest', 'nb', 'se', 'theory']);
    const legacyRow = res.body.data.subjects.find((s) => !s.hasDistribution);
    expect(legacyRow.subjectName).toBe('Science');
  });

  test('a teacher can read it, so the warning can render before marks entry', async () => {
    const ctx = await seed();
    const exam = await Exam.create({
      name: 'Half Yearly',
      type: 'half_yearly',
      session: ctx.session,
      classIds: [ctx.classId],
      createdBy: ctx.admin._id,
      createdByRole: 'admin',
      schoolId: ctx.school._id,
    });
    await ExamSubjectConfig.create({
      examId: exam._id,
      classId: ctx.classId,
      subjectId: ctx.subjectA,
      schoolId: ctx.school._id,
      maxMarks: 100,
      passingMarks: 33,
    });

    const res = await request(app)
      .get(`/api/v1/teacher/exam/${exam._id}/config-health`)
      .set('Cookie', authCookie(ctx.teacher));

    expect(res.status).toBe(200);
    expect(res.body.data.legacy).toBe(1);
  });

  test('is school-scoped', async () => {
    const ctx = await seed();
    const exam = await Exam.create({
      name: 'Half Yearly',
      type: 'half_yearly',
      session: ctx.session,
      classIds: [ctx.classId],
      createdBy: ctx.admin._id,
      createdByRole: 'admin',
      schoolId: ctx.school._id,
    });
    await ExamSubjectConfig.create({
      examId: exam._id,
      classId: ctx.classId,
      subjectId: ctx.subjectA,
      schoolId: ctx.school._id,
      maxMarks: 100,
      passingMarks: 33,
      marksDistribution: DIST,
    });

    const otherSchool = await createSchool('SCHOOLB');
    const otherAdmin = await createUser({ school: otherSchool, role: 'admin', email: 'b@b.com' });

    const res = await request(app)
      .get(`/api/v1/admin/exam/${exam._id}/config-health`)
      .set('Cookie', authCookie(otherAdmin));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });
});

// The student report card moved to /student/marks; the legacy editor route is
// admin/teacher only now.
describe('legacy student report-card API is closed', () => {
  test('a student can no longer read GET /report-cards/:studentId', async () => {
    const ctx = await seed();
    const student = await createUser({ school: ctx.school, role: 'student', email: 's@a.com' });

    const res = await request(app).get('/api/v1/report-card/me').set('Cookie', authCookie(student));

    expect(res.status).toBe(403);
  });
});
