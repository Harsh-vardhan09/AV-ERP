const AcademicSession = require('../models/AcademicSession');

const createSession = async ({ name, startDate, endDate, isActive, schoolId }) =>
  AcademicSession.create({ name, startDate, endDate, isActive, schoolId });

const listSessions = async ({ schoolId }) =>
  AcademicSession.find({ schoolId }).sort({ createdAt: -1 });

// Graceful fallback: if none is marked active, return the most recently created one
const findActiveSession = async ({ schoolId }) => {
  const active = await AcademicSession.findOne({ isActive: true, schoolId });
  if (active) return active;
  return AcademicSession.findOne({ schoolId }).sort({ createdAt: -1 });
};

// Uses .save(), not findOneAndUpdate: the pre-save hook deactivates every other
// session for this school when isActive is set true
const updateSession = async ({ id, schoolId, updateFields }) => {
  const session = await AcademicSession.findOne({ _id: id, schoolId });
  if (!session) return null;

  Object.assign(session, updateFields);
  await session.save();
  return session;
};

module.exports = { createSession, listSessions, findActiveSession, updateSession };
