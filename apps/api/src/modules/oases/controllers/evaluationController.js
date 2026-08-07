// OASES Controller — Evaluation
// Full evaluation data APIs for the split-screen evaluator panel.
// CRITICAL: rollNo, studentId, studentName NEVER returned.
const fs                = require('fs');
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
const { getSignedPageUrl, processAnswerSheet } = require('../services/pdfService');
const auditService      = require('../services/auditService');
const { emitToAll }     = require('../../../../src-old/socket');
const { validateMarks, calculateTotals } = require('../services/marksValidation.service');
const { checkConflict } = require('../services/conflict.service');
const { lockSheet }     = require('../services/result.service');
const { safeRedisOperation } = require('../lib/redis');
const { validateMCQMark } = require('../services/mcq.service');
const logger = require('../../../core/logging/logger.js');

const canEvaluatorControlExamLifecycle = (user = {}) => {
  const role = user.role;
  const oasesRole = user.oasesRole;
  return role === 'teacher' || ['EVALUATOR', 'HEAD_EXAMINER'].includes(oasesRole);
};


// Helper: determine eval round from sheet state
const getRoundForUser = (sheet, userId) => {
  const uid = userId.toString();
  if (sheet.headAssignedTo?.toString() === uid)  return EVAL_ROUNDS.HEAD;
  if (sheet.eval2AssignedTo?.toString() === uid)  return EVAL_ROUNDS.ROUND_2;
  return EVAL_ROUNDS.ROUND_1;
};

// Helper: recalculate section totals from marks + scheme
const recalcTotals = (marks, questions) => {
  const sectionTotals = {};
  let grandTotal = 0;

  const qMap = {};
  (questions || []).forEach((q) => { qMap[q.questionNo] = q; });

  (marks || []).forEach((m) => {
    if (m.isNA) return;
    const q = qMap[m.questionNo];
    const section = q?.section || 'A';
    if (!sectionTotals[section]) sectionTotals[section] = 0;
    sectionTotals[section] += (m.marksGiven || 0);
    grandTotal += (m.marksGiven || 0);
  });

  return { sectionTotals, grandTotal };
};

// GET /evaluation/queue — Evaluator's pending sheet queue
exports.getEvalQueue = oasesAsync(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const uid  = req.userid;

  // Find sheets assigned to this user
  // IMPORTANT: After auto-assign, status may still be 'uploaded' (not yet 'assigned').
  // We match on eval1AssignedTo/eval2AssignedTo/headAssignedTo fields directly,
  // and include all non-terminal statuses so the sheet is always visible.
  const TERMINAL_STATUSES = ['locked', 'rejected', 'ufm_flagged'];
  const filter = {
    schoolId: req.schoolId,
    status: { $nin: TERMINAL_STATUSES },
    $or: [
      { eval1AssignedTo: uid },
      { eval2AssignedTo: uid },
      { headAssignedTo:  uid },
    ],
  };

  const [sheets, total] = await Promise.all([
    AnswerSheet.find(filter)
      .select('anonymousCode status examConfigId set totalPages processingStatus createdAt eval1AssignedTo eval2AssignedTo headAssignedTo')
      .populate('examConfigId', 'examName subjectCode subjectName totalMarks dailyEvalLimit name')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AnswerSheet.countDocuments(filter),
  ]);

  // Enrich with progress % and draft info
  const enriched = await Promise.all(
    sheets.map(async (sheet) => {
      const round = getRoundForUser(sheet, uid);
      const draft = await EvaluationMark.findOne({
        sheetId: sheet._id, evaluatorId: uid, round,
      }).select('marks savedAt grandTotal').lean();

      // Get scheme question count for progress calc
      const scheme = await QuestionScheme.findOne({
        examConfigId: sheet.examConfigId?._id || sheet.examConfigId,
      }).select('questions').lean();

      const totalQuestions = scheme?.questions?.length || 0;
      const answeredCount  = draft?.marks?.filter((m) => m.marksGiven > 0 || m.isNA).length || 0;

      // Sheets already past eval1 are 100% done from the teacher's perspective
      const DONE_STATUSES = ['eval1_done', 'eval2_done', 'locked', 'submitted', 'approved'];
      let progressPercent = 0;
      if (DONE_STATUSES.includes(sheet.status)) {
        progressPercent = 100;
      } else if (totalQuestions > 0) {
        progressPercent = Math.round((answeredCount / totalQuestions) * 100);
      } else if (draft?.grandTotal > 0 && sheet.status === 'in_progress') {
        progressPercent = 50; // schemaless mode — has saved marks but no scheme
      }

      // Resolve exam name — populate targets OasesExamConfig; new uploads use Exam._id
      // so populate may return null. Fall back to a direct Exam model lookup.
      let examName    = sheet.examConfigId?.examName    || sheet.examConfigId?.name || '';
      let subjectName = sheet.examConfigId?.subjectName || '';
      let dailyLimit  = sheet.examConfigId?.dailyEvalLimit || 20;

      if (!examName && sheet.examConfigId) {
        try {
          const examDoc = await Exam.findById(
            sheet.examConfigId?._id || sheet.examConfigId
          ).select('name').lean();
          if (examDoc) examName = examDoc.name;
        } catch (_) { /* non-fatal — name stays empty */ }
      }

      return {
        ...sheet,
        examName,
        subjectName,
        dailyLimit,
        progressPercent,
        draftSavedAt: draft?.savedAt || null,
        draftTotal:   draft?.grandTotal || 0,
      };
    })
  );

  // Today's completed count
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const dailyCount = await EvaluationMark.countDocuments({
    evaluatorId: uid, schoolId: req.schoolId,
    isDraft: false, submittedAt: { $gte: todayStart },
  });

  return ok(res, {
    sheets: enriched, total,
    page: Number(page), limit: Number(limit),
    dailyCount,
  }, 'Eval queue fetched.');
});

// GET /evaluation/sheet/:sheetId — Combined payload for evaluation
// Returns: { sheet, scheme, draft, pageUrls }
// CRITICAL: No student identity ever returned
exports.getSheetForEval = oasesAsync(async (req, res) => {
  const uid      = req.userid;
  const userRole = req.user?.oasesRole;
  const isAdminRole = ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole);

  // SCHOOL_ADMIN / SUPER_ADMIN can view any sheet — no assignment filter
  const sheetQuery = isAdminRole
    ? { _id: req.params.sheetId, schoolId: req.schoolId }
    : {
        _id: req.params.sheetId,
        schoolId: req.schoolId,
        $or: [
          { eval1AssignedTo: uid },
          { eval2AssignedTo: uid },
          { headAssignedTo:  uid },
        ],
      };

  const sheet = await AnswerSheet.findOne(sheetQuery)
    .select('-rollNo -rollNoEncrypted -uploadedBy -studentId').lean();

  if (!sheet) return apiError(res, 'Sheet not found or not assigned to you.', 404);

  // SELF-HEALING: If pageImages is empty and file exists, process now
  // This fixes sheets that were uploaded when Redis/Bull was unavailable,
  // so the queue worker never ran. Only triggers once — subsequent calls
  // will skip this block because processingStatus becomes 'done'.
  if (
    (!sheet.pageImages || sheet.pageImages.length === 0) &&
    sheet.originalFilePath &&
    fs.existsSync(sheet.originalFilePath)
  ) {
    logger.debug(`[evalController] Auto-healing unprocessed sheet ${sheet._id}...`);
    try {
      await processAnswerSheet(sheet._id.toString(), {
        schoolId:    req.schoolId.toString(),
        filePath:    sheet.originalFilePath,
        subjectCode: 'AUTO-HEAL',
        year:        new Date().getFullYear().toString(),
      });
      // Re-read the sheet with updated pageImages + totalPages
      const updated = await AnswerSheet.findById(sheet._id)
        .select('-rollNo -rollNoEncrypted -uploadedBy -studentId').lean();
      if (updated) Object.assign(sheet, updated);
      logger.debug(`[evalController] Auto-heal complete: ${sheet.totalPages} pages.`);
    } catch (healErr) {
      logger.error('[evalController] Auto-heal failed:', healErr.message);
    }
  }

  const round = getRoundForUser(sheet, uid);

  // Fetch scheme — Redis cache (TTL 3600s)
  let scheme = null;
  const schemeCacheKey = `oases:scheme:${sheet.examConfigId}`;
  
  const cached = await safeRedisOperation(async (redis) => {
    const data = await redis.get(schemeCacheKey);
    return data ? JSON.parse(data) : null;
  });
  if (cached) scheme = cached;

  if (!scheme) {
    scheme = await QuestionScheme.findOne({
      examConfigId: sheet.examConfigId,
      schoolId:     req.schoolId,
    }).select('-createdBy -updatedBy -correctOption').lean();
    if (scheme) {
      await safeRedisOperation(async (redis) => {
        await redis.set(schemeCacheKey, JSON.stringify(scheme), 'EX', 3600);
      });
    }
  }

  // Group scheme questions by section
  const sections = {};
  if (scheme?.questions) {
    scheme.questions.forEach((q) => {
      const sec = q.section || 'A';
      if (!sections[sec]) sections[sec] = { name: sec, questions: [] };
      sections[sec].questions.push(q);
    });
    // Sort questions within sections
    Object.values(sections).forEach((sec) =>
      sec.questions.sort((a, b) => (a.displayOrder || a.questionNo) - (b.displayOrder || b.questionNo))
    );
  }

  // Fetch existing draft for this evaluator
  const draft = await EvaluationMark.findOne({
    sheetId: sheet._id, evaluatorId: uid, round,
  }).lean();

  // For round 2: do NOT return round 1 draft
  // (evaluator 2 should not see evaluator 1's marks)

  // Generate first 3 page URLs
  const pageImages = sheet.pageImages?.length ? sheet.pageImages : sheet.s3Keys || [];
  // CRITICAL FIX: Use pageImages.length as the true total — sheet.totalPages in DB
  // can be stale (default 1) if PDF processing ran after the initial upload record was created.
  const actualTotalPages = pageImages.length || sheet.totalPages || 1;
  const firstPages = pageImages.slice(0, 3);
  const pageUrls = await Promise.all(
    firstPages.map(async (path, idx) => {
      const url = await getSignedPageUrl(path);
      return { pageNo: idx + 1, url, expiresAt: new Date(Date.now() + 15 * 60 * 1000) };
    })
  );

  // Marking scheme URL
  let markingSchemeUrl = null;
  if (scheme?.markingSchemePdfPath) {
    markingSchemeUrl = await getSignedPageUrl(scheme.markingSchemePdfPath);
  }

  // Mark sheet as in_progress if just assigned
  if (sheet.status === SHEET_STATUS.ASSIGNED) {
    await AnswerSheet.findByIdAndUpdate(sheet._id, { status: SHEET_STATUS.IN_PROGRESS });
    sheet.status = SHEET_STATUS.IN_PROGRESS;

    // OASES controls exam lifecycle: first active checking sets exam in progress.
    if (canEvaluatorControlExamLifecycle(req.user)) {
      await Exam.findOneAndUpdate(
        { _id: sheet.examConfigId, schoolId: req.schoolId },
        { evaluationStatus: 'in_progress', evaluationLocked: false }
      );
    }
  }

  // Fetch exam config — Redis cache (TTL 1800s)
  let examConfig = null;
  const configCacheKey = `oases:examconfig:${sheet.examConfigId}`;
  
  const cachedConfig = await safeRedisOperation(async (redis) => {
    const data = await redis.get(configCacheKey);
    return data ? JSON.parse(data) : null;
  });
  if (cachedConfig) examConfig = cachedConfig;

  if (!examConfig) {
    // Try legacy OasesExamConfig first (for pre-unification exams)
    examConfig = await ExamConfig.findById(sheet.examConfigId)
      .select('examName subjectCode subjectName totalMarks passingMarks doubleEval conflictThreshold')
      .lean();

    // Fallback: examConfigId points to the unified Exam model (post-unification uploads)
    if (!examConfig) {
      const ExamSubjectConfig = require('../../../../src-old/models/ExamSubjectConfig');

      const examDoc = await Exam.findById(sheet.examConfigId).select('name').lean();

      if (examDoc) {
        // Look up per-subject marks from ExamSubjectConfig using the sheet's routing metadata
        let totalMarks   = 0;
        let passingMarks = 0;

        if (sheet.subjectId && sheet.classId) {
          const subjectCfg = await ExamSubjectConfig.findOne({
            examId:    sheet.examConfigId,
            classId:   sheet.classId,
            subjectId: sheet.subjectId,
            schoolId:  req.schoolId,
          }).select('maxMarks passingMarks').lean();

          if (subjectCfg) {
            totalMarks   = subjectCfg.maxMarks   || 0;
            passingMarks = subjectCfg.passingMarks || 0;
          }
        }

        // If still no marks, try QuestionScheme.maxMarks as a fallback
        if (!totalMarks && scheme) {
          totalMarks = scheme.maxMarks || 0;
        }

        examConfig = {
          examName:          examDoc.name || '',
          subjectCode:       '',
          subjectName:       '',
          totalMarks,
          passingMarks:      passingMarks || Math.round(totalMarks * 0.33),
          doubleEval:        false,
          conflictThreshold: 5,
        };
      }
    }

    if (examConfig) {
      await safeRedisOperation(async (redis) => {
        await redis.set(configCacheKey, JSON.stringify(examConfig), 'EX', 1800);
      });
    }
  }


  return ok(res, {
    sheet: {
      _id:           sheet._id,
      anonymousCode: sheet.anonymousCode,
      totalPages:    actualTotalPages,   // ← always accurate: pageImages count
      status:        sheet.status,
      set:           sheet.set,
    },
    examConfig,
    scheme: {
      sections: Object.values(sections).sort((a, b) => a.name.localeCompare(b.name)),
      totalQuestions: scheme?.questions?.length || 0,
    },
    draft: draft ? {
      marks:          draft.marks || [],
      sectionTotals:  draft.sectionTotals || {},
      grandTotal:     draft.grandTotal || 0,
      pagesReviewed:  draft.pagesReviewed || [],
      annotations:    draft.annotations || [],
      clickMarks:     draft.clickMarks || [],
      markingMode:    draft.markingMode || 'panel',
      savedAt:        draft.savedAt || draft.updatedAt,
    } : null,
    pageUrls,
    markingSchemeUrl,
    round,
  }, 'Sheet data fetched for evaluation.');
});

// GET /evaluation/page/:sheetId/:pageNo — Signed page URL
exports.getPageUrl = oasesAsync(async (req, res) => {
  const { sheetId, pageNo } = req.params;
  const pageIdx  = Number(pageNo) - 1;
  const userRole = req.user?.oasesRole;
  const isAdminRole = ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const sheetQuery = isAdminRole
    ? { _id: sheetId, schoolId: req.schoolId }
    : {
        _id: sheetId, schoolId: req.schoolId,
        $or: [
          { eval1AssignedTo: req.userid },
          { eval2AssignedTo: req.userid },
          { headAssignedTo:  req.userid },
        ],
      };

  const sheet = await AnswerSheet.findOne(sheetQuery)
    .select('pageImages s3Keys totalPages').lean();

  if (!sheet) return apiError(res, 'Sheet not found or not assigned to you.', 404);

  const images = sheet.pageImages?.length ? sheet.pageImages : sheet.s3Keys || [];
  // CRITICAL FIX: images.length is always accurate; sheet.totalPages may be stale.
  const actualTotalPages = images.length || sheet.totalPages || 1;

  // For PDF: page index must be within [0, actualTotalPages-1]
  // (all pageImages entries point to the same PDF file with different #page=N fragments)
  if (pageIdx < 0 || pageIdx >= actualTotalPages) {
    return apiError(res, `Page ${pageNo} does not exist.`, 400);
  }

  const baseUrl = await getSignedPageUrl(images[pageIdx] || images[0]);
  const isPdf   = (images[pageIdx] || images[0] || '').toLowerCase().endsWith('.pdf');

  // For Sprint 2: all pages point to the same PDF file, use #page=N to navigate
  // For Sprint 3 (pdf2pic): each page will be a separate image, no fragment needed
  const url = isPdf ? `${baseUrl}#page=${pageNo}&toolbar=1&navpanes=0` : baseUrl;

  return ok(res, {
    url,
    pageNo:     Number(pageNo),
    totalPages: actualTotalPages,   // ← accurate count
    isPdf,
    expiresAt:  new Date(Date.now() + 15 * 60 * 1000),
  }, 'Page URL generated.');
});

// POST /evaluation/mark — Save single question mark (optimistic)
exports.saveMark = oasesAsync(async (req, res) => {
  const { sheetId, questionNo, marksGiven, isNA, stepMarks } = req.body;

  if (questionNo === undefined) return apiError(res, 'questionNo is required.', 400);

  // Verify assignment
  const sheet = await AnswerSheet.findOne({
    _id: sheetId, schoolId: req.schoolId,
    $or: [
      { eval1AssignedTo: req.userid },
      { eval2AssignedTo: req.userid },
      { headAssignedTo:  req.userid },
    ],
  }).select('_id examConfigId status eval1AssignedTo eval2AssignedTo headAssignedTo');

  if (!sheet) return apiError(res, 'Sheet not found or not assigned to you.', 404);
  if (sheet.status === SHEET_STATUS.LOCKED) return apiError(res, 'Sheet is locked.', 403);

  const round = getRoundForUser(sheet, req.userid);

  // Validate marks against scheme
  const scheme = await QuestionScheme.findOne({
    examConfigId: sheet.examConfigId,
  }).select('questions').lean();

  const question = scheme?.questions?.find((q) => q.questionNo === questionNo);
  if (question && !isNA && marksGiven > question.maxMarks) {
    return apiError(res, `Marks (${marksGiven}) exceed max (${question.maxMarks}) for Q${questionNo}.`, 400);
  }

  // MCQ validation — server recomputes score from answer key
  if (question?.questionType === 'mcq' && !isNA) {
    const studentOption = req.body.studentOption || req.body.metadata?.studentOption;
    if (studentOption) {
      const { valid, expected } = validateMCQMark(
        studentOption,
        question.correctOption, // null if key not yet uploaded — soft pass
        question.maxMarks,
        question.negativeMarks || 0,
        marksGiven
      );
      if (!valid) {
        return apiError(res, `MCQ mark tampered: expected ${expected} for Q${questionNo}, got ${marksGiven}.`, 400);
      }
    }
  }

  // Upsert mark in EvaluationMark.marks[]
  const markEntry = {
    questionNo,
    marksGiven: isNA ? 0 : (marksGiven || 0),
    isNA: !!isNA,
    stepMarks: stepMarks || [],
    savedAt: new Date(),
  };

  let evalMark = await EvaluationMark.findOne({
    sheetId, evaluatorId: req.userid, round, schoolId: req.schoolId,
  });

  if (!evalMark) {
    evalMark = await EvaluationMark.create({
      sheetId, evaluatorId: req.userid, round,
      schoolId: req.schoolId,
      examConfigId: sheet.examConfigId,
      marks: [markEntry],
      isDraft: true,
    });
  } else {
    const idx = evalMark.marks.findIndex((m) => m.questionNo === questionNo);
    if (idx >= 0) {
      evalMark.marks[idx] = markEntry;
    } else {
      evalMark.marks.push(markEntry);
    }
  }

  // Recalculate totals
  const { sectionTotals, grandTotal } = recalcTotals(evalMark.marks, scheme?.questions);
  evalMark.sectionTotals     = sectionTotals;
  evalMark.grandTotal        = grandTotal;
  evalMark.totalMarksAwarded = grandTotal; // BC
  evalMark.savedAt           = new Date();
  await evalMark.save();

  // Update sheet status to in_progress if was assigned
  if (sheet.status === SHEET_STATUS.ASSIGNED) {
    await AnswerSheet.findByIdAndUpdate(sheet._id, { status: SHEET_STATUS.IN_PROGRESS });
  }

  // Audit log (fire-and-forget)
  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'EvaluationMark',
    entityId:   evalMark._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'MARK_ENTERED',
    details:    { questionNo, marksGiven: markEntry.marksGiven, isNA: markEntry.isNA },
    ipAddress:  req.ip,
  });

  return ok(res, {
    questionNo,
    marksGiven: markEntry.marksGiven,
    isNA: markEntry.isNA,
    sectionTotals,
    grandTotal,
  }, 'Mark saved.');
});

// POST /evaluation/draft/:sheetId — Bulk save draft (auto-save)
exports.saveDraft = oasesAsync(async (req, res) => {
  const { marks, pagesReviewed, annotations, clickMarks, markingMode } = req.body;
  const sheetId = req.params.sheetId;

  const sheet = await AnswerSheet.findOne({
    _id: sheetId, schoolId: req.schoolId,
    $or: [
      { eval1AssignedTo: req.userid },
      { eval2AssignedTo: req.userid },
      { headAssignedTo:  req.userid },
    ],
  }).select('_id examConfigId status eval1AssignedTo eval2AssignedTo headAssignedTo');

  if (!sheet) return apiError(res, 'Sheet not found or not assigned.', 404);

  const round = getRoundForUser(sheet, req.userid);

  // Get scheme for totals recalc
  const scheme = await QuestionScheme.findOne({
    examConfigId: sheet.examConfigId,
  }).select('questions').lean();

  // Build marks array from object or array
  let marksArray = marks;
  if (marks && !Array.isArray(marks)) {
    // Convert {questionNo: {marksGiven, isNA}} object to array
    marksArray = Object.entries(marks).map(([qno, val]) => ({
      questionNo: Number(qno),
      marksGiven: val.isNA ? 0 : (val.marksGiven || 0),
      isNA: !!val.isNA,
      stepMarks: val.stepMarks || [],
      savedAt: new Date(),
    }));
  }

  // Schemaless TOTAL-only: frontend sends [{questionNo:'TOTAL', marksGiven:N}]
  const isTotalOnly = marksArray && marksArray.length === 1 && String(marksArray[0] && marksArray[0].questionNo).toUpperCase() === 'TOTAL';
  let sectionTotals, grandTotal;
  if (isTotalOnly) {
    grandTotal    = (marksArray[0].marksGiven) || 0;
    sectionTotals = {};
  } else {
    ({ sectionTotals, grandTotal } = recalcTotals(marksArray, scheme && scheme.questions));
  }

  const evalMark = await EvaluationMark.findOneAndUpdate(
    { sheetId, evaluatorId: req.userid, round, schoolId: req.schoolId },
    {
      $set: {
        // FIX: "TOTAL" is a frontend-only signal (questionNo is Number in schema).
        // Cast would throw CastError → error middleware returns "Invalid record ID".
        // For TOTAL-only mode, persist [] — grandTotal is stored in its own field.
        marks:             isTotalOnly ? [] : (marksArray || []),
        pagesReviewed:     pagesReviewed || [],
        annotations:       annotations || [],
        clickMarks:        Array.isArray(clickMarks) ? clickMarks : [],
        markingMode:       markingMode || 'panel',
        sectionTotals,
        grandTotal,
        totalMarksAwarded: grandTotal,
        isDraft:           true,
        savedAt:           new Date(),
        examConfigId:      sheet.examConfigId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return ok(res, { savedAt: evalMark.savedAt }, 'Draft saved.');
});

// GET /evaluation/draft/:sheetId — Get current draft
exports.getDraft = oasesAsync(async (req, res) => {
  const userRole    = req.user?.oasesRole;
  const isAdminRole = ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const sheetQuery = isAdminRole
    ? { _id: req.params.sheetId, schoolId: req.schoolId }
    : {
        _id: req.params.sheetId, schoolId: req.schoolId,
        $or: [
          { eval1AssignedTo: req.userid },
          { eval2AssignedTo: req.userid },
          { headAssignedTo:  req.userid },
        ],
      };

  const sheet = await AnswerSheet.findOne(sheetQuery)
    .select('_id eval1AssignedTo eval2AssignedTo headAssignedTo status');

  if (!sheet) return apiError(res, 'Sheet not found.', 404);

  // Admin: return the most recent submitted/approved draft for any evaluator
  let draft;
  if (isAdminRole) {
    draft = await EvaluationMark.findOne(
      { sheetId: req.params.sheetId },
      null,
      { sort: { updatedAt: -1 } }
    ).lean();
  } else {
    const round = getRoundForUser(sheet, req.userid);
    draft = await EvaluationMark.findOne({
      sheetId: req.params.sheetId,
      evaluatorId: req.userid,
      round,
    }).lean();
  }

  return ok(res, draft || null, 'Draft fetched.');
});

// POST /evaluation/page-reviewed/:sheetId/:pageNo
exports.markPageReviewed = oasesAsync(async (req, res) => {
  const { sheetId, pageNo } = req.params;
  const userRole    = req.user?.oasesRole;
  const isAdminRole = ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole);

  // Admin: read-only, no page-review tracking needed
  if (isAdminRole) {
    return ok(res, { pageNo: Number(pageNo) }, 'Page reviewed (admin view).');
  }

  const sheet = await AnswerSheet.findOne({
    _id: sheetId, schoolId: req.schoolId,
    $or: [
      { eval1AssignedTo: req.userid },
      { eval2AssignedTo: req.userid },
      { headAssignedTo:  req.userid },
    ],
  }).select('_id eval1AssignedTo eval2AssignedTo headAssignedTo');

  if (!sheet) return apiError(res, 'Sheet not found.', 404);

  const round = getRoundForUser(sheet, req.userid);

  await EvaluationMark.findOneAndUpdate(
    { sheetId, evaluatorId: req.userid, round, schoolId: req.schoolId },
    { $addToSet: { pagesReviewed: Number(pageNo) } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return ok(res, { pageNo: Number(pageNo) }, 'Page marked as reviewed.');
});

// POST /evaluation/ufm/:sheetId — Flag UFM from evaluator
exports.flagUfm = oasesAsync(async (req, res) => {
  const { note } = req.body;
  const sheet = await AnswerSheet.findOneAndUpdate(
    {
      _id: req.params.sheetId, schoolId: req.schoolId,
      $or: [
        { eval1AssignedTo: req.userid },
        { eval2AssignedTo: req.userid },
        { headAssignedTo:  req.userid },
      ],
    },
    { status: SHEET_STATUS.UFM_FLAGGED, isUfmFlagged: true, ufmNote: note || '' },
    { new: true }
  );
  if (!sheet) return apiError(res, 'Sheet not found.', 404);

  emitToAll('oases:sheet:status', { sheetId: sheet._id, examConfigId: sheet.examConfigId, status: SHEET_STATUS.UFM_FLAGGED });
  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'AnswerSheet',
    entityId:   sheet._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'EVAL_UFM_FLAGGED',
    details:    { note },
    ipAddress:  req.ip,
  });
  return ok(res, null, 'Sheet flagged for UFM.');
});

// POST /evaluation/reject/:sheetId — Reject script from evaluator
exports.rejectSheet = oasesAsync(async (req, res) => {
  const { reason } = req.body;
  const sheet = await AnswerSheet.findOneAndUpdate(
    {
      _id: req.params.sheetId, schoolId: req.schoolId,
      $or: [
        { eval1AssignedTo: req.userid },
        { eval2AssignedTo: req.userid },
        { headAssignedTo:  req.userid },
      ],
    },
    { status: SHEET_STATUS.REJECTED, isRejected: true, rejectionNote: reason || '' },
    { new: true }
  );
  if (!sheet) return apiError(res, 'Sheet not found.', 404);

  emitToAll('oases:sheet:status', { sheetId: sheet._id, examConfigId: sheet.examConfigId, status: SHEET_STATUS.REJECTED });
  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'AnswerSheet',
    entityId:   sheet._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'EVAL_SHEET_REJECTED',
    details:    { reason },
    ipAddress:  req.ip,
  });
  return ok(res, null, 'Sheet rejected.');
});

// POST /evaluation/submit/:sheetId — Submit final marks
exports.submitMarks = oasesAsync(async (req, res) => {
  const { marks, remarks } = req.body;
  const sheetId = req.params.sheetId;

  const sheet = await AnswerSheet.findOne({
    _id: sheetId, schoolId: req.schoolId,
    $or: [
      { eval1AssignedTo: req.userid },
      { eval2AssignedTo: req.userid },
      { headAssignedTo:  req.userid },
    ],
  });
  if (!sheet) return apiError(res, 'Sheet not found.', 404);
  if (sheet.status === SHEET_STATUS.LOCKED) return apiError(res, 'Sheet is locked.', 403);

  const round = getRoundForUser(sheet, req.userid);

  // Fetch scheme + exam config for validation.
  // CRITICAL: examConfigId now points to the main Exam model (unified exam system).
  // We try legacy OasesExamConfig first (for backwards compat), then fall back to Exam.
  const [scheme, legacyExamConfig] = await Promise.all([
    QuestionScheme.findOne({ examConfigId: sheet.examConfigId }).select('questions').lean(),
    ExamConfig.findById(sheet.examConfigId).select('totalMarks passingMarks conflictThreshold doubleEval dailyEvalLimit').lean(),
  ]);
  let examConfig = legacyExamConfig;
  if (!examConfig) {
    // Fall back to unified Exam model
    const examDoc = await Exam.findOne({ _id: sheet.examConfigId, schoolId: req.schoolId })
      .select('totalMarks passingMarks conflictThreshold doubleEval dailyEvalLimit').lean();
    if (examDoc) examConfig = examDoc;
  }

  // Build marks array
  let marksArray = marks;
  if (marks && !Array.isArray(marks)) {
    marksArray = Object.entries(marks).map(([qno, val]) => ({
      questionNo: Number(qno),
      marksGiven: val.isNA ? 0 : (val.marksGiven || 0),
      isNA: !!val.isNA,
      stepMarks: val.stepMarks || [],
      savedAt: new Date(),
    }));
  }

  // Schemaless TOTAL-only: frontend sends [{questionNo:'TOTAL', marksGiven:N}]
  const isTotalOnly = marksArray && marksArray.length === 1 && String(marksArray[0] && marksArray[0].questionNo).toUpperCase() === 'TOTAL';
  let sectionTotals, grandTotal;
  if (isTotalOnly) {
    grandTotal    = (marksArray[0].marksGiven) || 0;
    sectionTotals = {};
  } else {
    ({ sectionTotals, grandTotal } = recalcTotals(marksArray, scheme && scheme.questions));
  }

  // Server-side validation
  // NOTE: grandTotal is intentionally omitted from evalMarkForValidation.
  // recalcTotals (used above) does not apply optional-group "best-N" logic,
  // while validateMarks internally re-computes via calculateTotals which does.
  // Passing a mismatched grandTotal would cause a false "Total mismatch" 400 error.
  // The mismatch guard in validateMarks only fires when grandTotal !== undefined.
  const evalMarkForValidation = {
    marks:         marksArray || [],
    pagesReviewed: req.body.pagesReviewed || [],
  };
  const validation = validateMarks(evalMarkForValidation, scheme, {
    ...examConfig,
    totalPages: sheet.totalPages,
  });
  if (!validation.isValid) {
    // DIAGNOSTIC: log actual errors so we can see what's failing
    logger.error('[submitMarks] Validation failed for sheet', sheetId, '\nErrors:', JSON.stringify(validation.errors, null, 2));
    return apiError(res, 'Validation failed. Please fix errors before submitting.', 400, validation.errors);
  }

  const evalMark = await EvaluationMark.findOneAndUpdate(
    { sheetId, evaluatorId: req.userid, round, schoolId: req.schoolId },
    {
      $set: {
        // FIX: "TOTAL" string cannot be cast to Number (QuestionMarkSchema type).
        // Storing it causes a Mongoose CastError → "Invalid record ID" 400 response.
        // For TOTAL-only (schemaless) mode, persist marks:[] and rely on grandTotal field.
        marks:             isTotalOnly ? [] : (marksArray || []),
        sectionTotals,
        grandTotal,
        totalMarksAwarded: grandTotal,
        isDraft:           false,
        submittedAt:       new Date(),
        savedAt:           new Date(),
        remarks:           remarks || '',
        examConfigId:      sheet.examConfigId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Advance sheet status
  let nextStatus;
  const updatePayload = {};
  if (round === EVAL_ROUNDS.ROUND_1) {
    nextStatus = SHEET_STATUS.EVAL1_DONE;
    updatePayload.eval1CompletedAt = new Date();
  } else if (round === EVAL_ROUNDS.ROUND_2) {
    nextStatus = SHEET_STATUS.EVAL2_DONE;
    updatePayload.eval2CompletedAt = new Date();
  } else if (round === EVAL_ROUNDS.HEAD) {
    nextStatus = SHEET_STATUS.LOCKED;
    updatePayload.headCompletedAt = new Date();
    updatePayload.lockedAt = new Date();
    updatePayload.lockedBy = req.userid;
  }

  await AnswerSheet.findByIdAndUpdate(sheet._id, { status: nextStatus, ...updatePayload });

  // OASES controls exam lifecycle: evaluator finish action marks exam completed.
  // Only update the Exam model if it's used as the exam config source.
  if (canEvaluatorControlExamLifecycle(req.user) && !legacyExamConfig) {
    await Exam.findOneAndUpdate(
      { _id: sheet.examConfigId, schoolId: req.schoolId },
      { evaluationStatus: 'completed', evaluationLocked: true }
    );
  }

  // Redis daily count incr
  let dailyCount = 1;
  const today = new Date().toISOString().slice(0, 10);
  const key = `oases:daily:${req.userid}:${today}`;
  
  const result = await safeRedisOperation(async (redis) => {
    const count = await redis.incr(key);
    await redis.expire(key, 86400);
    return count;
  });
  if (result) dailyCount = result;

  // Socket emit
  emitToAll('oases:sheet:status', {
    sheetId: sheet._id, examConfigId: sheet.examConfigId, status: nextStatus,
  });

  // Audit
  await AuditLog.create({
    schoolId:   req.schoolId,
    entityType: 'EvaluationMark',
    entityId:   evalMark._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'EVAL_SUBMITTED',
    details:    { sheetId, round, grandTotal, sectionTotals },
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'] || '',
  });

  // Post-submit pipeline (fire-and-forget)
  setImmediate(async () => {
    try {
      if (round === EVAL_ROUNDS.ROUND_2 && examConfig?.doubleEval) {
        // Check conflict between R1 and R2
        await checkConflict(sheetId, req.schoolId);
      } else if (round === EVAL_ROUNDS.ROUND_1 && !examConfig?.doubleEval) {
        // Single-eval exam: lock immediately
        await lockSheet(sheetId, req.schoolId, grandTotal, { lockedBy: req.userid });
      } else if (round === EVAL_ROUNDS.HEAD) {
        // HE round: lock with HE's marks
        await lockSheet(sheetId, req.schoolId, grandTotal, { hadConflict: true, lockedBy: req.userid });
      }
    } catch (err) {
      logger.error('[evaluationController] post-submit pipeline error:', err.message);
    }
  });

  return ok(res, {
    _id:          evalMark._id,
    sectionTotals,
    grandTotal,
    submittedAt:  evalMark.submittedAt,
    status:       nextStatus,
    dailyCount,
    dailyLimit:   examConfig?.dailyEvalLimit || 20,
    warnings:     validation.warnings,
  }, 'Marks submitted successfully.');
});

// POST /evaluation/approve/:sheetId — Admin approves a submitted sheet
exports.approveSheet = oasesAsync(async (req, res) => {
  const { sheetId } = req.params;
  const userRole    = req.user?.oasesRole;
  const isAdminRole = ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole);
  if (!isAdminRole) return apiError(res, 'Only admin can approve sheets.', 403);

  const sheet = await AnswerSheet.findOneAndUpdate(
    { _id: sheetId, schoolId: req.schoolId },
    { status: SHEET_STATUS.APPROVED },
    { new: true }
  ).select('_id anonymousCode examConfigId status');

  if (!sheet) return apiError(res, 'Sheet not found.', 404);

  emitToAll('oases:sheet:status', {
    sheetId: sheet._id,
    examConfigId: sheet.examConfigId,
    status: SHEET_STATUS.APPROVED,
  });

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'AnswerSheet',
    entityId:   sheet._id,
    actorId:    req.userid,
    actorRole:  userRole,
    action:     'SHEET_APPROVED',
    details:    { anonymousCode: sheet.anonymousCode },
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'] || '',
  });

  return ok(res, { sheetId: sheet._id, status: SHEET_STATUS.APPROVED }, 'Sheet approved.');
});

// POST /evaluation/override/:sheetId — Admin overrides teacher marks
exports.overrideMarks = oasesAsync(async (req, res) => {
  const { sheetId } = req.params;
  const userRole    = req.user?.oasesRole;
  const isAdminRole = ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole);
  if (!isAdminRole) return apiError(res, 'Only admin can override marks.', 403);

  const { marks, annotations } = req.body;

  const sheet = await AnswerSheet.findOne({ _id: sheetId, schoolId: req.schoolId })
    .select('_id examConfigId eval1AssignedTo status');
  if (!sheet) return apiError(res, 'Sheet not found.', 404);

  const scheme = await QuestionScheme.findOne({ examConfigId: sheet.examConfigId })
    .select('questions').lean();

  let marksArray = marks;
  if (marks && !Array.isArray(marks)) {
    marksArray = Object.entries(marks).map(([qno, val]) => ({
      questionNo: Number(qno),
      marksGiven: val.isNA ? 0 : (val.marksGiven || 0),
      isNA: !!val.isNA,
      stepMarks: val.stepMarks || [],
      savedAt: new Date(),
    }));
  }

  const { sectionTotals, grandTotal } = recalcTotals(marksArray, scheme?.questions);

  // Upsert an admin override EvaluationMark (round 99 = admin override)
  const ADMIN_ROUND = 99;
  const evalMark = await EvaluationMark.findOneAndUpdate(
    { sheetId, evaluatorId: req.userid, round: ADMIN_ROUND, schoolId: req.schoolId },
    {
      $set: {
        marks:             marksArray || [],
        annotations:       annotations || [],
        sectionTotals,
        grandTotal,
        totalMarksAwarded: grandTotal,
        isDraft:           false,
        submittedAt:       new Date(),
        savedAt:           new Date(),
        examConfigId:      sheet.examConfigId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Keep sheet in approved state with overridden marks flag
  await AnswerSheet.findByIdAndUpdate(sheet._id, { status: SHEET_STATUS.APPROVED });

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'EvaluationMark',
    entityId:   evalMark._id,
    actorId:    req.userid,
    actorRole:  userRole,
    action:     'ADMIN_MARKS_OVERRIDE',
    details:    { sheetId, grandTotal, sectionTotals },
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'] || '',
  });

  return ok(res, {
    sectionTotals,
    grandTotal,
    savedAt: evalMark.savedAt,
  }, 'Marks overridden by admin.');
});
