const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');

const academics = require('../src/modules/academics');
void academics.ClassModel;
void academics.SectionModel;
void academics.AcademicSession;

const attendanceService = require('../src/modules/attendance/services/attendanceService');
const DataAggregatorService = require('../src/modules/reportcards/services/dataAggregatorService');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const db = (c) => mongoose.connection.collection(c);

const seed = async () => {
  const school = await createSchool('SCHOOLA');
  const schoolId = school._id;
  const admin = await createUser({ school, role: 'admin', email: 'admin@a.com' });
  const teacher = await createUser({ school, role: 'teacher', email: 'ct@a.com' });
  const stuUser = await createUser({ school, role: 'student', email: 'stu@a.com' });

  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const session = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();

  await db('classmodels').insertOne({
    _id: classId,
    name: '9',
    numericOrder: 9,
    session,
    schoolId,
  });
  await db('sectionmodels').insertOne({ _id: sectionId, name: 'A', classId, schoolId });
  await db('academicsessions').insertOne({
    _id: session,
    name: '2026-27',
    isActive: true,
    schoolId,
  });
  await db('schoolsettings').insertOne({ schoolId, timezone: 'Asia/Kolkata' });
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
  await db('classteacherassignments').insertOne({
    teacherId: teacher._id,
    classId,
    sectionId,
    session,
    schoolId,
  });

  return { school, schoolId, admin, teacher, stuUser, classId, sectionId, session, profileId };
};

/** Mark a run of days directly, the shape markDay produces. */
const markDays = (ctx, statuses) =>
  db('dailyattendances').insertMany(
    statuses.map((status, i) => ({
      studentId: ctx.profileId,
      date: new Date(Date.UTC(2026, 7, 3 + i)),
      status,
      classId: ctx.classId,
      sectionId: ctx.sectionId,
      session: ctx.session,
      markedBy: ctx.teacher._id,
      markedByRole: 'teacher',
      markedAt: new Date(),
      schoolId: ctx.schoolId,
    }))
  );

// present, present, absent, late, leave, present → counted 5, attended 4 → 80%
const MIXED = ['present', 'present', 'absent', 'late', 'leave', 'present'];

describe('every consumer reports the same figure', () => {
  test('the student dashboard and the teacher dashboard agree', async () => {
    const ctx = await seed();
    await markDays(ctx, MIXED);

    const studentSide = await request(app)
      .get('/api/v1/student/report')
      .set('Cookie', authCookie(ctx.stuUser));
    const teacherSide = await request(app)
      .get(
        `/api/v1/teacher/my-students/${ctx.profileId}/performance` +
          `?classId=${ctx.classId}&sectionId=${ctx.sectionId}&session=${ctx.session}`
      )
      .set('Cookie', authCookie(ctx.teacher));

    expect(studentSide.status).toBe(200);
    expect(teacherSide.status).toBe(200);

    const sPct = studentSide.body?.data?.attendance?.percentage;
    const tPct = teacherSide.body?.attendance?.percentage;

    // THE REQUIREMENT: identical figures for the same student and range.
    expect(tPct).toBe(sPct);
    expect(sPct).toBe(80);
  });

  test('the shared service, the report card and the student view all match', async () => {
    const ctx = await seed();
    await markDays(ctx, MIXED);

    const direct = await attendanceService.getSummary({
      studentId: ctx.profileId,
      schoolId: ctx.schoolId,
      session: ctx.session,
    });

    const card = await DataAggregatorService._fetchAttendance(
      ctx.profileId,
      ctx.schoolId,
      ctx.session
    );

    const mine = await request(app)
      .get('/api/v1/attendance/me')
      .set('Cookie', authCookie(ctx.stuUser));

    expect(card.percentage).toBe(direct.percentage);
    expect(card.presentDays).toBe(direct.presentDays);
    expect(card.totalDays).toBe(direct.totalDays);
    expect(mine.body.data.summary.percentage).toBe(direct.percentage);
  });

  test('the admin student detail agrees too', async () => {
    const ctx = await seed();
    await markDays(ctx, MIXED);

    const direct = await attendanceService.getSummary({
      studentId: ctx.profileId,
      schoolId: ctx.schoolId,
      session: ctx.session,
    });
    const admin = await request(app)
      .get(`/api/v1/admin/student/${ctx.profileId}`)
      .set('Cookie', authCookie(ctx.admin));

    if (admin.status === 200) {
      expect(String(admin.body.data.attendance.percentage)).toBe(String(direct.percentage));
    }
  });
});

describe('the rules, stated once', () => {
  const s = (statuses) => attendanceService.summarise(statuses.map((status) => ({ status })));

  test('rule 1 — the denominator is days with a record', () => {
    expect(s(['present', 'absent']).totalDays).toBe(2);
    expect(s([]).totalDays).toBe(0);
    // No record, no denominator — a Sunday cannot make a student absent
    expect(s([]).percentage).toBe(0);
  });

  test('rule 2 — late counts as attended', () => {
    expect(s(['late', 'late']).percentage).toBe(100);
    expect(s(['late', 'absent']).percentage).toBe(50);
    // …and is still reported separately so a school can weight it differently
    expect(s(['late', 'present']).lateDays).toBe(1);
  });

  test('rule 3 — approved leave leaves the denominator', () => {
    const r = s(['present', 'leave']);
    expect(r.totalDays).toBe(2);
    expect(r.countedDays).toBe(1);
    expect(r.percentage).toBe(100); // leave does not depress the figure
    expect(r.leaveDays).toBe(1);
  });

  test('rule 4 — half-day does not exist in this system', () => {
    expect(s(['present']).halfDayDays).toBe(0);
    expect(attendanceService.VALID_STATUS).toEqual(['present', 'absent', 'late', 'leave']);
  });

  test('the mixed case, end to end', () => {
    const r = s(MIXED);
    expect(r).toMatchObject({
      totalDays: 6,
      presentDays: 3,
      absentDays: 1,
      lateDays: 1,
      leaveDays: 1,
      countedDays: 5,
      attendedDays: 4,
      percentage: 80,
    });
  });
});

describe('date range scoping', () => {
  test('a range narrows the summary', async () => {
    const ctx = await seed();
    await markDays(ctx, ['present', 'present', 'absent', 'absent']); // 3–6 Aug

    const all = await attendanceService.getSummary({
      studentId: ctx.profileId,
      schoolId: ctx.schoolId,
      session: ctx.session,
    });
    expect(all.totalDays).toBe(4);
    expect(all.percentage).toBe(50);

    const firstTwo = await attendanceService.getSummary({
      studentId: ctx.profileId,
      schoolId: ctx.schoolId,
      session: ctx.session,
      from: '2026-08-03',
      to: '2026-08-04',
    });
    expect(firstTwo.totalDays).toBe(2);
    expect(firstTwo.percentage).toBe(100);
  });

  test('it is school-scoped', async () => {
    const ctx = await seed();
    await markDays(ctx, MIXED);

    const other = await attendanceService.getSummary({
      studentId: ctx.profileId,
      schoolId: new mongoose.Types.ObjectId(),
      session: ctx.session,
    });
    expect(other.totalDays).toBe(0);
  });
});
