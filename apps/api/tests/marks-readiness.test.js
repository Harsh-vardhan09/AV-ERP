const mongoose = require('mongoose');

const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser } = require('./helpers/fixtures');

// Registers every model the aggregator/readiness path populates by ref name.
require('../src/app');

const { getExamReadiness } = require('../src/modules/examination/services/marksReadinessService');
const DataAggregator = require('../src/modules/reportcards/services/dataAggregatorService');
const Marks = require('../src/modules/examination/models/MarksModel');
const { Exam, ExamSubjectConfig } = require('../src/modules/examination');
const { ClassSubjectMap, AcademicSession } = require('../src/modules/academics');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const oid = () => new mongoose.Types.ObjectId();

/**
 * One class, one subject, one exam, two students. Only the students named in
 * `withMarks` get a marks document.
 */
const seedClass = async ({ marksFor = {} } = {}) => {
  const school = await createSchool('READY');
  const schoolId = school._id;
  const classId = oid();
  const sectionId = oid();
  const subjectId = oid();
  const c = mongoose.connection.collection.bind(mongoose.connection);

  await c('classmodels').insertOne({ _id: classId, name: '10', numericOrder: 10, schoolId });
  await c('sectionmodels').insertOne({ _id: sectionId, name: 'A', schoolId });
  await c('subjectmasters').insertOne({
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

  const makeStudent = async (first) => {
    const user = await createUser({ school, role: 'student', email: `${first}@ready.com` });
    await c('studentprofiles').insertOne({
      userId: user._id,
      schoolId,
      firstName: first,
      lastName: 'S',
      rollNo: first,
      // studentprofiles carries unique indexes on scholarNo+schoolId and
      // studentId+schoolId, neither sparse. Two fixtures both defaulting to null
      // collide, and the indexes survive helpers/db.clear(), so whether it fires
      // depends on suite order. Give both fields a distinct value.
      scholarNo: `SC-${first}`,
      studentId: `STU-${first}`,
      admissionNumber: `A-${first}`,
      dateOfBirth: new Date('2009-01-01'),
      classId,
      sectionId,
      session: session._id,
      status: 'active',
      isDeleted: false,
      createdAt: new Date(),
    });
    return { user, profile: await c('studentprofiles').findOne({ userId: user._id }) };
  };

  const amara = await makeStudent('amara');
  const bilal = await makeStudent('bilal');

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
    marksDistribution: [{ type: 'theory', label: 'Theory', maxMarks: 100 }],
  });

  const students = { amara, bilal };
  for (const [who, fields] of Object.entries(marksFor)) {
    await Marks.create({
      examId: exam._id,
      studentId: students[who].profile._id,
      subjectId,
      classId,
      sectionId,
      session: session._id,
      schoolId,
      uploadedBy: oid(),
      marksType: 'fields',
      fields,
    });
  }

  return { schoolId, classId, sectionId, session, exam, amara, bilal };
};

const readiness = (s, extra = {}) =>
  getExamReadiness({
    examId: s.exam._id,
    classId: s.classId,
    schoolId: s.schoolId,
    sessionId: s.session._id,
    ...extra,
  });

// The gate and the card must answer the same question about the same student.
// Class scope says "someone uploaded", which let a student with no marks of
// their own through to a report card full of zeros.
test("student scope does not inherit a classmate's marks", async () => {
  const s = await seedClass({ marksFor: { amara: { theory: 88 } } });

  const classScope = await readiness(s);
  expect(classScope.scope).toBe('class');
  expect(classScope.ready).toBe(true); // unchanged: someone did upload

  const amaraGate = await readiness(s, {
    studentId: s.amara.user._id,
    studentProfileId: s.amara.profile._id,
  });
  const bilalGate = await readiness(s, {
    studentId: s.bilal.user._id,
    studentProfileId: s.bilal.profile._id,
  });

  expect(amaraGate.scope).toBe('student');
  expect(amaraGate.ready).toBe(true);
  expect(bilalGate.ready).toBe(false); // was true — the bug
  expect(bilalGate.missing.map((m) => m.name)).toEqual(['Mathematics']);

  // and the gate now agrees with what the card would actually render
  const bilalCard = await DataAggregator.getStudentSnapshot({
    studentId: s.bilal.profile._id,
    schoolId: s.schoolId,
    sessionId: s.session._id,
    examType: 'annual',
  });
  expect((bilalCard.subjects || [])[0]?.grandObt).toBe(0);
});

// distinct('subjectId') counted a document, not a mark.
test('a marks document with no usable value is not "submitted"', async () => {
  const s = await seedClass({ marksFor: { amara: {} } });

  expect(await Marks.countDocuments({})).toBe(1); // the shell exists

  const classScope = await readiness(s);
  expect(classScope.ready).toBe(false); // was true — the bug
  expect(classScope.submittedCount).toBe(0);

  const amaraGate = await readiness(s, {
    studentId: s.amara.user._id,
    studentProfileId: s.amara.profile._id,
  });
  expect(amaraGate.ready).toBe(false);
});

// 0 is a real mark. Number(null) is also 0, which is why the check is explicit.
test('a mark of zero counts as submitted', async () => {
  const s = await seedClass({ marksFor: { amara: { theory: 0 } } });

  const gate = await readiness(s, {
    studentId: s.amara.user._id,
    studentProfileId: s.amara.profile._id,
  });
  expect(gate.ready).toBe(true);
  expect(gate.submittedCount).toBe(1);
});

// Student scope goes through MarksSourceService, which resolves both ids.
test('student scope finds marks keyed by User._id', async () => {
  const s = await seedClass();
  await Marks.create({
    examId: s.exam._id,
    studentId: s.bilal.user._id, // User._id, not StudentProfile._id
    subjectId: (await ClassSubjectMap.findOne({ classId: s.classId }).lean()).subjectId,
    classId: s.classId,
    sectionId: s.sectionId,
    session: s.session._id,
    schoolId: s.schoolId,
    uploadedBy: oid(),
    marksType: 'fields',
    fields: { theory: 61 },
  });

  const gate = await readiness(s, {
    studentId: s.bilal.user._id,
    studentProfileId: s.bilal.profile._id,
  });
  expect(gate.ready).toBe(true);
});
