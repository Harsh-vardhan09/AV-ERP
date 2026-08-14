const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');

const Exam = require('../src/modules/examination/models/Exam');
const ExamAuditLog = require('../src/modules/examination/models/ExamAuditLog');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const DAY = 24 * 60 * 60 * 1000;

const seed = async () => {
  const school = await createSchool('SCHOOLA');
  const admin = await createUser({ school, role: 'admin', email: 'admin@a.com' });
  const teacher = await createUser({ school, role: 'teacher', email: 't@a.com' });
  const other = await createUser({ school, role: 'teacher', email: 't2@a.com' });
  const classId = new mongoose.Types.ObjectId();
  const session = new mongoose.Types.ObjectId();
  await mongoose.connection
    .collection('classmodels')
    .insertOne({ _id: classId, name: '9', numericOrder: 9, schoolId: school._id });
  await mongoose.connection
    .collection('academicsessions')
    .insertOne({ _id: session, name: '2026-27', isActive: true, schoolId: school._id });
  return { school, admin, teacher, other, classId, session };
};

const makeExam = (ctx, over = {}) =>
  Exam.create({
    name: 'unit test 2',
    type: 'unit_test',
    session: ctx.session,
    classIds: [ctx.classId],
    startDate: new Date(Date.now() - 10 * DAY),
    endDate: new Date(Date.now() - 6 * DAY),
    createdBy: ctx.admin._id,
    createdByRole: 'admin',
    schoolId: ctx.school._id,
    ...over,
  });

const addMark = (ctx, exam, n = 1) =>
  mongoose.connection.collection('marks').insertMany(
    Array.from({ length: n }, () => ({
      examId: exam._id,
      classId: ctx.classId,
      schoolId: ctx.school._id,
      subjectId: new mongoose.Types.ObjectId(),
      marksObtained: 42,
    }))
  );

describe('admin edit', () => {
  test('can correct the dates of an exam', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);

    const res = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ name: 'unit test 2 (revised)', startDate: '2026-09-01', endDate: '2026-09-05' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('unit test 2 (revised)');
    expect(res.body.data.startDate).toBe(new Date('2026-09-01').toISOString());
  });

  // A blank HTML date input used to be cast to null, wiping a stored date silently.
  test('refuses a blank date instead of nulling the stored one', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);

    const res = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ startDate: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot be blank/i);
    expect((await Exam.findById(exam._id)).startDate).not.toBeNull();
  });

  test('rejects an end date before the start date', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);

    const res = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ startDate: '2026-09-10', endDate: '2026-09-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/before the start date/i);
  });

  test('warns with a count before a date change locks existing marks out', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);
    await addMark(ctx, exam, 3);

    const future = new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10);
    const futureEnd = new Date(Date.now() + 34 * DAY).toISOString().slice(0, 10);
    const blocked = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ startDate: future, endDate: futureEnd });

    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toMatch(/3 mark\(s\)/);
    expect(blocked.body.details).toMatchObject({
      code: 'MARKS_WOULD_BE_LOCKED_OUT',
      marksAffected: 3,
    });
    // …and nothing was written
    expect((await Exam.findById(exam._id)).startDate.getTime()).toBeLessThan(Date.now());

    const confirmed = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ startDate: future, endDate: futureEnd, confirm: true });

    expect(confirmed.status).toBe(200);
  });
});

describe('delete', () => {
  test('hard-deletes an exam with no marks', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);

    const res = await request(app)
      .delete(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin));

    expect(res.status).toBe(200);
    expect(await Exam.countDocuments({})).toBe(0);
  });

  // The old handler destroyed marks silently. It must now name the count and refuse.
  test('refuses to destroy marks without an exact count confirmation', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);
    await addMark(ctx, exam, 5);

    const bare = await request(app)
      .delete(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin));
    expect(bare.status).toBe(409);
    expect(bare.body.message).toMatch(/5 mark\(s\)/);
    // The UI needs the count as data, not prose, to render the confirmation
    expect(bare.body.details).toMatchObject({
      code: 'MARKS_EXIST',
      marksAffected: 5,
      alternative: 'archive',
    });
    expect(await Exam.countDocuments({})).toBe(1);
    expect(await mongoose.connection.collection('marks').countDocuments({})).toBe(5);

    // A wrong count must not pass — it means the caller is working from stale data
    const wrong = await request(app)
      .delete(`/api/v1/admin/exam/${exam._id}?confirmDeleteMarks=4`)
      .set('Cookie', authCookie(ctx.admin));
    expect(wrong.status).toBe(409);
    expect(await Exam.countDocuments({})).toBe(1);

    const right = await request(app)
      .delete(`/api/v1/admin/exam/${exam._id}?confirmDeleteMarks=5`)
      .set('Cookie', authCookie(ctx.admin));
    expect(right.status).toBe(200);
    expect(await mongoose.connection.collection('marks').countDocuments({})).toBe(0);
  });

  test('archive keeps the marks and hides the exam from the list', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);
    await addMark(ctx, exam, 2);

    const res = await request(app)
      .patch(`/api/v1/admin/exam/${exam._id}/archive`)
      .set('Cookie', authCookie(ctx.admin));
    expect(res.status).toBe(200);
    expect(await mongoose.connection.collection('marks').countDocuments({})).toBe(2);

    const list = await request(app)
      .get(`/api/v1/admin/exams?session=${ctx.session}`)
      .set('Cookie', authCookie(ctx.admin));
    expect(list.body.data.map((e) => e._id)).not.toContain(String(exam._id));

    // …but it is still resolvable by id, so existing report cards keep working
    expect(await Exam.findById(exam._id)).not.toBeNull();

    const restored = await request(app)
      .patch(`/api/v1/admin/exam/${exam._id}/restore`)
      .set('Cookie', authCookie(ctx.admin));
    expect(restored.status).toBe(200);

    const after = await request(app)
      .get(`/api/v1/admin/exams?session=${ctx.session}`)
      .set('Cookie', authCookie(ctx.admin));
    expect(after.body.data.map((e) => e._id)).toContain(String(exam._id));
  });
});

describe('the evaluationLocked dead end', () => {
  test('a locked exam refuses edit and delete, and unlock reopens it', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx, { evaluationLocked: true, evaluationStatus: 'completed' });

    const edit = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ name: 'nope' });
    expect(edit.status).toBe(409);

    const del = await request(app)
      .delete(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin));
    expect(del.status).toBe(409);

    const unlock = await request(app)
      .patch(`/api/v1/admin/exam/${exam._id}/unlock`)
      .set('Cookie', authCookie(ctx.admin));
    expect(unlock.status).toBe(200);
    expect(unlock.body.data.evaluationLocked).toBe(false);
    // 'completed' would make startEvaluation refuse — the dead end one level down
    expect(unlock.body.data.evaluationStatus).toBe('in_progress');

    const retry = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ name: 'now editable' });
    expect(retry.status).toBe(200);
  });

  test('a teacher cannot unlock', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx, {
      evaluationLocked: true,
      createdBy: ctx.teacher._id,
      createdByRole: 'teacher',
    });

    const res = await request(app)
      .patch(`/api/v1/teacher/test/${exam._id}`)
      .set('Cookie', authCookie(ctx.teacher));
    expect(res.status).toBe(404); // no such teacher route — unlock is admin-only
  });
});

describe('teacher scope', () => {
  const teacherOwned = (ctx, over = {}) =>
    makeExam(ctx, {
      createdBy: ctx.teacher._id,
      createdByRole: 'teacher',
      startDate: new Date(Date.now() + 5 * DAY), // window not open yet
      endDate: new Date(Date.now() + 6 * DAY),
      ...over,
    });

  test('can edit their own test before marks entry opens', async () => {
    const ctx = await seed();
    const exam = await teacherOwned(ctx);

    const res = await request(app)
      .put(`/api/v1/teacher/test/${exam._id}`)
      .set('Cookie', authCookie(ctx.teacher))
      .send({ name: 'corrected name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('corrected name');
  });

  test('can delete their own test before marks entry opens', async () => {
    const ctx = await seed();
    const exam = await teacherOwned(ctx);

    const res = await request(app)
      .delete(`/api/v1/teacher/test/${exam._id}`)
      .set('Cookie', authCookie(ctx.teacher));

    expect(res.status).toBe(200);
    expect(await Exam.countDocuments({})).toBe(0);
  });

  test("cannot touch another teacher's test", async () => {
    const ctx = await seed();
    const exam = await teacherOwned(ctx, { createdBy: ctx.other._id });

    const res = await request(app)
      .put(`/api/v1/teacher/test/${exam._id}`)
      .set('Cookie', authCookie(ctx.teacher))
      .send({ name: 'hijack' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only modify tests you created/i);
  });

  test('cannot edit once marks entry has opened', async () => {
    const ctx = await seed();
    const exam = await teacherOwned(ctx, { startDate: new Date(Date.now() - DAY) });

    const res = await request(app)
      .put(`/api/v1/teacher/test/${exam._id}`)
      .set('Cookie', authCookie(ctx.teacher))
      .send({ name: 'too late' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/already opened/i);
  });

  test('is never offered the destroy-marks confirmation', async () => {
    const ctx = await seed();
    const exam = await teacherOwned(ctx);
    await addMark(ctx, exam, 2);

    const res = await request(app)
      .delete(`/api/v1/teacher/test/${exam._id}?confirmDeleteMarks=2`)
      .set('Cookie', authCookie(ctx.teacher));

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/cannot be deleted by a teacher/i);
    expect(await mongoose.connection.collection('marks').countDocuments({})).toBe(2);
  });
});

describe('audit trail', () => {
  test('records every mutation, and survives the exam it describes', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);

    await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ name: 'renamed' });
    await request(app)
      .patch(`/api/v1/admin/exam/${exam._id}/archive`)
      .set('Cookie', authCookie(ctx.admin));
    await request(app)
      .patch(`/api/v1/admin/exam/${exam._id}/restore`)
      .set('Cookie', authCookie(ctx.admin));
    await request(app)
      .delete(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin));

    const rows = await ExamAuditLog.find({ schoolId: ctx.school._id })
      .sort({ createdAt: 1 })
      .lean();
    expect(rows.map((r) => r.action)).toEqual(['updated', 'archived', 'restored', 'deleted']);

    const updated = rows[0];
    expect(updated.before.name).toBe('unit test 2');
    expect(updated.after.name).toBe('renamed');
    expect(String(updated.actorId)).toBe(String(ctx.admin._id));

    // The exam is gone; the trail must still say which exam it was
    expect(await Exam.countDocuments({})).toBe(0);
    expect(rows[3].examName).toBe('renamed');

    const api = await request(app)
      .get('/api/v1/admin/exam-audit-log')
      .set('Cookie', authCookie(ctx.admin));
    expect(api.status).toBe(200);
    expect(api.body.data).toHaveLength(4);
  });

  test('is append-only', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);
    await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(ctx.admin))
      .send({ name: 'renamed' });

    await expect(ExamAuditLog.updateOne({}, { $set: { action: 'deleted' } })).rejects.toThrow(
      /append-only/i
    );
    await expect(ExamAuditLog.deleteMany({})).rejects.toThrow(/append-only/i);
  });
});

describe('tenancy', () => {
  test('cannot edit an exam belonging to another school', async () => {
    const ctx = await seed();
    const exam = await makeExam(ctx);

    const otherSchool = await createSchool('SCHOOLB');
    const otherAdmin = await createUser({
      school: otherSchool,
      role: 'admin',
      email: 'admin@b.com',
    });

    const res = await request(app)
      .put(`/api/v1/admin/exam/${exam._id}`)
      .set('Cookie', authCookie(otherAdmin))
      .send({ name: 'cross-tenant' });

    expect(res.status).toBe(404);
    expect((await Exam.findById(exam._id)).name).toBe('unit test 2');
  });
});
