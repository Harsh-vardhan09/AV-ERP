const AcademicSession = require('../models/AcademicSession');

const createSession = async ({ name, startDate, endDate, isActive, schoolId }) =>
  AcademicSession.create({ name, startDate, endDate, isActive, schoolId });

const listSessions = async ({ schoolId }) =>
  AcademicSession.find({ schoolId }).sort({ createdAt: -1 });

module.exports = { createSession, listSessions };
