const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const connect = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

const models = () => ({
  School: require('../../src/modules/tenancy/models/School'),
  SchoolSettings: require('../../src/modules/tenancy/models/SchoolSettings'),
  User: require('../../src/modules/identity/models/user').User,
  StudentProfile: require('../../src/modules/people').StudentProfile,
  ClassModel: require('../../src/modules/academics').ClassModel,
  SectionModel: require('../../src/modules/academics').SectionModel,
  AcademicSession: require('../../src/modules/academics').AcademicSession,
});

// Every module key enabled: checkModuleAccess reads this and 403s otherwise, which
// would mask the thing each test is actually asserting.
const ALL_MODULES = {
  fee_management: true,
  report_cards: true,
  admissions: true,
  documents: true,
  library: true,
  biometric: true,
  oases: true,
};

// A school with an admin, an operator, a session, a class and a section.
const seedSchool = async ({ code, name }) => {
  const { School, SchoolSettings, ClassModel, SectionModel, AcademicSession } = models();

  const school = await School.create({ name, code, isActive: true });
  await SchoolSettings.create({ schoolId: school._id, modules: ALL_MODULES });

  const session = await AcademicSession.create({
    name: '2025-26',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2026-03-31'),
    isActive: true,
    schoolId: school._id,
  });

  const klass = await ClassModel.create({
    name: 'Class 10',
    numericOrder: 10,
    session: session._id,
    schoolId: school._id,
  });

  const section = await SectionModel.create({
    name: 'A',
    classId: klass._id,
    session: session._id,
    schoolId: school._id,
  });

  return { school, session, klass, section };
};

const PASSWORD = 'Test@12345';

const seedUser = async ({ school, role, email, firstName = 'Test', lastName = 'User' }) => {
  const { User } = models();
  return User.create({
    firstName,
    lastName,
    email,
    password: await bcryptjs.hash(PASSWORD, 10),
    role,
    schoolId: school._id,
    isActive: true,
    isVerified: true,
  });
};

const seedStudent = async ({ school, session, klass, section, firstName, email }) => {
  const { StudentProfile } = models();
  const user = await seedUser({ school, role: 'student', email, firstName });

  const profile = await StudentProfile.create({
    userId: user._id,
    firstName,
    lastName: 'Student',
    dateOfBirth: new Date('2010-05-05'),
    classId: klass._id,
    sectionId: section._id,
    session: session._id,
    address: '1 Test Road',
    parentDetails: { father: { name: 'Father Name', phone: '9800000001' } },
    schoolId: school._id,
    status: 'active',
  });

  return { user, profile };
};

// Logs in through the real endpoint so the cookie under test is the one the app
// issues, not one the test minted.
const login = async (request, app, { schoolCode, email }) => {
  const res = await request(app)
    .post('/api/v1/user/login')
    .field('schoolCode', schoolCode)
    .field('email', email)
    .field('password', PASSWORD);

  const cookies = res.headers['set-cookie'] || [];
  return { res, cookie: cookies.find((c) => c.startsWith('token=')) };
};

module.exports = {
  connect,
  disconnect,
  models,
  seedSchool,
  seedUser,
  seedStudent,
  login,
  PASSWORD,
};
