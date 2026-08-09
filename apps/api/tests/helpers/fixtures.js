const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { School } = require('../../src/modules/tenancy');
const { User } = require('../../src/modules/identity');

const PASSWORD = 'test-password-123';

const createSchool = async (code, name = `${code} School`) =>
  School.create({ code, name, isActive: true });

// authController compares with bcryptjs, and the model has no hashing hook, so
// the fixture has to hash the same way the real signup path does.
const createUser = async ({ school, role = 'admin', email }) => {
  const user = await User.create({
    firstName: role,
    lastName: 'User',
    email,
    password: await bcryptjs.hash(PASSWORD, 10),
    role,
    schoolId: school._id,
    isActive: true,
    isVerified: true,
  });
  return user;
};

// authenticate.js reads req.cookies.token and looks up decoded.userid, so a
// signed token is a complete stand-in for going through the login route.
const authCookie = (user) =>
  `token=${jwt.sign({ userid: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;

// StudentProfile demands a dozen required fields the tenant filter never reads.
// Inserting through the driver keeps the fixture to the fields under test.
const insertStudent = async ({ school, firstName, rollNo }) =>
  mongoose.connection.collection('studentprofiles').insertOne({
    schoolId: school._id,
    firstName,
    lastName: 'Student',
    rollNo,
    status: 'active',
    isDeleted: false,
    createdAt: new Date(),
  });

module.exports = { PASSWORD, createSchool, createUser, authCookie, insertStudent };
