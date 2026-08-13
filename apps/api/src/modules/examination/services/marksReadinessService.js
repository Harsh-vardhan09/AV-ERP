/**
 * MarksReadinessService — per-subject marks submission tracking.
 *
 * Answers "have ALL required subjects been submitted for this class+exam?",
 * which the existing canGenerateReport() check cannot: it only asserts that
 * *some* marks exist (utils/reportCardValidation.js:98).
 *
 * Required subjects come from ExamSubjectConfig (the subjects actually
 * configured for the exam). Falls back to ClassSubjectMap when an exam has no
 * per-subject config, so schools that skip exam configuration still get a
 * meaningful readiness signal.
 *
 * Exam.evaluationStatus is the cached roll-up across ALL classes on the exam;
 * getExamReadiness() is the per-class source of truth.
 *
 * SCOPE MATTERS. Called without a student, this answers a CLASS-level question:
 * "has anyone uploaded for this class+subject?" One student's marks then mark the
 * subject submitted for everyone, so a classmate with no marks reads as ready and
 * generates a blank card. To gate ONE student's report card, pass studentId /
 * studentProfileId — that routes through MarksSourceService, the same read path
 * DataAggregatorService uses, so the gate and the card can never disagree.
 */

const Exam = require('../models/Exam');
const ExamSubjectConfig = require('../models/ExamSubjectConfig');
const Marks = require('../models/MarksModel');
const MarksSourceService = require('./marksSourceService');
const { ClassSubjectMap, SubjectMaster } = require('../../academics');
const SchoolSettings = require('../../tenancy').SchoolSettings;
const logger = require('../../../core/logging/logger.js');

/**
 * Subjects a class is expected to submit marks for, in this exam.
 * @returns {Promise<string[]>} subjectId strings
 */
async function _requiredSubjectIds({ examId, classId, schoolId, sessionId }) {
  const configs = await ExamSubjectConfig.find({ examId, classId, schoolId })
    .select('subjectId')
    .lean();

  if (configs.length) {
    return [...new Set(configs.map((c) => String(c.subjectId)))];
  }

  // No exam-subject config — fall back to the class syllabus.
  const mapFilter = { classId, schoolId };
  if (sessionId) mapFilter.session = sessionId;
  const mapped = await ClassSubjectMap.find(mapFilter).select('subjectId').lean();
  return [...new Set(mapped.filter((m) => m.subjectId).map((m) => String(m.subjectId)))];
}

// A marks document existing is not the same as a mark being entered. distinct()
// counted an empty shell as submitted, so the gate reported ready while the card
// rendered blanks. A doc counts only when it carries a usable number.
// 0 is a legitimate mark; null/undefined/'' are not (Number(null) === 0).
const _isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

const _hasUsableMarks = (m) => {
  if (m.fields) {
    // lean() hands back a plain object, a hydrated doc a Map — handle both, as
    // the aggregator already has to.
    const obj = m.fields instanceof Map ? Object.fromEntries(m.fields) : m.fields;
    if (Object.values(obj).some(_isNum)) return true;
  }
  return _isNum(m.marksObtained);
};

/**
 * Readiness for one class (optionally one section) in one exam, or — when a
 * student is given — for that one student.
 *
 * @param {object}  opts
 * @param {string}  opts.examId
 * @param {string}  opts.classId
 * @param {string}  [opts.sectionId]  scope to a single section (class scope only)
 * @param {string}  opts.schoolId
 * @param {string}  [opts.sessionId]
 * @param {string}  [opts.studentId]         User._id — switches to student scope
 * @param {string}  [opts.studentProfileId]  StudentProfile._id, same switch
 * @returns {Promise<{ready:boolean, scope:'class'|'student', totalSubjects:number,
 *                    submittedCount:number, submitted:Array, missing:Array,
 *                    percentComplete:number}>}
 */
async function getExamReadiness({
  examId,
  classId,
  sectionId,
  schoolId,
  sessionId,
  studentId,
  studentProfileId,
}) {
  const perStudent = Boolean(studentId || studentProfileId);
  const requiredIds = await _requiredSubjectIds({ examId, classId, schoolId, sessionId });

  if (!requiredIds.length) {
    return {
      ready: false,
      scope: perStudent ? 'student' : 'class',
      totalSubjects: 0,
      submittedCount: 0,
      submitted: [],
      missing: [],
      percentComplete: 0,
      reason: 'No subjects configured for this class in this exam',
    };
  }

  let marksDocs;
  if (perStudent) {
    // MarksSourceService filters on `session`. Passing undefined would match docs
    // whose session is missing rather than skipping the filter, so resolve it.
    let sid = sessionId;
    if (!sid) {
      const exam = await Exam.findOne({ _id: examId, schoolId }).select('session').lean();
      sid = exam?.session;
    }
    marksDocs = await MarksSourceService.getMarks({
      studentId: studentId || studentProfileId,
      studentProfileId,
      classId,
      sessionId: sid,
      schoolId,
      examIds: [examId],
    });
  } else {
    const marksFilter = { examId, classId, schoolId, subjectId: { $in: requiredIds } };
    if (sectionId) marksFilter.sectionId = sectionId;
    marksDocs = await Marks.find(marksFilter).select('subjectId fields marksObtained').lean();
  }

  const submittedSet = new Set(marksDocs.filter(_hasUsableMarks).map((m) => String(m.subjectId)));
  const missingIds = requiredIds.filter((id) => !submittedSet.has(id));

  // Resolve names in one round-trip so callers can render the missing list.
  const subjects = await SubjectMaster.find({ _id: { $in: requiredIds }, schoolId })
    .select('name code')
    .lean();
  const nameMap = Object.fromEntries(
    subjects.map((s) => [String(s._id), { _id: String(s._id), name: s.name, code: s.code }])
  );
  const describe = (id) => nameMap[id] || { _id: id, name: 'Unknown subject', code: '' };

  const submittedCount = requiredIds.length - missingIds.length;

  return {
    ready: missingIds.length === 0,
    scope: perStudent ? 'student' : 'class',
    totalSubjects: requiredIds.length,
    submittedCount,
    submitted: requiredIds.filter((id) => submittedSet.has(id)).map(describe),
    missing: missingIds.map(describe),
    percentComplete: Math.round((submittedCount / requiredIds.length) * 100),
  };
}

// Status ordering — the refresh only ever moves an exam forward.
const STATUS_RANK = { pending: 0, in_progress: 1, completed: 2 };

/**
 * Recompute Exam.evaluationStatus from actual marks coverage.
 *
 * pending      → no subject submitted in any class
 * in_progress  → some submitted
 * completed    → every class × subject on the exam submitted
 *
 * Called after each marks upload. Never throws — a tracking failure must not
 * fail the upload that triggered it.
 *
 * evaluationStatus has two other owners, so this only ever moves an exam
 * FORWARD and never touches exams it doesn't own:
 *   - adminController.startEvaluation/completeEvaluation (manual sign-off)
 *   - oases/evaluationController (OASES owns the lifecycle when enabled)
 * Demoting either back to in_progress would silently reopen a signed-off exam,
 * and in OASES mode auto-completing would bypass the evaluation gate that
 * canGenerateReportWithOases() relies on.
 *
 * @returns {Promise<string|null>} the new status, or null if it was left alone
 */
async function refreshExamEvaluationStatus({ examId, schoolId }) {
  try {
    // OASES owns evaluationStatus when enabled — never write it from marks entry.
    const settings = await SchoolSettings.findOne({ schoolId }).select('isOasesEnabled').lean();
    if (settings?.isOasesEnabled) return null;

    const exam = await Exam.findOne({ _id: examId, schoolId })
      .select('classIds session evaluationStatus evaluationLocked')
      .lean();
    if (!exam) return null;

    // A locked exam has been signed off — don't move it back to in_progress.
    if (exam.evaluationLocked) return null;

    const perClass = await Promise.all(
      (exam.classIds || []).map((classId) =>
        getExamReadiness({ examId, classId, schoolId, sessionId: exam.session })
      )
    );

    const withSubjects = perClass.filter((r) => r.totalSubjects > 0);
    if (!withSubjects.length) return null;

    const anySubmitted = withSubjects.some((r) => r.submittedCount > 0);
    const allReady = withSubjects.every((r) => r.ready);

    const status = allReady ? 'completed' : anySubmitted ? 'in_progress' : 'pending';
    const current = exam.evaluationStatus || 'pending';

    // Forward-only: an admin's manual "completed" stays completed.
    if ((STATUS_RANK[status] ?? 0) <= (STATUS_RANK[current] ?? 0)) return current;

    await Exam.updateOne({ _id: examId, schoolId }, { $set: { evaluationStatus: status } });
    logger.info('[MarksReadiness] Exam evaluationStatus updated', {
      examId: String(examId),
      schoolId: String(schoolId),
      from: exam.evaluationStatus,
      to: status,
    });
    return status;
  } catch (err) {
    logger.error('[MarksReadiness] refreshExamEvaluationStatus failed', {
      examId: String(examId),
      error: err.message,
    });
    return null;
  }
}

module.exports = { getExamReadiness, refreshExamEvaluationStatus };
