// OASES Controller — Question Scheme
// POST   /api/v1/oases/scheme/:examId         create/replace
// GET    /api/v1/oases/scheme/:examId          get (all auth roles)
// PATCH  /api/v1/oases/scheme/:examId          patch questions
// POST   /api/v1/oases/scheme/:examId/answer-key  CSV key upload
const QuestionScheme  = require('../models/QuestionScheme');
const ExamConfig      = require('../models/ExamConfig');
const oasesAsync      = require('../../../core/http/asyncHandler');
const { ok } = require('../../../core/http/ApiResponse');
const { apiError } = require('../lib/respond');
const auditService    = require('../services/auditService');
const {
  questionSchemeSchema,
} = require('../validators/questionSchemeValidator');

// Helper: validate marks sum
const validateMarksTotal = (questions, totalMarks) => {
  const mandatoryMarks = questions
    .filter((q) => !q.isOptional)
    .reduce((sum, q) => sum + q.maxMarks, 0);
  return mandatoryMarks === totalMarks;
};

// Create / Replace
exports.saveScheme = oasesAsync(async (req, res) => {
  const { examId } = req.params;

  const examConfig = await ExamConfig.findOne({
    _id:      examId,
    schoolId: req.schoolId,
  });
  if (!examConfig) return apiError(res, 'Exam config not found', 404);

  if (examConfig.status !== 'draft' && examConfig.status !== 'active') {
    return apiError(res, 'Cannot modify scheme when exam is in evaluation or closed', 400);
  }

  const parsed = questionSchemeSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiError(res, 'Validation failed', 400, parsed.error.errors);
  }

  const { questions, set } = parsed.data;

  // Validate marks total
  if (!validateMarksTotal(questions, examConfig.totalMarks)) {
    return apiError(res, `Mandatory question marks sum must equal totalMarks (${examConfig.totalMarks}). Check non-optional questions.`, 400);
  }

  // Upsert — replace if exists
  const scheme = await QuestionScheme.findOneAndUpdate(
    { examConfigId: examId, schoolId: req.schoolId },
    {
      examConfigId: examId,
      schoolId:     req.schoolId,
      set,
      questions,
      updatedBy:    req.userid,
      $setOnInsert: { createdBy: req.userid },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'OasesQuestionScheme',
    entityId:   scheme._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole || req.user?.role,
    action:     'scheme_saved',
    details:    { questionCount: questions.length },
    ipAddress:  req.ip,
  });

  return ok(res, scheme, 'Question scheme saved');
});

// Get
exports.getScheme = oasesAsync(async (req, res) => {
  const { examId } = req.params;

  const scheme = await QuestionScheme.findOne({
    examConfigId: examId,
    schoolId:     req.schoolId,
  }).lean();

  if (!scheme) return apiError(res, 'No question scheme found for this exam config', 404);
  return ok(res, scheme, 'Question scheme retrieved');
});

// Patch individual questions
exports.patchScheme = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return apiError(res, 'Provide an array of questions to update', 400);
  }

  const scheme = await QuestionScheme.findOne({
    examConfigId: examId,
    schoolId:     req.schoolId,
  });
  if (!scheme) return apiError(res, 'Question scheme not found', 404);

  // Merge: update by questionNo
  const updateMap = Object.fromEntries(questions.map((q) => [q.questionNo, q]));
  scheme.questions = scheme.questions.map((q) =>
    updateMap[q.questionNo] ? { ...q, ...updateMap[q.questionNo] } : q
  );
  scheme.updatedBy = req.userid;
  await scheme.save();

  // invalidate Redis scheme cache
  const { safeRedisOperation } = require('../lib/redis');
  await safeRedisOperation(async (redis) => {
    await redis.del(`oases:scheme:${examId}`);
  });

  return ok(res, scheme, 'Questions updated');
});

// Upload MCQ Answer Key (CSV or JSON)
exports.uploadAnswerKey = oasesAsync(async (req, res) => {
  const { examId } = req.params;

  // Accept either pre-parsed JSON array OR raw CSV text
  // CSV format: questionNo,correctOption,negativeMarks
  let rows = req.body.answerKey;

  if (req.body.csv) {
    // Parse raw CSV
    const lines = String(req.body.csv).split('\n').map((l) => l.trim()).filter(Boolean);
    // Skip header if present
    const dataLines = lines[0].toLowerCase().includes('questionno') ? lines.slice(1) : lines;
    rows = dataLines.map((line) => {
      const [questionNo, correctOption, negativeMarks] = line.split(',').map((s) => s.trim());
      return {
        questionNo:    Number(questionNo),
        correctOption: (correctOption || '').toUpperCase(),
        negativeMarks: negativeMarks ? Math.abs(Number(negativeMarks)) : 0,
      };
    });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return apiError(res, 'answerKey must be a non-empty array or valid CSV', 400);
  }

  // Validate correctOption values
  const validOptions = ['A', 'B', 'C', 'D'];
  const invalidRows  = rows.filter((r) => r.correctOption && !validOptions.includes(r.correctOption));
  if (invalidRows.length) {
    return apiError(res, `Invalid correctOption values in rows: ${invalidRows.map((r) => r.questionNo).join(', ')}. Must be A/B/C/D.`, 400);
  }

  const scheme = await QuestionScheme.findOne({
    examConfigId: examId,
    schoolId:     req.schoolId,
  });
  if (!scheme) return apiError(res, 'Question scheme not found', 404);

  // Build key map
  const keyMap = {};
  rows.forEach((k) => {
    keyMap[k.questionNo] = {
      correctOption: k.correctOption,
      negativeMarks: k.negativeMarks ?? 0,
    };
  });

  // Identify MCQ questions missing from the key
  const mcqQuestions = scheme.questions.filter((q) => q.questionType === 'mcq');
  const missing      = mcqQuestions
    .filter((q) => !keyMap[q.questionNo])
    .map((q) => q.questionNo);

  // Apply key
  let updated = 0;
  scheme.questions = scheme.questions.map((q) => {
    const k = keyMap[q.questionNo];
    if (!k) return q;
    updated++;
    return {
      ...q.toObject?.() ?? q,
      correctOption: k.correctOption,
      negativeMarks: k.negativeMarks,
    };
  });
  scheme.updatedBy = req.userid;
  await scheme.save();

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'QuestionScheme',
    entityId:   scheme._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole || req.user?.role,
    action:     'ANSWER_KEY_UPLOADED',
    details:    { updated, missing, totalMcq: mcqQuestions.length },
    ipAddress:  req.ip,
  });

  return ok(res, { updated, missing }, 'Answer key applied');
});
