// ══════════════════════════════════════════════════════════════════
// OASES Controller — Conflict
// HEAD_EXAMINER resolves mark conflicts between eval1 and eval2.
// ══════════════════════════════════════════════════════════════════
const AnswerSheet     = require('../../models/oases/AnswerSheet');
const EvaluationMark  = require('../../models/oases/EvaluationMark');
const ExamConfig      = require('../../models/oases/ExamConfig');
const AuditLog        = require('../../models/oases/AuditLog');
const OasesNotification = require('../../models/oases/OasesNotification');
const { oasesSuccess, oasesError } = require('../../utils/oasesResponse');
const oasesAsyncHandler = require('../../utils/oasesAsyncHandler');
const { SHEET_STATUS, EVAL_ROUNDS, NOTIFICATION_TYPES } = require('../../utils/oasesConstants');

// ── GET /api/v1/oases/conflict ──────────────────────────────
// List all sheets in conflict state for the school (HE view)
exports.listConflicts = oasesAsyncHandler(async (req, res) => {
  const { examConfigId, page = 1, limit = 20 } = req.query;
  const filter = { schoolId: req.schoolId, status: SHEET_STATUS.CONFLICT };
  if (examConfigId) filter.examConfigId = examConfigId;

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await AnswerSheet.countDocuments(filter);
  const sheets = await AnswerSheet.find(filter)
    .select('anonymousCode set examConfigId eval1AssignedTo eval2AssignedTo createdAt')
    .populate('examConfigId', 'subject totalMarks conflictMargin')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return oasesSuccess(res, { sheets, total, page: Number(page), limit: Number(limit) }, 'Conflict sheets fetched.');
});

// ── GET /api/v1/oases/conflict/:sheetId ─────────────────────
// Get full conflict detail: both evaluators' marks side by side
exports.getConflictDetail = oasesAsyncHandler(async (req, res) => {
  const sheet = await AnswerSheet.findOne({
    _id: req.params.sheetId,
    schoolId: req.schoolId,
    status: { $in: [SHEET_STATUS.CONFLICT, SHEET_STATUS.HEAD_REVIEW] },
  }).populate('examConfigId', 'subject totalMarks conflictMargin');

  if (!sheet) return oasesError(res, 'Conflict sheet not found.', 404);

  const [eval1, eval2] = await Promise.all([
    EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.ROUND_1, isDraft: false })
      .select('marks totalMarksAwarded'),
    EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.ROUND_2, isDraft: false })
      .select('marks totalMarksAwarded'),
  ]);

  return oasesSuccess(
    res,
    {
      sheet: {
        sheetId:       sheet._id,
        anonymousCode: sheet.anonymousCode,
        status:        sheet.status,
        examConfig:    sheet.examConfigId,
        // Signed URLs stub
        pageUrls: sheet.s3Keys,
      },
      eval1: eval1 || null,
      eval2: eval2 || null,
    },
    'Conflict detail fetched.'
  );
});

// ── POST /api/v1/oases/conflict/:sheetId/route-to-head ──────
// Escalate a conflict sheet to HEAD_EXAMINER
exports.routeToHead = oasesAsyncHandler(async (req, res) => {
  const { headExaminerId } = req.body;

  const sheet = await AnswerSheet.findOneAndUpdate(
    { _id: req.params.sheetId, schoolId: req.schoolId, status: SHEET_STATUS.CONFLICT },
    { status: SHEET_STATUS.HEAD_REVIEW, headAssignedTo: headExaminerId },
    { new: true }
  );
  if (!sheet) return oasesError(res, 'Conflict sheet not found.', 404);

  // Notify head examiner
  await OasesNotification.create({
    schoolId:    req.schoolId,
    recipientId: headExaminerId,
    type:        NOTIFICATION_TYPES.CONFLICT,
    title:       'Conflict Sheet Assigned for Review',
    message:     `Sheet ${sheet.anonymousCode} has a mark conflict and requires your review.`,
    entityType:  'AnswerSheet',
    entityId:    sheet._id,
  });

  await AuditLog.create({
    schoolId:   req.schoolId,
    entityType: 'AnswerSheet',
    entityId:   sheet._id,
    actorId:    req.userid,
    actorRole:  req.user.oasesRole,
    action:     'CONFLICT_ROUTED_TO_HEAD',
    details:    { headExaminerId },
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'] || '',
  });

  return oasesSuccess(res, null, 'Sheet routed to Head Examiner for review.');
});

// ── POST /api/v1/oases/conflict/:sheetId/resolve ────────────
// HEAD_EXAMINER resolves conflict by submitting final override marks
exports.resolveConflict = oasesAsyncHandler(async (req, res) => {
  const { marks, note } = req.body;

  const sheet = await AnswerSheet.findOne({
    _id: req.params.sheetId,
    schoolId: req.schoolId,
    status: SHEET_STATUS.HEAD_REVIEW,
    headAssignedTo: req.userid,
  });
  if (!sheet) return oasesError(res, 'Sheet not found or not assigned to you.', 404);

  const totalMarksAwarded = marks.reduce((sum, q) => sum + (q.isNA ? 0 : q.marksAwarded), 0);

  // Create head-round evaluation mark
  await EvaluationMark.findOneAndUpdate(
    { sheetId: sheet._id, evaluatorId: req.userid, round: EVAL_ROUNDS.HEAD, schoolId: req.schoolId },
    {
      $set: {
        marks,
        totalMarksAwarded,
        isDraft: false,
        submittedAt: new Date(),
        examConfigId: sheet.examConfigId,
        schoolId: req.schoolId,
      },
    },
    { upsert: true, new: true }
  );

  // Lock the sheet
  await AnswerSheet.findByIdAndUpdate(sheet._id, {
    status: SHEET_STATUS.LOCKED,
    headCompletedAt: new Date(),
    lockedAt: new Date(),
    lockedBy: req.userid,
  });

  await AuditLog.create({
    schoolId:   req.schoolId,
    entityType: 'AnswerSheet',
    entityId:   sheet._id,
    actorId:    req.userid,
    actorRole:  req.user.oasesRole,
    action:     'CONFLICT_RESOLVED',
    details:    { totalMarksAwarded, note },
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'] || '',
  });

  return oasesSuccess(res, null, 'Conflict resolved. Sheet is now locked.');
});
