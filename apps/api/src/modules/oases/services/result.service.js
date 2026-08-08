// OASES Service — Result Lock
// lockSheet: called after round 1 auto-close OR conflict resolved.
// Creates/upserts ResultSheet and emits sheet:locked socket event.
const AnswerSheet = require('../models/AnswerSheet');
const EvaluationMark = require('../models/EvaluationMark');
const ResultSheet = require('../models/ResultSheet');
const ExamConfig = require('../models/ExamConfig');
const { Exam } = require('../../examination');
const { emitToAll } = require('../../../../src-old/socket');
const auditService = require('./auditService');
const { SHEET_STATUS, EVAL_ROUNDS } = require('../lib/constants');

/**
 * Lock a sheet: mark isLocked, compute results, create ResultSheet.
 *
 * @param {string}  sheetId
 * @param {string}  schoolId
 * @param {number}  finalMarks     - the agreed grand total
 * @param {object}  opts           - { hadConflict, lockedBy }
 */
const lockSheet = async (sheetId, schoolId, finalMarks, opts = {}) => {
  const { hadConflict = false, lockedBy = null } = opts;

  // Fetch sheet + exam config
  const sheet = await AnswerSheet.findById(sheetId).lean();
  if (!sheet) throw new Error(`lockSheet: Sheet ${sheetId} not found.`);

  // CRITICAL: examConfigId now points to the unified Exam model.
  // Try legacy OasesExamConfig first, fall back to Exam.
  let examConfig = await ExamConfig.findById(sheet.examConfigId).lean();
  if (!examConfig) {
    examConfig = await Exam.findById(sheet.examConfigId)
      .select('totalMarks passingMarks conflictThreshold doubleEval name')
      .lean();
  }
  if (!examConfig) throw new Error(`lockSheet: ExamConfig/Exam not found for sheet ${sheetId}.`);

  // Find accepted mark doc (HEAD > R1 for single-round)
  const headMark = await EvaluationMark.findOne({
    sheetId,
    round: EVAL_ROUNDS.HEAD,
    isDraft: false,
  }).lean();
  const r1Mark = await EvaluationMark.findOne({
    sheetId,
    round: EVAL_ROUNDS.ROUND_1,
    isDraft: false,
  }).lean();
  const r2Mark = await EvaluationMark.findOne({
    sheetId,
    round: EVAL_ROUNDS.ROUND_2,
    isDraft: false,
  }).lean();
  const accepted = headMark || r1Mark;

  const percentage =
    examConfig.totalMarks > 0
      ? parseFloat(((finalMarks / examConfig.totalMarks) * 100).toFixed(2))
      : 0;
  const isPassed = finalMarks >= (examConfig.passingMarks || 0);

  // Build per-question result
  const perQuestion = (accepted?.marks || []).map((m) => ({
    questionNo: m.questionNo,
    marksAwarded: m.isNA ? 0 : m.marksGiven || m.marksAwarded || 0,
    eval1Marks: r1Mark?.marks?.find((q) => q.questionNo === m.questionNo)?.marksGiven ?? null,
    eval2Marks: r2Mark?.marks?.find((q) => q.questionNo === m.questionNo)?.marksGiven ?? null,
    headReviewMarks: headMark ? m.marksGiven || 0 : null,
    acceptedRound: headMark ? EVAL_ROUNDS.HEAD : EVAL_ROUNDS.ROUND_1,
  }));

  const lockedAt = new Date();
  const lockedByFinal = lockedBy || sheet.lockedBy || sheet.eval1AssignedTo;

  // Update answer sheet
  await AnswerSheet.findByIdAndUpdate(sheetId, {
    status: SHEET_STATUS.LOCKED,
    isLocked: true,
    finalMarks,
    lockedAt,
    lockedBy: lockedByFinal,
  });

  // Upsert ResultSheet
  await ResultSheet.findOneAndUpdate(
    { sheetId },
    {
      schoolId,
      examConfigId: sheet.examConfigId,
      anonymousCode: sheet.anonymousCode,
      perQuestion,
      totalMarks: examConfig.totalMarks,
      marksObtained: finalMarks,
      percentage,
      isPassed,
      hadConflict,
      conflictNote: hadConflict ? 'Auto-resolved by Head Examiner' : '',
      lockedAt,
      lockedBy: lockedByFinal,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Socket
  emitToAll('oases:sheet:locked', {
    sheetId,
    examConfigId: sheet.examConfigId,
    finalMarks,
    percentage,
    isPassed,
  });

  // Audit
  auditService.log({
    schoolId,
    entityType: 'ResultSheet',
    entityId: sheetId,
    actorId: lockedByFinal,
    actorRole: 'SYSTEM',
    action: 'RESULT_LOCKED',
    details: { finalMarks, percentage, isPassed, hadConflict },
  });
};

module.exports = { lockSheet };
