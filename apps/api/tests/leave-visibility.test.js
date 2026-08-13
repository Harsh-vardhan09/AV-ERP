const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const seedClassroom = async (school) => {
  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const session = new mongoose.Types.ObjectId();
  const db = mongoose.connection.collection.bind(mongoose.connection);

  await db('classmodels').insertOne({ _id: classId, name: '9', numericOrder: 9 });
  await db('sectionmodels').insertOne({ _id: sectionId, name: 'A' });
  await db('academicsessions').insertOne({ _id: session, name: '2026-27', isActive: true });

  return { classId, sectionId, session };
};

test('a student leave reaches the class teacher approval list', async () => {
  const school = await createSchool('SCHOOLA');
  const { classId, sectionId, session } = await seedClassroom(school);

  const student = await createUser({ school, role: 'student', email: 'student@a.com' });
  const teacher = await createUser({ school, role: 'teacher', email: 'teacher@a.com' });

  await mongoose.connection.collection('studentprofiles').insertOne({
    userId: student._id,
    schoolId: school._id,
    firstName: 'Amara',
    lastName: 'Student',
    rollNo: 'A-1',
    classId,
    sectionId,
    session,
    status: 'active',
    isDeleted: false,
    createdAt: new Date(),
  });

  await mongoose.connection.collection('classteacherassignments').insertOne({
    teacherId: teacher._id,
    classId,
    sectionId,
    session,
    schoolId: school._id,
    createdAt: new Date(),
  });

  const applied = await request(app)
    .post('/api/v1/student/leave/apply')
    .set('Cookie', authCookie(student))
    .send({
      leaveType: 'sick',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      reason: 'Fever',
    });

  expect(applied.status).toBe(201);
  // The field whose absence was the bug — asserted directly so a regression
  // reads as "schoolId dropped" rather than "teacher list empty"
  expect(String(applied.body.data.schoolId)).toBe(String(school._id));

  const approvalList = await request(app)
    .get('/api/v1/teacher/leave/students')
    .set('Cookie', authCookie(teacher));

  expect(approvalList.status).toBe(200);
  expect(approvalList.body.data).toHaveLength(1);
  expect(approvalList.body.data[0].reason).toBe('Fever');
  expect(approvalList.body.data[0].status).toBe('pending');

  // The student still sees it too — listLeavesForUser now filters on schoolId
  const mine = await request(app)
    .get('/api/v1/student/leave/my')
    .set('Cookie', authCookie(student));

  expect(mine.status).toBe(200);
  expect(mine.body.data).toHaveLength(1);
});

test("a class teacher's approval list excludes another school's leave", async () => {
  const schoolA = await createSchool('SCHOOLA');
  const schoolB = await createSchool('SCHOOLB');
  const { classId, sectionId, session } = await seedClassroom(schoolA);

  const teacherA = await createUser({ school: schoolA, role: 'teacher', email: 'teacher@a.com' });

  await mongoose.connection.collection('classteacherassignments').insertOne({
    teacherId: teacherA._id,
    classId,
    sectionId,
    session,
    schoolId: schoolA._id,
    createdAt: new Date(),
  });

  // Same class/section ids, different tenant: only schoolId separates them
  await mongoose.connection.collection('leaves').insertOne({
    appliedBy: new mongoose.Types.ObjectId(),
    role: 'student',
    leaveType: 'casual',
    startDate: new Date(),
    endDate: new Date(),
    reason: 'Other school leave',
    classId,
    sectionId,
    session,
    status: 'pending',
    schoolId: schoolB._id,
    createdAt: new Date(),
  });

  const res = await request(app)
    .get('/api/v1/teacher/leave/students')
    .set('Cookie', authCookie(teacherA));

  expect(res.status).toBe(200);
  expect(res.body.data).toEqual([]);
});
