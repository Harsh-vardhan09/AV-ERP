const AcademicSession = require('../models/AcademicSession');

const createSession = async ({ name, startDate, endDate, isActive, schoolId }) =>
  AcademicSession.create({ name, startDate, endDate, isActive, schoolId });

module.exports = { createSession };
