// OASES Controller — Result
// Aggregates locked sheets into ResultSheets and exports.
const AnswerSheet    = require('../models/AnswerSheet');
const EvaluationMark = require('../models/EvaluationMark');
const ResultSheet    = require('../models/ResultSheet');
const ExamConfig     = require('../models/ExamConfig');
const AuditLog       = require('../models/AuditLog');
const { ok } = require('../../../core/http/ApiResponse');
const { apiError } = require('../lib/respond');
const oasesAsyncHandler = require('../../../core/http/asyncHandler');
const { SHEET_STATUS, EVAL_ROUNDS } = require('../lib/constants');

// POST /api/v1/oases/result/generate/:examConfigId
// Generate ResultSheets for all locked sheets of an exam config
exports.generateResults = oasesAsyncHandler(async (req, res) => {
  const config = await ExamConfig.findOne({ _id: req.params.examConfigId, schoolId: req.schoolId });
  if (!config) return apiError(res, 'Exam config not found.', 404);

  const lockedSheets = await AnswerSheet.find({
    examConfigId: req.params.examConfigId,
    schoolId:     req.schoolId,
    status:       SHEET_STATUS.LOCKED,
  });

  if (lockedSheets.length === 0) {
    return apiError(res, 'No locked sheets found for this exam config.', 400);
  }

  const results = [];
  for (const sheet of lockedSheets) {
    // Find the accepted evaluation mark (head round > round 1)
    const headMark = await EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.HEAD, isDraft: false });
    const r1Mark   = await EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.ROUND_1, isDraft: false });
    const finalMark = headMark || r1Mark;
    if (!finalMark) continue;

    const marksObtained = finalMark.totalMarksAwarded;
    const percentage    = parseFloat(((marksObtained / config.totalMarks) * 100).toFixed(2));
    const isPassed      = marksObtained >= config.passingMarks;

    const result = await ResultSheet.findOneAndUpdate(
      { sheetId: sheet._id },
      {
        schoolId:       req.schoolId,
        examConfigId:   config._id,
        anonymousCode:  sheet.anonymousCode,
        perQuestion:    finalMark.marks.map((m) => ({
          questionNo:      m.questionNo,
          marksAwarded:    m.isNA ? 0 : (m.marksGiven ?? 0),   // schema field is marksGiven
          eval1Marks:      r1Mark?.marks.find((q) => q.questionNo === m.questionNo)?.marksGiven ?? null,
          headReviewMarks: headMark ? (m.marksGiven ?? 0) : null,
          acceptedRound:   headMark ? EVAL_ROUNDS.HEAD : EVAL_ROUNDS.ROUND_1,
        })),
        totalMarks:    config.totalMarks,
        marksObtained,
        percentage,
        isPassed,
        hadConflict:   sheet.status === SHEET_STATUS.CONFLICT || !!headMark,
        conflictNote:  '',
        lockedAt:      sheet.lockedAt,
        lockedBy:      sheet.lockedBy,
      },
      { upsert: true, new: true }
    );
    results.push(result);
  }

  await AuditLog.create({
    schoolId:   req.schoolId,
    entityType: 'ResultSheet',
    entityId:   config._id,
    actorId:    req.userid,
    actorRole:  req.user.oasesRole,
    action:     'RESULTS_GENERATED',
    details:    { examConfigId: config._id, count: results.length },
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'] || '',
  });

  return ok(res, { generated: results.length }, `${results.length} result(s) generated.`);
});

// GET /api/v1/oases/result/:examConfigId
// List all results for an exam (SCHOOL_ADMIN / HEAD_EXAMINER only)
exports.listResults = oasesAsyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip  = (Number(page) - 1) * Number(limit);
  const total = await ResultSheet.countDocuments({ examConfigId: req.params.examConfigId, schoolId: req.schoolId });
  const results = await ResultSheet.find({ examConfigId: req.params.examConfigId, schoolId: req.schoolId })
    .select('anonymousCode marksObtained totalMarks percentage isPassed hadConflict isPublished lockedAt')
    .sort({ marksObtained: -1 })
    .skip(skip)
    .limit(Number(limit));

  return ok(res, { results, total, page: Number(page), limit: Number(limit) }, 'Results fetched.');
});

// PATCH /api/v1/oases/result/:examConfigId/publish
// Publish results (mark isPublished = true)
exports.publishResults = oasesAsyncHandler(async (req, res) => {
  const updated = await ResultSheet.updateMany(
    { examConfigId: req.params.examConfigId, schoolId: req.schoolId },
    { isPublished: true, publishedAt: new Date() }
  );

  await AuditLog.create({
    schoolId:   req.schoolId,
    entityType: 'ResultSheet',
    entityId:   req.params.examConfigId,
    actorId:    req.userid,
    actorRole:  req.user.oasesRole,
    action:     'RESULTS_PUBLISHED',
    details:    { modifiedCount: updated.modifiedCount },
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'] || '',
  });

  return ok(res, { published: updated.modifiedCount }, 'Results published.');
});
