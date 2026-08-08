const AcademicSession = require('../models/AcademicSession');
const ClassModel = require('../models/ClassModel');
const SectionModel = require('../models/SectionModel');
const ApiError = require('../../../core/http/ApiError');
const logger = require('../../../core/logging/logger.js');

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

const copyClassesToSession = async ({ targetSessionId, fromSessionId, schoolId, copiedBy }) => {
  const targetSession = await AcademicSession.findOne({ _id: targetSessionId, schoolId });
  if (!targetSession) throw ApiError.notFound('Target session not found');

  // Default source: the most recently created session that is NOT the target
  let sourceSessionId = fromSessionId || null;
  if (!sourceSessionId) {
    const prevSession = await AcademicSession.findOne({
      schoolId,
      _id: { $ne: targetSessionId },
    }).sort({ createdAt: -1 });
    if (!prevSession) {
      throw ApiError.badRequest('No previous session found to copy classes from');
    }
    sourceSessionId = prevSession._id;
  }

  const sourceClasses = await ClassModel.find({ session: sourceSessionId, schoolId }).lean();
  if (sourceClasses.length === 0) {
    throw ApiError.badRequest('No classes found in the source session to copy');
  }

  let classesCreated = 0;
  let sectionsCreated = 0;
  let classesSkipped = 0;

  const classIdMap = {};

  for (const srcClass of sourceClasses) {
    try {
      const existingClass = await ClassModel.findOne({
        name: srcClass.name,
        session: targetSessionId,
        schoolId,
      });

      if (existingClass) {
        classIdMap[srcClass._id.toString()] = existingClass._id;
        classesSkipped++;
      } else {
        const newClass = await ClassModel.create({
          name: srcClass.name,
          numericOrder: srcClass.numericOrder,
          session: targetSessionId,
          schoolId,
        });
        classIdMap[srcClass._id.toString()] = newClass._id;
        classesCreated++;
      }
    } catch (err) {
      if (err.code === 11000) {
        const existingClass = await ClassModel.findOne({
          name: srcClass.name,
          session: targetSessionId,
          schoolId,
        });
        if (existingClass) classIdMap[srcClass._id.toString()] = existingClass._id;
        classesSkipped++;
      } else {
        throw err;
      }
    }
  }

  const sourceSections = await SectionModel.find({ session: sourceSessionId, schoolId }).lean();

  for (const srcSection of sourceSections) {
    const newClassId = classIdMap[srcSection.classId?.toString()];
    if (!newClassId) continue;

    const exists = await SectionModel.findOne({
      name: srcSection.name,
      classId: newClassId,
      session: targetSessionId,
      schoolId,
    });
    if (exists) continue;

    try {
      await SectionModel.create({
        name: srcSection.name,
        classId: newClassId,
        session: targetSessionId,
        schoolId,
      });
      sectionsCreated++;
    } catch (err) {
      if (err.code !== 11000) throw err; // skip duplicates silently
    }
  }

  logger.info('Classes copied to new session', {
    schoolId,
    targetSessionId,
    sourceSessionId,
    classesCreated,
    classesSkipped,
    sectionsCreated,
    copiedBy,
  });

  return { targetSession, classesCreated, classesSkipped, sectionsCreated };
};

module.exports = {
  createSession,
  listSessions,
  findActiveSession,
  updateSession,
  copyClassesToSession,
};
