const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');

const DailyAttendance = require('../src/modules/attendance/models/DailyAttendance');
const { toSchoolDay, toDayKey } = require('../src/modules/attendance/lib/schoolDay');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const db = (c) => mongoose.connection.collection(c);

const seed = async ({ withClassTeacher = true } = {}) => {
  const school = await createSchool('SCHOOLA');
  const admin = await createUser({ school, role: 'admin', email: 'admin@a.com' });
  const classTeacher = await createUser({ school, role: 'teacher', email: 'ct@a.com' });
  const subjectTeacher = await createUser({ school, role: 'teacher', email: 'st@a.com' });
  const studentUser = await createUser({ school, role: 'student', email: 'stu@a.com' });

  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const session = new mongoose.Types.ObjectId();

  await db('classmodels').insertOne({
    _id: classId,
    name: '9',
    numericOrder: 9,
    schoolId: school._id,
  });
  await db('sectionmodels').insertOne({ _id: sectionId, name: 'A', classId, schoolId: school._id });
  await db('academicsessions').insertOne({
    _id: session,
    name: '2025-2026',
    isActive: true,
    schoolId: school._id,
  });
  await db('schoolsettings').insertOne({ schoolId: school._id, timezone: 'Asia/Kolkata' });

  const studentIds = [];
  // The first profile is linked to the signed-in student user; the second gets
  // its own id so the two rows do not collide on the (userId, schoolId) index.
  const owners = [studentUser._id, new mongoose.Types.ObjectId()];
  for (let i = 0; i < owners.length; i++) {
    const _id = new mongoose.Types.ObjectId();
    studentIds.push(_id);
    await db('studentprofiles').insertOne({
      _id,
      userId: owners[i],
      schoolId: school._id,
      firstName: `Student${i + 1}`,
      lastName: 'S',
      rollNo: String(i + 1),
      admissionNumber: `ADM-${i + 1}`,
      scholarNo: `SC-${i + 1}`,
      studentId: `STU-${i + 1}`,
      classId,
      sectionId,
      session,
      status: 'active',
      isDeleted: false,
    });
  }

  if (withClassTeacher) {
    await db('classteacherassignments').insertOne({
      teacherId: classTeacher._id,
      classId,
      sectionId,
      session,
      schoolId: school._id,
    });
  }

  return {
    school,
    admin,
    classTeacher,
    subjectTeacher,
    studentUser,
    classId,
    sectionId,
    session,
    studentIds,
  };
};

const markBody = (ctx, date, statuses) => ({
  classId: String(ctx.classId),
  sectionId: String(ctx.sectionId),
  session: String(ctx.session),
  date,
  entries: ctx.studentIds.map((id, i) => ({ studentId: String(id), status: statuses[i] })),
});

describe('who may mark', () => {
  test('the assigned class teacher can', async () => {
    const ctx = await seed();
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(markBody(ctx, '2025-09-10', ['present', 'absent']));

    expect(res.status).toBe(201);
    expect(await DailyAttendance.countDocuments({})).toBe(2);
  });

  test('a subject teacher gets a 403 that names the class teacher', async () => {
    const ctx = await seed();
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.subjectTeacher))
      .send(markBody(ctx, '2025-09-10', ['present', 'present']));

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/class teacher/i);
    expect(await DailyAttendance.countDocuments({})).toBe(0);
  });

  test('an admin can mark a section with no class teacher', async () => {
    const ctx = await seed({ withClassTeacher: false });
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.admin))
      .send(markBody(ctx, '2025-09-10', ['present', 'late']));

    expect(res.status).toBe(201);
  });

  test('a teacher cannot mark an unassigned section', async () => {
    const ctx = await seed({ withClassTeacher: false });
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(markBody(ctx, '2025-09-10', ['present', 'present']));

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/no class teacher/i);
  });

  test('a student cannot mark at all', async () => {
    const ctx = await seed();
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.studentUser))
      .send(markBody(ctx, '2025-09-10', ['present', 'present']));

    expect(res.status).toBe(403);
  });
});

describe('one row per student per day', () => {
  // The flaky-mobile case: the same submit arrives twice.
  test('a repeated submit updates rather than duplicating', async () => {
    const ctx = await seed();
    const body = markBody(ctx, '2025-09-10', ['present', 'absent']);

    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(body);
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(body);

    expect(await DailyAttendance.countDocuments({})).toBe(2);
  });

  test('two simultaneous submits still produce one row each', async () => {
    const ctx = await seed();
    const body = markBody(ctx, '2025-09-10', ['present', 'absent']);
    const send = () =>
      request(app)
        .post('/api/v1/attendance/mark')
        .set('Cookie', authCookie(ctx.classTeacher))
        .send(body);

    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status].every((s) => s === 201)).toBe(true);
    expect(await DailyAttendance.countDocuments({})).toBe(2);
  });

  test('the database refuses a second row for the same student-day', async () => {
    const ctx = await seed();
    await DailyAttendance.syncIndexes();
    const base = {
      schoolId: ctx.school._id,
      studentId: ctx.studentIds[0],
      date: toSchoolDay('2025-09-10'),
      classId: ctx.classId,
      sectionId: ctx.sectionId,
      session: ctx.session,
      markedBy: ctx.classTeacher._id,
    };
    await DailyAttendance.create({ ...base, status: 'present' });
    await expect(DailyAttendance.create({ ...base, status: 'absent' })).rejects.toThrow(
      /duplicate key/i
    );
  });

  test('the same day can be corrected', async () => {
    const ctx = await seed();
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(markBody(ctx, '2025-09-10', ['present', 'present']));
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(markBody(ctx, '2025-09-10', ['absent', 'present']));

    const row = await DailyAttendance.findOne({ studentId: ctx.studentIds[0] });
    expect(row.status).toBe('absent');
    expect(await DailyAttendance.countDocuments({})).toBe(2);
  });
});

describe('school-local day boundary', () => {
  // Render is UTC, the school is IST. 19:00 IST on the 10th is 13:30 UTC on the
  // 10th — but 23:00 IST is 17:30 UTC, and a naive local-midnight calculation
  // would push an evening mark onto the next day.
  test('an evening instant resolves to the same school day', () => {
    const evening = new Date('2025-09-10T18:30:00.000Z'); // 00:00 IST on the 11th
    expect(toDayKey(toSchoolDay(evening, 'Asia/Kolkata'))).toBe('2025-09-11');

    const earlier = new Date('2025-09-10T17:00:00.000Z'); // 22:30 IST on the 10th
    expect(toDayKey(toSchoolDay(earlier, 'Asia/Kolkata'))).toBe('2025-09-10');
  });

  test('a bare YYYY-MM-DD is never shifted by a timezone', () => {
    expect(toDayKey(toSchoolDay('2025-09-10', 'Asia/Kolkata'))).toBe('2025-09-10');
    expect(toDayKey(toSchoolDay('2025-09-10', 'America/New_York'))).toBe('2025-09-10');
  });

  test('an unknown timezone falls back rather than throwing', () => {
    expect(toDayKey(toSchoolDay(new Date('2025-09-10T12:00:00Z'), 'Not/AZone'))).toBe('2025-09-10');
  });

  test('a future date is refused', async () => {
    const ctx = await seed();
    const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(markBody(ctx, future, ['present', 'present']));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/future/i);
  });
});

describe('the marking screen', () => {
  test('shows the roster, whether the day is marked, and by whom', async () => {
    const ctx = await seed();
    const before = await request(app)
      .get(
        `/api/v1/attendance/section-day?classId=${ctx.classId}&sectionId=${ctx.sectionId}&session=${ctx.session}&date=2025-09-10`
      )
      .set('Cookie', authCookie(ctx.classTeacher));

    expect(before.body.data.roster).toHaveLength(2);
    expect(before.body.data.isMarked).toBe(false);
    expect(before.body.data.markedBy).toBeNull();
    expect(before.body.data.classTeacher.name).toMatch(/teacher/i);

    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(markBody(ctx, '2025-09-10', ['present', 'absent']));

    const after = await request(app)
      .get(
        `/api/v1/attendance/section-day?classId=${ctx.classId}&sectionId=${ctx.sectionId}&session=${ctx.session}&date=2025-09-10`
      )
      .set('Cookie', authCookie(ctx.classTeacher));

    expect(after.body.data.isMarked).toBe(true);
    expect(after.body.data.markedBy.name).toBeTruthy();
    expect(after.body.data.roster.map((r) => r.status)).toEqual(['present', 'absent']);
  });
});

describe('student view', () => {
  test('a student reads their own attendance and percentage', async () => {
    const ctx = await seed();
    for (const [d, s] of [
      ['2025-09-08', 'present'],
      ['2025-09-09', 'absent'],
      ['2025-09-10', 'present'],
    ]) {
      await request(app)
        .post('/api/v1/attendance/mark')
        .set('Cookie', authCookie(ctx.classTeacher))
        .send(markBody(ctx, d, [s, 'present']));
    }

    const res = await request(app)
      .get('/api/v1/attendance/me?year=2025&month=9')
      .set('Cookie', authCookie(ctx.studentUser));

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toMatchObject({
      totalDays: 3,
      presentDays: 2,
      absentDays: 1,
      percentage: 67,
    });
    expect(res.body.data.month.days).toHaveLength(3);
  });

  // Strict scoping: identity comes from the token, so there is no id to tamper with.
  test('a student cannot read another student by passing an id', async () => {
    const ctx = await seed();
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(ctx.classTeacher))
      .send(markBody(ctx, '2025-09-10', ['present', 'absent']));

    const res = await request(app)
      .get(`/api/v1/attendance/student/${ctx.studentIds[1]}`)
      .set('Cookie', authCookie(ctx.studentUser));
    expect(res.status).toBe(403);

    // …and /me ignores any id it is handed
    const mine = await request(app)
      .get(`/api/v1/attendance/me?studentId=${ctx.studentIds[1]}`)
      .set('Cookie', authCookie(ctx.studentUser));
    expect(mine.body.data.summary.presentDays).toBe(1);
    expect(mine.body.data.summary.absentDays).toBe(0);
  });

  test('leave is excluded from the denominator, late counts as attended', async () => {
    const ctx = await seed();
    for (const [d, s] of [
      ['2025-09-08', 'present'],
      ['2025-09-09', 'leave'],
      ['2025-09-10', 'late'],
    ]) {
      await request(app)
        .post('/api/v1/attendance/mark')
        .set('Cookie', authCookie(ctx.classTeacher))
        .send(markBody(ctx, d, [s, 'present']));
    }
    const res = await request(app)
      .get('/api/v1/attendance/me')
      .set('Cookie', authCookie(ctx.studentUser));

    expect(res.body.data.summary).toMatchObject({
      totalDays: 3,
      countedDays: 2,
      leaveDays: 1,
      percentage: 100,
    });
  });
});

describe('admin oversight', () => {
  test('sections with no class teacher are visible', async () => {
    const ctx = await seed({ withClassTeacher: false });
    const res = await request(app)
      .get(`/api/v1/attendance/unassigned-sections?session=${ctx.session}`)
      .set('Cookie', authCookie(ctx.admin));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ sectionName: 'A', lastMarkedOn: null });
  });

  test('an assigned section is not listed', async () => {
    const ctx = await seed({ withClassTeacher: true });
    const res = await request(app)
      .get(`/api/v1/attendance/unassigned-sections?session=${ctx.session}`)
      .set('Cookie', authCookie(ctx.admin));
    expect(res.body.data).toHaveLength(0);
  });
});

describe('tenancy', () => {
  test('another school cannot mark this section', async () => {
    const ctx = await seed();
    const other = await createSchool('SCHOOLB');
    const otherAdmin = await createUser({ school: other, role: 'admin', email: 'b@b.com' });

    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Cookie', authCookie(otherAdmin))
      .send(markBody(ctx, '2025-09-10', ['present', 'present']));

    expect(res.status).toBe(400); // students are not in the other school's section
    expect(await DailyAttendance.countDocuments({})).toBe(0);
  });
});
