// OASES Controller — Report
// POST /report/generate/:examId  — grade + rank + summary
// POST /report/publish/:examId   — decrypt rollNo, link student
// GET  /report/exam/:examId      — summary stats
// GET  /report/student/:examId/:rollNo — individual result
// GET  /report/evaluator/:examId — evaluator performance stats
// GET  /report/evaluator/remuneration/:examId — pay calculation
const crypto = require('crypto');
const ResultSheet = require('../models/ResultSheet');
const AnswerSheet = require('../models/AnswerSheet');
const ExamConfig = require('../models/ExamConfig');
const EvaluationMark = require('../models/EvaluationMark');
const AuditLog = require('../models/AuditLog');
const oasesAsync = require('../../../core/http/asyncHandler');
const { ok } = require('../../../core/http/ApiResponse');
const { apiError } = require('../lib/respond');
const { SHEET_STATUS } = require('../lib/constants');
const { emitToAll } = require('../../../core/realtime/socket');
const auditService = require('../services/auditService');

// CBSE Grade helper
const gradeFromPercentage = (pct) => {
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
};

// Decrypt rollNo
const decryptRollNo = (encrypted) => {
  try {
    const key = Buffer.from(
      process.env.OASES_ENCRYPT_KEY || process.env.JWT_SECRET.slice(0, 32),
      'utf8'
    );
    const [ivHex, authTagHex, cipherHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const cipher = Buffer.from(cipherHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(cipher, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
};

// POST /report/generate/:examId
// Compute grade + rank for all locked ResultSheets
exports.generateResults = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const config = await ExamConfig.findOne({ _id: examId, schoolId: req.schoolId });
  if (!config) return apiError(res, 'Exam config not found.', 404);

  // Fetch all locked ResultSheets sorted by finalMarks desc for ranking
  const results = await ResultSheet.find({
    examConfigId: examId,
    schoolId: req.schoolId,
  }).sort({ finalMarks: -1, marksObtained: -1 });

  if (results.length === 0) {
    return apiError(res, 'No result sheets found. Lock sheets first.', 400);
  }

  // Compute grade + rank via bulkWrite
  const ops = [];
  let rank = 1;
  let prevMarks = null;
  let prevRank = 1;

  results.forEach((r, idx) => {
    const marks = r.finalMarks || r.marksObtained;
    const percentage =
      config.totalMarks > 0 ? parseFloat(((marks / config.totalMarks) * 100).toFixed(2)) : 0;
    const grade = gradeFromPercentage(percentage);
    const isPassed = marks >= (config.passingMarks || 0);

    // Tied marks → same rank
    const thisRank = marks === prevMarks ? prevRank : rank;
    prevRank = thisRank;
    prevMarks = marks;
    rank = idx + 2; // next rank after this

    ops.push({
      updateOne: {
        filter: { _id: r._id },
        update: {
          $set: {
            grade,
            rank: thisRank,
            percentage,
            isPassed,
            finalMarks: marks,
            marksObtained: marks,
          },
        },
      },
    });
  });

  await ResultSheet.bulkWrite(ops);

  // Summary stats
  const marks = results.map((r) => r.finalMarks || r.marksObtained);
  const passCount = results.filter(
    (r) => (r.finalMarks || r.marksObtained) >= (config.passingMarks || 0)
  ).length;
  const total = results.length;
  const avg = total > 0 ? parseFloat((marks.reduce((s, m) => s + m, 0) / total).toFixed(2)) : 0;
  const highest = Math.max(...marks);
  const lowest = Math.min(...marks);
  const passRate = total > 0 ? parseFloat(((passCount / total) * 100).toFixed(1)) : 0;

  auditService.log({
    schoolId: req.schoolId,
    entityType: 'ResultSheet',
    entityId: examId,
    actorId: req.userid,
    actorRole: req.user?.oasesRole,
    action: 'RESULTS_GENERATED',
    details: { total, avg, highest, lowest, passRate },
  });

  return ok(
    res,
    {
      generated: total,
      summary: { avg, highest, lowest, passRate, passCount, total },
    },
    `Grades and ranks computed for ${total} result sheet(s).`
  );
});

// POST /report/publish/:examId
// Decrypt rollNo → link to student → set isPublished
exports.publishResults = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const config = await ExamConfig.findOne({ _id: examId, schoolId: req.schoolId });
  if (!config) return apiError(res, 'Exam config not found.', 404);

  // Fetch ResultSheets with their AnswerSheets (need rollNoEncrypted)
  const results = await ResultSheet.find({
    examConfigId: examId,
    schoolId: req.schoolId,
    isPublished: false,
  }).lean();

  if (results.length === 0) {
    return apiError(res, 'No unpublished results found.', 400);
  }

  const sheetIds = results.map((r) => r.sheetId);
  const sheets = await AnswerSheet.find({ _id: { $in: sheetIds } })
    .select('+rollNo +rollNoEncrypted')
    .lean();
  const sheetMap = Object.fromEntries(sheets.map((s) => [s._id.toString(), s]));

  // FIXME: published results have always had studentId null. This looked up the
  // `studentinfo` model, which was the college-fest coordinator schema ({name, number})
  // — it has no rollNo and no schoolId, so the findOne never matched. That model went
  // with the events feature. Repointing at StudentProfile is the real fix but changes
  // behaviour, so it is left null here deliberately. See docs/events-decision.md §5c.
  const Student = null;

  const ops = [];
  const publishedAt = new Date();
  let decryptFails = 0;

  for (const result of results) {
    const sheet = sheetMap[result.sheetId.toString()];
    let rollNo = sheet?.rollNo || null;
    let studentId = null;

    if (!rollNo && sheet?.rollNoEncrypted) {
      rollNo = decryptRollNo(sheet.rollNoEncrypted);
      if (!rollNo) decryptFails++;
    }

    if (rollNo && Student) {
      const student = await Student.findOne({ rollNo, schoolId: req.schoolId })
        .select('_id')
        .lean();
      studentId = student?._id || null;
    }

    ops.push({
      updateOne: {
        filter: { _id: result._id },
        update: {
          $set: {
            isPublished: true,
            publishedAt,
            rollNo: rollNo || undefined,
            studentId: studentId || undefined,
          },
        },
      },
    });
  }

  await ResultSheet.bulkWrite(ops);

  emitToAll('oases:results:published', {
    examConfigId: examId,
    count: results.length,
  });

  await AuditLog.create({
    schoolId: req.schoolId,
    entityType: 'ResultSheet',
    entityId: examId,
    actorId: req.userid,
    actorRole: req.user?.oasesRole,
    action: 'RESULTS_PUBLISHED',
    details: { published: results.length, decryptFails },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
  });

  return ok(
    res,
    {
      published: results.length,
      decryptFails,
    },
    `${results.length} result(s) published.`
  );
});

// GET /report/exam/:examId — Summary stats
exports.getExamSummary = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const config = await ExamConfig.findOne({ _id: examId, schoolId: req.schoolId }).lean();
  if (!config) return apiError(res, 'Exam config not found.', 404);

  // Sheet pipeline
  const [totalSheets, lockedSheets, publishedCount] = await Promise.all([
    AnswerSheet.countDocuments({ examConfigId: examId, schoolId: req.schoolId }),
    AnswerSheet.countDocuments({
      examConfigId: examId,
      schoolId: req.schoolId,
      status: SHEET_STATUS.LOCKED,
    }),
    ResultSheet.countDocuments({ examConfigId: examId, schoolId: req.schoolId, isPublished: true }),
  ]);

  // Marks distribution (10-mark buckets)
  const allResults = await ResultSheet.find({ examConfigId: examId, schoolId: req.schoolId })
    .select(
      'finalMarks marksObtained percentage isPassed grade hadConflict evalRoundsUsed submittedAt createdAt'
    )
    .lean();

  const marks = allResults.map((r) => r.finalMarks || r.marksObtained);
  const total = allResults.length;

  const avg = total > 0 ? parseFloat((marks.reduce((s, m) => s + m, 0) / total).toFixed(2)) : 0;
  const highest = total > 0 ? Math.max(...marks) : 0;
  const lowest = total > 0 ? Math.min(...marks) : 0;
  const passCount = allResults.filter((r) => r.isPassed).length;
  const passRate = total > 0 ? parseFloat(((passCount / total) * 100).toFixed(1)) : 0;

  // Grade distribution
  const gradeMap = {};
  allResults.forEach((r) => {
    gradeMap[r.grade || 'N/A'] = (gradeMap[r.grade || 'N/A'] || 0) + 1;
  });

  // Marks distribution in 10-mark buckets
  const distBuckets = {};
  marks.forEach((m) => {
    const bucket = `${Math.floor(m / 10) * 10}-${Math.floor(m / 10) * 10 + 9}`;
    distBuckets[bucket] = (distBuckets[bucket] || 0) + 1;
  });

  // Status distribution (for stacked bar chart)
  const statusCounts = await AnswerSheet.aggregate([
    { $match: { examConfigId: config._id, schoolId: config.schoolId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Daily submissions (for evaluator activity chart)
  const dailySubmissions = await EvaluationMark.aggregate([
    { $match: { schoolId: req.schoolId } },
    {
      $lookup: {
        from: 'oasesanswersheets',
        localField: 'sheetId',
        foreignField: '_id',
        as: 'sheet',
      },
    },
    { $unwind: '$sheet' },
    { $match: { 'sheet.examConfigId': config._id } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]);

  return ok(
    res,
    {
      examConfig: {
        name: config.examName || config.subjectName,
        totalMarks: config.totalMarks,
        passingMarks: config.passingMarks,
      },
      counts: { totalSheets, lockedSheets, publishedCount, total },
      summary: { avg, highest, lowest, passCount, passRate },
      gradeDistribution: gradeMap,
      marksDistribution: distBuckets,
      statusDistribution: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
      dailySubmissions: dailySubmissions.map((d) => ({ date: d._id, count: d.count })),
    },
    'Exam summary fetched.'
  );
});

// GET /report/results/:examId — paginated results table
exports.listResults = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const { page = 1, limit = 50, search = '' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { examConfigId: examId, schoolId: req.schoolId };
  if (search) filter.anonymousCode = { $regex: search, $options: 'i' };

  const [results, total] = await Promise.all([
    ResultSheet.find(filter)
      .select(
        'anonymousCode sectionTotals finalMarks marksObtained percentage isPassed grade rank hadConflict isPublished lockedAt evalRoundsUsed'
      )
      .sort({ rank: 1, finalMarks: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ResultSheet.countDocuments(filter),
  ]);

  const hasMore = skip + results.length < total;
  const nextPage = hasMore ? Number(page) + 1 : undefined;

  return ok(res, { results, total, page: Number(page), hasMore, nextPage }, 'Results fetched.');
});

// GET /report/student/:examId/:rollNo — individual result (post-publish)
exports.getStudentResult = oasesAsync(async (req, res) => {
  const { examId, rollNo } = req.params;
  const result = await ResultSheet.findOne({
    examConfigId: examId,
    schoolId: req.schoolId,
    isPublished: true,
  })
    .select('+rollNo')
    .lean();

  // Find by decrypted rollNo match
  const all = await ResultSheet.find({
    examConfigId: examId,
    schoolId: req.schoolId,
    isPublished: true,
  })
    .select('+rollNo')
    .lean();

  const match = all.find((r) => r.rollNo === rollNo);
  if (!match) return apiError(res, 'Result not found or not yet published.', 404);

  return ok(res, match, 'Student result fetched.');
});

// GET /report/evaluator/:examId — evaluator performance stats
exports.getEvaluatorStats = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const config = await ExamConfig.findOne({ _id: examId, schoolId: req.schoolId }).lean();
  if (!config) return apiError(res, 'Exam config not found.', 404);

  const sheets = await AnswerSheet.find({ examConfigId: examId, schoolId: req.schoolId })
    .select(
      'eval1AssignedTo eval2AssignedTo headAssignedTo eval1CompletedAt eval2CompletedAt headCompletedAt'
    )
    .lean();

  // Aggregate per evaluator
  const evalMap = {};
  const track = (evalId, completedAt, round) => {
    if (!evalId) return;
    const id = evalId.toString();
    if (!evalMap[id]) evalMap[id] = { evaluatorId: id, completed: 0, totalTimeMs: 0, rounds: {} };
    evalMap[id].completed++;
    evalMap[id].rounds[round] = (evalMap[id].rounds[round] || 0) + 1;
  };
  sheets.forEach((s) => {
    if (s.eval1CompletedAt) track(s.eval1AssignedTo, s.eval1CompletedAt, 1);
    if (s.eval2CompletedAt) track(s.eval2AssignedTo, s.eval2CompletedAt, 2);
    if (s.headCompletedAt) track(s.headAssignedTo, s.headCompletedAt, 3);
  });

  return ok(res, { evaluators: Object.values(evalMap) }, 'Evaluator stats fetched.');
});

// GET /report/evaluator/remuneration/:examId — pay calculation
exports.getEvaluatorRemuneration = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const config = await ExamConfig.findOne({ _id: examId, schoolId: req.schoolId }).lean();
  if (!config) return apiError(res, 'Exam config not found.', 404);

  const ratePerSheet = config.remunerationPerSheet || 10; // INR per sheet

  const marks = await EvaluationMark.find({ isDraft: false })
    .populate({
      path: 'sheetId',
      match: { examConfigId: config._id, schoolId: req.schoolId },
      select: '_id',
    })
    .select('evaluatorId round')
    .lean();

  const evalMap = {};
  marks.forEach((m) => {
    if (!m.sheetId) return; // filtered by populate match
    const id = m.evaluatorId?.toString();
    if (!id) return;
    if (!evalMap[id]) evalMap[id] = { evaluatorId: id, sheets: 0, amount: 0 };
    evalMap[id].sheets++;
    evalMap[id].amount += ratePerSheet;
  });

  return ok(
    res,
    {
      ratePerSheet,
      evaluators: Object.values(evalMap).sort((a, b) => b.sheets - a.sheets),
    },
    'Remuneration calculated.'
  );
});
