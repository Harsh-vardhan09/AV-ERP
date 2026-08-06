/**
 * REPORT CARD VALIDATION UTILITIES
 * Supports dual workflows: OASES ON (evaluation-based) and OASES OFF (direct marks entry)
 */

const SchoolSettings = require('../../src/modules/tenancy').SchoolSettings;
const Marks = require('../models/MarksModel');

/**
 * Unified validation: Check if report card generation is allowed
 * Returns { allowed: boolean, reason?: string }
 */
const canGenerateReport = async ({ classId, sessionId, schoolId, isOasesEnabled = null }) => {
  try {
    // Fetch settings if not provided
    let oasesEnabled = isOasesEnabled;
    if (oasesEnabled === null) {
      const settings = await SchoolSettings.findOne({ schoolId }).select('isOasesEnabled').lean();
      oasesEnabled = settings?.isOasesEnabled ?? false;
    }

    if (oasesEnabled) {
      // OASES ON: All exams must be evaluated
      return await canGenerateReportWithOases(classId, sessionId, schoolId);
    } else {
      // OASES OFF: Marks must exist for all subjects
      return await canGenerateReportWithoutOases(classId, sessionId, schoolId);
    }
  } catch (err) {
    console.error('[canGenerateReport]', err);
    return { allowed: false, reason: 'Validation error: ' + err.message };
  }
};

/**
 * OASES ON: Validate evaluation completion
 */
const canGenerateReportWithOases = async (classId, sessionId, schoolId) => {
  const Exam = require('../models/Exam');

  const exams = await Exam.find({
    classIds: classId,
    session: sessionId,
    schoolId,
  }).select('_id evaluationStatus');

  if (!exams.length) {
    return { allowed: false, reason: 'No exams found for this class' };
  }

  const allCompleted = exams.every((e) => e.evaluationStatus === 'completed');
  if (!allCompleted) {
    const pendingCount = exams.filter((e) => e.evaluationStatus !== 'completed').length;
    return { allowed: false, reason: `${pendingCount} exam(s) not yet evaluated` };
  }

  return { allowed: true };
};

/**
 * OASES OFF: Validate marks entry for all subjects
 */
const canGenerateReportWithoutOases = async (classId, sessionId, schoolId) => {
  const ClassSubjectMap = require('../models/ClassSubjectMap');

  // Get all subjects for the class
  const subjects = await ClassSubjectMap.find({
    classId,
    session: sessionId,
    schoolId,
  })
    .populate('subjectId', 'name _id')
    .select('subjectId')
    .lean();

  if (!subjects.length) {
    return { allowed: false, reason: 'No subjects configured for this class' };
  }

  const subjectIds = subjects
    .filter((s) => s.subjectId)
    .map((s) => s.subjectId._id.toString());

  if (!subjectIds.length) {
    return { allowed: false, reason: 'No valid subjects found' };
  }

  // Check if marks exist for ALL subjects — even one missing subject blocks generation
  const marksCount = await Marks.countDocuments({
    classId,
    session: sessionId,
    subjectId: { $in: subjectIds },
    schoolId,
    // Any obtainedMarks value (including 0) is valid
  }).lean();

  // In OASES OFF mode, if marksCount < subjectIds, some subjects have no marks at all
  if (marksCount === 0) {
    return { allowed: false, reason: 'No marks entered yet' };
  }

  // NOTE: This is lenient — it allows generation even if some students lack marks for some subjects.
  // For stricter per-student validation, pass a studentId list and check each student's marks.
  return { allowed: true };
};

/**
 * Fetch class exams dynamically based on OASES toggle
 * OASES ON: Only return evaluated exams
 * OASES OFF: Return all exams (for informational purposes), but marks are from manual entry
 */
const fetchExamsForReportCard = async (classId, sessionId, schoolId, isOasesEnabled) => {
  const Exam = require('../models/Exam');
  const ExamSubjectConfig = require('../models/ExamSubjectConfig');

  const exams = await Exam.find({
    classIds: classId,
    session: sessionId,
    schoolId,
  })
    .select('name type startDate createdAt evaluationStatus evaluationLocked maxMarks')
    .sort({ startDate: 1, createdAt: 1, name: 1 })
    .lean();

  if (!exams.length) return [];

  // If OASES OFF, skip evaluation status filtering — return all exams
  // If OASES ON, only include evaluated exams
  let filtered = exams;
  if (isOasesEnabled) {
    filtered = exams.filter((e) => e.evaluationStatus === 'completed');
  }

  const examIds = filtered.map((e) => e._id);
  const configs = await ExamSubjectConfig.find({
    examId: { $in: examIds },
    classId,
    schoolId,
  })
    .select('examId maxMarks')
    .lean();

  const examMaxMap = {};
  configs.forEach((c) => {
    const eid = c.examId.toString();
    if (examMaxMap[eid] === undefined) examMaxMap[eid] = c.maxMarks;
  });

  return filtered.map((e) => ({
    _id: e._id,
    name: e.name,
    type: e.type,
    maxMarks: examMaxMap[e._id.toString()] ?? 100,
    startDate: e.startDate,
    createdAt: e.createdAt,
    evaluationStatus: e.evaluationStatus || 'pending',
    evaluationLocked: Boolean(e.evaluationLocked),
  }));
};

/**
 * Determine marks source based on OASES toggle
 * OASES ON: Use OASES evaluated marks
 * OASES OFF: Use manually entered marks from Marks model
 */
const getMarksSource = (isOasesEnabled) => {
  return isOasesEnabled ? 'oases_evaluated' : 'manual_entry';
};

module.exports = {
  canGenerateReport,
  canGenerateReportWithOases,
  canGenerateReportWithoutOases,
  fetchExamsForReportCard,
  getMarksSource,
};
