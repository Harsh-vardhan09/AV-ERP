// OASES Controller — Moderate (Head Examiner Panel, Sprint 5)
// All routes are HEAD_EXAMINER only.
// Sheet anonymisation: evaluator identities NEVER revealed.
const AnswerSheet       = require('../models/AnswerSheet');
const EvaluationMark    = require('../models/EvaluationMark');
const QuestionScheme    = require('../models/QuestionScheme');
const ExamConfig        = require('../models/ExamConfig');
const Exam              = require('../../../../src-old/models/Exam');
const AuditLog          = require('../models/AuditLog');
const oasesAsync        = require('../../../core/http/asyncHandler');
const { ok } = require('../../../core/http/ApiResponse');
const { apiError } = require('../lib/respond');
const { SHEET_STATUS, EVAL_ROUNDS } = require('../lib/constants');
const { getSignedPageUrl }  = require('../services/pdfService');
const { validateMarks }     = require('../services/marksValidation.service');
const { lockSheet }         = require('../services/result.service');

// GET /moderate/conflicts/:examId
// List sheets in conflict state for this HE's assigned exam
exports.listConflicts = oasesAsync(async (req, res) => {
  const { examId } = req.params;
  const { page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {
    schoolId:     req.schoolId,
    status:       SHEET_STATUS.CONFLICT,
    examConfigId: examId,
  };

  const [sheets, total] = await Promise.all([
    AnswerSheet.find(filter)
      .select('anonymousCode set status createdAt examConfigId')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AnswerSheet.countDocuments(filter),
  ]);

  // Enrich with E1/E2 totals (anonymised)
  const enriched = await Promise.all(
    sheets.map(async (sheet) => {
      const [e1, e2] = await Promise.all([
        EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.ROUND_1, isDraft: false })
          .select('grandTotal totalMarksAwarded submittedAt').lean(),
        EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.ROUND_2, isDraft: false })
          .select('grandTotal totalMarksAwarded submittedAt').lean(),
      ]);
      return {
        sheetId:      sheet._id,
        anonymousCode: sheet.anonymousCode,
        set:          sheet.set,
        status:       sheet.status,
        e1Total:      e1?.grandTotal ?? e1?.totalMarksAwarded ?? null,
        e2Total:      e2?.grandTotal ?? e2?.totalMarksAwarded ?? null,
        difference:   e1 && e2 ? Math.abs((e1.grandTotal ?? e1.totalMarksAwarded ?? 0) - (e2.grandTotal ?? e2.totalMarksAwarded ?? 0)) : null,
        raisedAt:     sheet.createdAt,
      };
    })
  );

  return ok(res, { sheets: enriched, total, page: Number(page) }, 'Conflict sheets fetched.');
});

// GET /moderate/sheet/:sheetId
// Returns sheet + scheme + both evaluators' marks (anonymised)
// CRITICAL: evaluatorId fields NEVER returned
exports.getConflictSheet = oasesAsync(async (req, res) => {
  const sheet = await AnswerSheet.findOne({
    _id: req.params.sheetId,
    schoolId: req.schoolId,
    status: { $in: [SHEET_STATUS.CONFLICT, SHEET_STATUS.HEAD_REVIEW] },
  }).select('-rollNo -rollNoEncrypted -eval1AssignedTo -eval2AssignedTo -uploadedBy').lean();

  if (!sheet) return apiError(res, 'Conflict sheet not found or already resolved.', 404);

  // Fetch both eval marks — STRIP evaluatorId before returning
  const [e1Raw, e2Raw] = await Promise.all([
    EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.ROUND_1, isDraft: false })
      .select('-evaluatorId -schoolId').lean(),
    EvaluationMark.findOne({ sheetId: sheet._id, round: EVAL_ROUNDS.ROUND_2, isDraft: false })
      .select('-evaluatorId -schoolId').lean(),
  ]);

  // Build anonymised mark maps { questionNo → marksGiven }
  const buildMarkMap = (evalMark) => {
    if (!evalMark) return null;
    const map = {};
    (evalMark.marks || []).forEach((m) => { map[m.questionNo] = m; });
    return {
      markMap:      map,
      sectionTotals: evalMark.sectionTotals || {},
      grandTotal:   evalMark.grandTotal || evalMark.totalMarksAwarded || 0,
      submittedAt:  evalMark.submittedAt,
    };
  };

  // Fetch scheme — exclude correctOption (HE can see answer key)
  const scheme = await QuestionScheme.findOne({
    examConfigId: sheet.examConfigId,
    schoolId:     req.schoolId,
  }).select('-createdBy -updatedBy').lean();

  // Group scheme sections
  const sections = {};
  if (scheme?.questions) {
    scheme.questions.forEach((q) => {
      const sec = q.section || 'A';
      if (!sections[sec]) sections[sec] = { name: sec, questions: [] };
      sections[sec].questions.push(q);
    });
    Object.values(sections).forEach((s) =>
      s.questions.sort((a, b) => (a.displayOrder || a.questionNo) - (b.displayOrder || b.questionNo))
    );
  }

  const examConfig = (await ExamConfig.findById(sheet.examConfigId)
    .select('examName subjectName subjectCode totalMarks passingMarks conflictThreshold').lean())
    || (await Exam.findById(sheet.examConfigId)
      .select('name subjectName subjectCode totalMarks passingMarks conflictThreshold').lean());

  // Generate first 3 page URLs
  const images = sheet.pageImages?.length ? sheet.pageImages : sheet.s3Keys || [];
  const pageUrls = await Promise.all(
    images.slice(0, 3).map(async (path, idx) => ({
      pageNo: idx + 1,
      url: await getSignedPageUrl(path),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }))
  );

  return ok(res, {
    sheet: {
      _id:           sheet._id,
      anonymousCode: sheet.anonymousCode,
      totalPages:    sheet.totalPages,
      status:        sheet.status,
      set:           sheet.set,
    },
    examConfig,
    sections: Object.values(sections).sort((a, b) => a.name.localeCompare(b.name)),
    eval1: buildMarkMap(e1Raw),
    eval2: buildMarkMap(e2Raw),
    pageUrls,
  }, 'Conflict sheet data fetched.');
});

// POST /moderate/resolve/:sheetId
// HE submits final marks to resolve the conflict
exports.resolveConflict = oasesAsync(async (req, res) => {
  const { marks, remarks } = req.body;
  const sheetId = req.params.sheetId;

  // Remarks required, min 20 chars
  if (!remarks || remarks.trim().length < 20) {
    return apiError(res, 'Remarks are required and must be at least 20 characters.', 400);
  }

  const sheet = await AnswerSheet.findOne({
    _id: sheetId,
    schoolId: req.schoolId,
    status: { $in: [SHEET_STATUS.CONFLICT, SHEET_STATUS.HEAD_REVIEW] },
  });
  if (!sheet) return apiError(res, 'Conflict sheet not found or already resolved.', 404);

  // Build marks array
  let marksArray = marks;
  if (marks && !Array.isArray(marks)) {
    marksArray = Object.entries(marks).map(([qno, val]) => ({
      questionNo: Number(qno),
      marksGiven: val.isNA ? 0 : (val.marksGiven || 0),
      isNA: !!val.isNA,
      savedAt: new Date(),
    }));
  }

  // Fetch scheme for validation
  const scheme = await QuestionScheme.findOne({ examConfigId: sheet.examConfigId }).select('questions').lean();
  const examConfig = (await ExamConfig.findById(sheet.examConfigId)
    .select('totalMarks passingMarks').lean())
    || (await Exam.findById(sheet.examConfigId)
      .select('totalMarks passingMarks').lean());

  // Validate marks
  const validation = validateMarks({ marks: marksArray, grandTotal: 0, pagesReviewed: [] }, scheme, {
    ...examConfig,
    totalPages: sheet.totalPages,
  });
  if (!validation.isValid) {
    return apiError(res, 'Validation failed.', 400, {
      errors:   validation.errors,
      warnings: validation.warnings,
    });
  }

  const { sectionTotals, grandTotal } = validation;

  // Fetch E1 and E2 totals for audit
  const [e1, e2] = await Promise.all([
    EvaluationMark.findOne({ sheetId, round: EVAL_ROUNDS.ROUND_1, isDraft: false }).select('grandTotal totalMarksAwarded').lean(),
    EvaluationMark.findOne({ sheetId, round: EVAL_ROUNDS.ROUND_2, isDraft: false }).select('grandTotal totalMarksAwarded').lean(),
  ]);

  // Save HE round mark
  await EvaluationMark.findOneAndUpdate(
    { sheetId, evaluatorId: req.userid, round: EVAL_ROUNDS.HEAD, schoolId: req.schoolId },
    {
      $set: {
        marks:             marksArray,
        sectionTotals,
        grandTotal,
        totalMarksAwarded: grandTotal,
        isDraft:           false,
        submittedAt:       new Date(),
        savedAt:           new Date(),
        remarks:           remarks.trim(),
        examConfigId:      sheet.examConfigId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Lock the sheet
  await lockSheet(sheetId, req.schoolId, grandTotal, {
    hadConflict: true,
    lockedBy:    req.userid,
  });

  // Audit
  await AuditLog.create({
    schoolId:   req.schoolId,
    entityType: 'EvaluationMark',
    entityId:   sheetId,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'CONFLICT_RESOLVED_HE',
    details:    {
      e1Total:  e1?.grandTotal ?? e1?.totalMarksAwarded ?? null,
      e2Total:  e2?.grandTotal ?? e2?.totalMarksAwarded ?? null,
      heTotal:  grandTotal,
      remarks:  remarks.trim(),
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
  });

  return ok(res, { grandTotal, sectionTotals }, 'Conflict resolved. Sheet is now locked.');
});
