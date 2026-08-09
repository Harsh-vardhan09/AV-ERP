const AcademicSession = require('../models/AcademicSession');
const ClassModel = require('../models/ClassModel');
const SectionModel = require('../models/SectionModel');
const ClassSubjectMap = require('../models/ClassSubjectMap');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
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

// Resolve the session to copy from: explicit, else the most recently created OTHER
// session for this school
const resolveSourceSession = async ({ fromSessionId, targetSessionId, schoolId, emptyMessage }) => {
  if (fromSessionId) return fromSessionId;
  const prev = await AcademicSession.findOne({
    schoolId,
    _id: { $ne: targetSessionId },
  }).sort({ createdAt: -1 });
  if (!prev) throw ApiError.badRequest(emptyMessage);
  return prev._id;
};

const requireTargetSession = async ({ targetSessionId, schoolId, message }) => {
  const targetSession = await AcademicSession.findOne({ _id: targetSessionId, schoolId });
  if (!targetSession) throw ApiError.notFound(message);
  return targetSession;
};

// insertMany(ordered:false) partially succeeds on duplicate key; the inserted count
// lives on err.result.nInserted
const insertIgnoringDuplicates = async (Model, docs) => {
  if (docs.length === 0) return { copied: 0, skipped: 0 };
  try {
    const r = await Model.insertMany(docs, { ordered: false });
    return { copied: r.length, skipped: 0 };
  } catch (err) {
    if (err.code === 11000) {
      const copied = err.result?.nInserted || 0;
      return { copied, skipped: docs.length - copied };
    }
    throw err;
  }
};

const deleteSession = async ({ sessionId, schoolId }) => {
  // SECURITY: scope by schoolId — prevents cross-school session deletion
  const session = await AcademicSession.findOne({ _id: sessionId, schoolId });
  if (!session) throw ApiError.notFound('Session not found');

  const classCount = await ClassModel.countDocuments({ session: sessionId, schoolId });
  if (classCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete session. ${classCount} class(es) depend on it. Delete them first.`
    );
  }

  const { StudentProfile } = require('../../people');
  const { Exam } = require('../../examination');
  const { Attendance } = require('../../attendance');

  const [studentCount, examCount, attendanceCount] = await Promise.all([
    StudentProfile.countDocuments({ session: sessionId, schoolId, isDeleted: false }),
    Exam.countDocuments({ session: sessionId, schoolId }),
    Attendance.countDocuments({ session: sessionId, schoolId }),
  ]);

  const blockers = [];
  if (studentCount > 0) blockers.push(`${studentCount} student(s)`);
  if (examCount > 0) blockers.push(`${examCount} exam(s)`);
  if (attendanceCount > 0) blockers.push(`${attendanceCount} attendance record(s)`);

  if (blockers.length > 0) {
    throw ApiError.badRequest(
      `Cannot delete this session. It has: ${blockers.join(', ')}. Create a new active session instead of deleting this one.`
    );
  }

  await AcademicSession.findOneAndDelete({ _id: sessionId, schoolId });
};

const syncStudentSessions = async ({ targetSessionId, schoolId, syncedBy }) => {
  const targetSession = await requireTargetSession({
    targetSessionId,
    schoolId,
    message: 'Session not found',
  });

  const sessionClasses = await ClassModel.find({ session: targetSessionId, schoolId })
    .select('_id')
    .lean();
  if (sessionClasses.length === 0) {
    throw ApiError.badRequest('No classes found for this session. Copy classes first.');
  }
  const classIds = sessionClasses.map((c) => c._id);

  const { StudentProfile } = require('../../people');
  const mismatchedStudents = await StudentProfile.find({
    schoolId,
    classId: { $in: classIds },
    session: { $ne: targetSessionId },
    isDeleted: { $ne: true },
    status: { $in: ['active', 'inactive'] },
  })
    .select('_id firstName lastName session')
    .lean();

  if (mismatchedStudents.length === 0) {
    return { targetSession, fixedCount: 0, nothingToFix: true };
  }

  const mismatchedIds = mismatchedStudents.map((s) => s._id);
  const result = await StudentProfile.updateMany(
    { _id: { $in: mismatchedIds }, schoolId },
    { $set: { session: targetSessionId } }
  );

  logger.info('Student sessions synced', {
    schoolId,
    targetSessionId,
    fixedCount: result.modifiedCount,
    syncedBy,
  });

  return { targetSession, fixedCount: result.modifiedCount, nothingToFix: false };
};

const copySubjectMapsToSession = async ({ targetSessionId, fromSessionId, schoolId }) => {
  await requireTargetSession({ targetSessionId, schoolId, message: 'Target session not found' });

  const sourceSessionId = await resolveSourceSession({
    fromSessionId,
    targetSessionId,
    schoolId,
    emptyMessage: 'No previous session found to copy from.',
  });

  const targetClasses = await ClassModel.find({ session: targetSessionId, schoolId }).lean();
  if (targetClasses.length === 0) {
    throw ApiError.badRequest('No classes found in target session. Run "Copy Classes" first.');
  }

  const sourceClasses = await ClassModel.find({ session: sourceSessionId, schoolId }).lean();
  const sourceClassById = {};
  sourceClasses.forEach((c) => {
    sourceClassById[c._id.toString()] = c;
  });
  const targetClassByName = {};
  targetClasses.forEach((c) => {
    targetClassByName[c.name] = c._id;
  });

  const sourceMaps = await ClassSubjectMap.find({ session: sourceSessionId, schoolId }).lean();
  if (sourceMaps.length === 0) {
    return { copied: 0, skipped: 0, total: 0, empty: true };
  }

  let skipped = 0;
  const toInsert = [];

  for (const map of sourceMaps) {
    const srcClass = sourceClassById[map.classId.toString()];
    if (!srcClass) {
      skipped++;
      continue;
    }
    const targetClassId = targetClassByName[srcClass.name];
    if (!targetClassId) {
      skipped++;
      continue;
    }
    toInsert.push({
      classId: targetClassId,
      subjectId: map.subjectId,
      session: targetSessionId,
      schoolId,
    });
  }

  const inserted = await insertIgnoringDuplicates(ClassSubjectMap, toInsert);
  skipped += inserted.skipped;

  logger.info('Subject maps copied to new session', {
    schoolId,
    targetSessionId,
    sourceSessionId,
    copied: inserted.copied,
    skipped,
  });

  return { copied: inserted.copied, skipped, total: sourceMaps.length, empty: false };
};

const copyTeacherAssignmentsToSession = async ({ targetSessionId, fromSessionId, schoolId }) => {
  await requireTargetSession({ targetSessionId, schoolId, message: 'Target session not found' });

  const sourceSessionId = await resolveSourceSession({
    fromSessionId,
    targetSessionId,
    schoolId,
    emptyMessage: 'No previous session found.',
  });

  const [sourceClasses, targetClasses] = await Promise.all([
    ClassModel.find({ session: sourceSessionId, schoolId }).lean(),
    ClassModel.find({ session: targetSessionId, schoolId }).lean(),
  ]);

  if (targetClasses.length === 0) {
    throw ApiError.badRequest('No classes in target session. Run "Copy Classes" first.');
  }

  const sourceClassById = {};
  sourceClasses.forEach((c) => {
    sourceClassById[c._id.toString()] = c;
  });
  const targetClassByName = {};
  targetClasses.forEach((c) => {
    targetClassByName[c.name] = c;
  });

  const [sourceSections, targetSections] = await Promise.all([
    SectionModel.find({ session: sourceSessionId, schoolId }).lean(),
    SectionModel.find({ session: targetSessionId, schoolId }).lean(),
  ]);

  const sourceSectionById = {};
  sourceSections.forEach((s) => {
    sourceSectionById[s._id.toString()] = s;
  });

  // Key: "ClassName__SectionName" -> target SectionModel doc
  const targetSectionByKey = {};
  targetSections.forEach((s) => {
    const cls = targetClasses.find((c) => c._id.toString() === s.classId.toString());
    if (cls) targetSectionByKey[`${cls.name}__${s.name}`] = s;
  });

  let teacherSubjectSkipped = 0;
  let classTeacherSkipped = 0;

  // Remap a source assignment's classId/sectionId onto the target session by name
  const remap = (a) => {
    const srcCls = sourceClassById[a.classId.toString()];
    if (!srcCls) return null;
    const tgtCls = targetClassByName[srcCls.name];
    if (!tgtCls) return null;
    const srcSec = sourceSectionById[a.sectionId.toString()];
    if (!srcSec) return null;
    const tgtSec = targetSectionByKey[`${srcCls.name}__${srcSec.name}`];
    if (!tgtSec) return null;
    return { classId: tgtCls._id, sectionId: tgtSec._id };
  };

  const srcTSA = await TeacherSubjectAssignment.find({ session: sourceSessionId, schoolId }).lean();
  const tsaToInsert = [];
  for (const a of srcTSA) {
    const mapped = remap(a);
    if (!mapped) {
      teacherSubjectSkipped++;
      continue;
    }
    tsaToInsert.push({
      teacherId: a.teacherId,
      subjectId: a.subjectId,
      classId: mapped.classId,
      sectionId: mapped.sectionId,
      session: targetSessionId,
      schoolId,
    });
  }
  const tsa = await insertIgnoringDuplicates(TeacherSubjectAssignment, tsaToInsert);
  teacherSubjectSkipped += tsa.skipped;

  const srcCTA = await ClassTeacherAssignment.find({ session: sourceSessionId, schoolId }).lean();
  const ctaToInsert = [];
  for (const ct of srcCTA) {
    const mapped = remap(ct);
    if (!mapped) {
      classTeacherSkipped++;
      continue;
    }
    ctaToInsert.push({
      teacherId: ct.teacherId,
      classId: mapped.classId,
      sectionId: mapped.sectionId,
      session: targetSessionId,
      schoolId,
    });
  }
  const cta = await insertIgnoringDuplicates(ClassTeacherAssignment, ctaToInsert);
  classTeacherSkipped += cta.skipped;

  logger.info('Teacher assignments copied to new session', {
    schoolId,
    targetSessionId,
    sourceSessionId,
    teacherSubjectCopied: tsa.copied,
    classTeacherCopied: cta.copied,
  });

  return {
    teacherSubjectCopied: tsa.copied,
    teacherSubjectSkipped,
    classTeacherCopied: cta.copied,
    classTeacherSkipped,
  };
};

module.exports = {
  createSession,
  listSessions,
  findActiveSession,
  updateSession,
  deleteSession,
  copyClassesToSession,
  syncStudentSessions,
  copySubjectMapsToSession,
  copyTeacherAssignmentsToSession,
};
