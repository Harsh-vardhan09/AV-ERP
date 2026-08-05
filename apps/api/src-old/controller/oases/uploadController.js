

// ══════════════════════════════════════════════════════════════════
// OASES Controller — Upload (Sprint 2 — full)
// POST /upload/:examConfigId  — multi-file, duplicate check, queue
// GET  /upload/:examConfigId  — list with aggregate counts
// GET  /upload/:sheetId/reprocess — retry failed
// GET  /upload/:sheetId/page/:pageNo — signed page URL
// PATCH /upload/:sheetId/reject
// PATCH /upload/:sheetId/flag-ufm
// ══════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const AnswerSheet = require('../../models/oases/AnswerSheet');
const SchoolSettings = require('../../models/SchoolSettings');
const ExamConfig = require('../../models/oases/ExamConfig');
const oasesAsync = require('../../utils/oasesAsyncHandler');
const { oasesSuccess, oasesError } = require('../../utils/oasesResponse');
const { SHEET_STATUS, PROCESSING_STATUS } = require('../../utils/oasesConstants');
const { addPdfJob } = require('../../services/oases/pdfQueue');
const { getSignedPageUrl, processAnswerSheet } = require('../../services/oases/pdfService');
const auditService = require('../../services/oases/auditService');
const { emitToAll } = require('../../socket');
const { uploadPdfToCloud } = require('../../config/cloudnary');

// ── Helpers ─────────────────────────────────────────────────────
const generateAnonymousCode = () =>
  `ANON-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/**
 * Extract rollNo from filename.
 * Supports patterns: "rollno_1234.pdf", "1234_anything.pdf", "1234.pdf"
 */
const extractRollNo = (filename) => {
  const base = filename.replace(/\.[^.]+$/, ''); // strip extension
  const m =
    base.match(/rollno[_-]?(\w+)/i) ||
    base.match(/^(\d{4,12})/) ||
    base.match(/[_-](\d{4,12})$/);
  return m ? m[1] : null;
};

// ── POST /upload/:examConfigId ───────────────────────────────────
exports.uploadSheets = oasesAsync(async (req, res) => {
  const { examConfigId } = req.params;

  // ── Look up from the main Exam model (single source of truth) ──
  const Exam = require('../../models/Exam');
  const config = await Exam.findOne({
    _id: examConfigId,
    schoolId: req.schoolId,
  }).lean();

  // Fallback to legacy OasesExamConfig if not found in main Exam model
  let legacyConfig = null;
  if (!config) {
    legacyConfig = await ExamConfig.findOne({
      _id: examConfigId,
      schoolId: req.schoolId,
      status: { $in: ['active', 'evaluation', 'draft'] },
    }).lean();
  }

  if (!config && !legacyConfig) {
    return oasesError(res, 'Exam not found or does not belong to this school.', 404);
  }

  const effectiveConfig = config || legacyConfig;

  const settings = await SchoolSettings.findOne({ schoolId: req.schoolId }).select('isOasesEnabled').lean();
  if (!settings?.isOasesEnabled) {
    return oasesError(res, 'OASES upload is disabled by the school admin.', 403);
  }

  const files = req.files; // array from upload.array('sheets', 30)
  if (!files || files.length === 0) return oasesError(res, 'No files uploaded.', 400);

  const results = [];
  const skipped = [];

  for (const file of files) {
    const rollNo = extractRollNo(file.originalname);
    const fileSize = file.size;
    const origName = file.originalname;

    // ── Upload buffer directly to Cloudinary (no local disk needed) ─────
    let fileKey;
    try {
      const safe = origName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const publicId = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
      const cloudRes = await uploadPdfToCloud(file.buffer, {
        folder: 'erp/oases/pdfs',
        public_id: publicId,
      });
      fileKey = cloudRes.secure_url;
    } catch (uploadErr) {
      console.error('[uploadController] Cloudinary upload failed:', uploadErr.message);
      skipped.push({ filename: origName, rollNo, reason: 'Cloud upload failed' });
      continue;
    }

    // ── Duplicate check: same rollNo + examConfig already exists ──
    if (rollNo) {
      const exists = await AnswerSheet.findOne({
        examConfigId,
        schoolId: req.schoolId,
        rollNo,
        processingStatus: { $ne: PROCESSING_STATUS.FAILED }, // allow reupload of failed
      }).select('_id anonymousCode').lean();

      if (exists) {
        skipped.push({ filename: origName, rollNo, reason: 'Duplicate roll number' });
        continue;
      }
    }

    const anonymousCode = generateAnonymousCode();

    // Extract optional metadata from request body (sent by upload form)
    const { classId, sectionId, subjectId, studentId } = req.body || {};

    const sheet = await AnswerSheet.create({
      schoolId: req.schoolId,
      examConfigId,
      anonymousCode,
      rollNo,               // stored pre-anonymisation (scrubbed by pdfService)
      originalFilePath: fileKey,
      s3Keys: [fileKey],   // backwards compat
      totalPages: 1,
      processingStatus: PROCESSING_STATUS.PENDING,
      status: SHEET_STATUS.UPLOADED,
      uploadedBy: req.userid,
      originalFilename: origName,
      fileSizeBytes: fileSize,
      // ── Routing metadata for auto-assignment ────────────────────
      ...(classId && { classId }),
      ...(sectionId && { sectionId }),
      ...(subjectId && { subjectId }),
      ...(studentId && { studentId }),
    });

    // Queue for PDF processing via Bull/Redis
    const year = effectiveConfig.academicYear || effectiveConfig.session?.toString() || new Date().getFullYear().toString();
    const jobMeta = {
      sheetId: sheet._id.toString(),
      schoolId: req.schoolId.toString(),
      filePath: fileKey,
      subjectCode: effectiveConfig.subjectCode || 'UNKNOWN',
      year,
    };
    const jobId = await addPdfJob(jobMeta);

    // CRITICAL FALLBACK: If Bull/Redis is unavailable (jobId === null),
    // process the PDF synchronously right now so pageImages + totalPages
    // are always populated regardless of queue availability.
    if (!jobId) {
      setImmediate(() =>
        processAnswerSheet(sheet._id.toString(), jobMeta).catch((err) =>
          console.error('[uploadController] Direct PDF processing failed:', err.message)
        )
      );
    }

    // Notify admin room immediately
    emitToAll('oases:upload:received', {
      sheetId: sheet._id,
      examConfigId,
      filename: origName,
      anonymousCode,
      rollNo,
    });

    // Audit log (fire-and-forget)
    auditService.log({
      schoolId: req.schoolId,
      entityType: 'AnswerSheet',
      entityId: sheet._id,
      actorId: req.userid,
      actorRole: req.user?.oasesRole,
      action: 'SHEET_UPLOADED',
      details: { anonymousCode, filename: origName, fileSize },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    results.push({
      sheetId: sheet._id,
      anonymousCode,
      rollNo,
      filename: origName,
      status: SHEET_STATUS.UPLOADED,
      processingStatus: PROCESSING_STATUS.PENDING,
    });
  }

  // ── Auto-assign sheets to subject teacher (fire-and-forget) ────
  // Runs AFTER the response is sent so it never blocks.
  // Uses the same doAssign logic as the manual auto-assign endpoint.
  if (results.length > 0) {
    setImmediate(async () => {
      try {
        const TeacherSubjectAssignment = require('../../models/TeacherSubjectAssignment');
        const ClassTeacherAssignment = require('../../models/ClassTeacherAssignment');
        const { User } = require('../../models/user');
        const EvaluatorAssignment = require('../../models/oases/EvaluatorAssignment');
        const OasesNotification = require('../../models/oases/OasesNotification');
        const { EVAL_ROUNDS, NOTIFICATION_TYPES, OASES_ROLES } = require('../../utils/oasesConstants');

        // Get a sample sheet to read routing metadata
        const sampleSheet = await AnswerSheet.findOne({
          examConfigId,
          schoolId: req.schoolId,
          eval1AssignedTo: null,
          status: { $nin: [SHEET_STATUS.REJECTED] },
        }).select('classId sectionId subjectId').lean();

        if (!sampleSheet) return;

        let teacherId = null;

        if (sampleSheet.classId && sampleSheet.subjectId) {
          const tsa = await TeacherSubjectAssignment.findOne({
            schoolId: req.schoolId,
            subjectId: sampleSheet.subjectId,
            classId: sampleSheet.classId,
            ...(sampleSheet.sectionId ? { sectionId: sampleSheet.sectionId } : {}),
          }).lean();
          if (tsa) teacherId = tsa.teacherId;

          if (!teacherId && sampleSheet.sectionId) {
            const cta = await ClassTeacherAssignment.findOne({
              schoolId: req.schoolId,
              classId: sampleSheet.classId,
              sectionId: sampleSheet.sectionId,
            }).lean();
            if (cta) teacherId = cta.teacherId;
          }
        } else if (sampleSheet.classId) {
          // No subject — try class teacher fallback
          const cta = await ClassTeacherAssignment.findOne({
            schoolId: req.schoolId,
            classId: sampleSheet.classId,
          }).lean();
          if (cta) teacherId = cta.teacherId;
        }

        if (!teacherId) {
          console.log(`[uploadController] Auto-assign skipped: no teacher found for examConfigId=${examConfigId}`);
          return;
        }

        // Get ALL unassigned sheets for this exam
        const unassigned = await AnswerSheet.find({
          schoolId: req.schoolId,
          examConfigId,
          eval1AssignedTo: null,
          status: { $nin: [SHEET_STATUS.REJECTED, SHEET_STATUS.UFM_FLAGGED] },
        }).select('_id').lean();

        if (unassigned.length === 0) return;

        const sheetIds = unassigned.map((s) => s._id.toString());
        const evalField = 'eval1AssignedTo';

        await AnswerSheet.updateMany(
          { _id: { $in: sheetIds }, schoolId: req.schoolId },
          { [evalField]: teacherId, status: SHEET_STATUS.ASSIGNED }
        );

        await EvaluatorAssignment.findOneAndUpdate(
          { examConfigId, evaluatorId: teacherId, round: EVAL_ROUNDS.ROUND_1, schoolId: req.schoolId },
          {
            $addToSet: { sheetIds: { $each: sheetIds } },
            $inc: { totalAssigned: sheetIds.length },
            assignedBy: req.userid,
            dailyLimit: 20,
          },
          { upsert: true, new: true }
        );

        OasesNotification.create({
          schoolId: req.schoolId,
          recipientId: teacherId,
          type: NOTIFICATION_TYPES.ASSIGNMENT,
          title: 'New Answer Sheets Assigned',
          message: `${sheetIds.length} sheet(s) assigned for evaluation.`,
          entityType: 'AnswerSheet',
        }).catch(() => { });

        emitToAll('oases:assignment:new', { evaluatorId: teacherId, examConfigId, count: sheetIds.length, round: 1 });
        console.log(`[uploadController] Auto-assigned ${sheetIds.length} sheets to teacher ${teacherId}`);
      } catch (autoErr) {
        console.error('[uploadController] Auto-assign failed (non-fatal):', autoErr.message);
      }
    });
  }

  return oasesSuccess(
    res,
    { sheets: results, skipped, total: results.length, totalSkipped: skipped.length },
    `${results.length} sheet(s) uploaded. ${skipped.length} skipped.`,
    201
  );
});

// ── GET /upload/:examConfigId ────────────────────────────────────
exports.listSheets = oasesAsync(async (req, res) => {
  const { examConfigId } = req.params;
  const { processingStatus, status, page = 1, limit = 30 } = req.query;

  const filter = { schoolId: req.schoolId, examConfigId };
  if (processingStatus) filter.processingStatus = processingStatus;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [sheets, total, aggregate] = await Promise.all([
    AnswerSheet.find(filter)
      .select('-s3Keys -rollNo -rollNoEncrypted -pageImages') // never expose sensitive fields in list
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AnswerSheet.countDocuments(filter),
    AnswerSheet.aggregate([
      { $match: { schoolId: req.schoolId, examConfigId: new (require('mongoose').Types.ObjectId)(examConfigId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$processingStatus', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$processingStatus', 'processing'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$processingStatus', 'done'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$processingStatus', 'failed'] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
          uploaded: { $sum: { $cond: [{ $eq: ['$status', 'uploaded'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const counts = aggregate[0] || { total: 0, pending: 0, processing: 0, done: 0, failed: 0, assigned: 0, uploaded: 0 };

  return oasesSuccess(res, {
    sheets,
    total,
    page: Number(page),
    limit: Number(limit),
    counts,
  }, 'Sheets fetched.');
});

// ── GET /upload/all — cross-exam sheet list (admin) ──────────────
// Allows the admin dashboard to query submitted/status-filtered sheets
// across ALL exams for the school. Used by the Pending Review widget.
exports.listAllSheets = oasesAsync(async (req, res) => {
  const { status, examId, classId, subjectId, limit = 20, page = 1 } = req.query;

  const filter = { schoolId: req.schoolId };
  if (status) filter.status = status;
  if (examId) filter.examConfigId = examId;
  if (classId) filter.classId = classId;
  if (subjectId) filter.subjectId = subjectId;

  const skip = (Number(page) - 1) * Number(limit);

  const [sheets, total] = await Promise.all([
    AnswerSheet.find(filter)
      .select('-s3Keys -rollNo -rollNoEncrypted -pageImages')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AnswerSheet.countDocuments(filter),
  ]);

  return oasesSuccess(res, {
    sheets,
    total,
    page: Number(page),
    limit: Number(limit),
  }, 'All sheets fetched.');
});

// ── GET /upload/checked — admin "Checked Copies" view ────────────
// Returns sheets that have been evaluated/submitted/locked by teachers,
// populated with teacher info, exam name, class, subject, and marks.
exports.listCheckedSheets = oasesAsync(async (req, res) => {
  const { examId, classId, subjectId, limit = 50, page = 1 } = req.query;

  // "Checked" = sheets that have passed teacher evaluation
  const CHECKED_STATUSES = [
    'eval1_done', 'eval2_done', 'submitted', 'approved', 'locked',
  ];

  const filter = {
    schoolId: req.schoolId,
    status: { $in: CHECKED_STATUSES },
  };
  if (examId) filter.examConfigId = examId;
  if (classId) filter.classId = classId;
  if (subjectId) filter.subjectId = subjectId;

  const skip = (Number(page) - 1) * Number(limit);

  // Ensure these models are registered before populate runs
  require('../../models/ClassModel');
  require('../../models/SectionModel');
  require('../../models/SubjectMaster');

  const sheets = await AnswerSheet.find(filter)
    .select('-s3Keys -rollNo -rollNoEncrypted -pageImages')
    .populate({ path: 'eval1AssignedTo', select: 'firstName lastName email' })
    .populate({ path: 'classId', model: 'ClassModel', select: 'name' })
    .populate({ path: 'sectionId', model: 'SectionModel', select: 'name' })
    .populate({ path: 'subjectId', model: 'SubjectMaster', select: 'name code' })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await AnswerSheet.countDocuments(filter);

  // Attach the latest EvaluationMark (grandTotal / marks) to each sheet
  const EvaluationMark = require('../../models/oases/EvaluationMark');
  const Exam = require('../../models/Exam');

  const enriched = await Promise.all(sheets.map(async (sheet) => {
    // Latest submitted mark for this sheet
    const evalMark = await EvaluationMark.findOne(
      { sheetId: sheet._id, isDraft: false },
      null,
      { sort: { submittedAt: -1 } }
    ).select('grandTotal sectionTotals submittedAt evaluatorId remarks').lean();

    // Exam name
    let examName = sheet.examConfigId?.toString() || '—';
    try {
      const exam = await Exam.findById(sheet.examConfigId).select('name').lean();
      if (exam) examName = exam.name;
    } catch (_) { }

    return {
      ...sheet,
      examName,
      marks: evalMark?.grandTotal ?? null,
      sectionTotals: evalMark?.sectionTotals ?? {},
      submittedAt: evalMark?.submittedAt ?? null,
      remarks: evalMark?.remarks ?? '',
      teacherName: sheet.eval1AssignedTo
        ? `${sheet.eval1AssignedTo.firstName || ''} ${sheet.eval1AssignedTo.lastName || ''}`.trim()
        : '—',
    };
  }));

  return oasesSuccess(res, {
    sheets: enriched,
    total,
    page: Number(page),
    limit: Number(limit),
  }, 'Checked sheets fetched.');
});

// ── GET /upload/:sheetId/reprocess ──────────────────────────────
exports.reprocessSheet = oasesAsync(async (req, res) => {
  const sheet = await AnswerSheet.findOne({
    _id: req.params.sheetId,
    schoolId: req.schoolId,
  });
  if (!sheet) return oasesError(res, 'Sheet not found.', 404);
  if (sheet.processingStatus !== PROCESSING_STATUS.FAILED) {
    return oasesError(res, 'Only failed sheets can be reprocessed.', 400);
  }

  // Reset and re-queue
  sheet.processingStatus = PROCESSING_STATUS.PENDING;
  sheet.processingError = null;
  await sheet.save();

  const config = (await ExamConfig.findById(sheet.examConfigId).select('academicYear subjectCode').lean())
    || (await (require('../../models/Exam')).findById(sheet.examConfigId).select('academicYear subjectCode').lean())
    || {};
  await addPdfJob({
    sheetId: sheet._id.toString(),
    schoolId: req.schoolId.toString(),
    filePath: sheet.originalFilePath,
    subjectCode: config?.subjectCode || 'UNKNOWN',
    year: config?.academicYear || new Date().getFullYear().toString(),
  });

  auditService.log({
    schoolId: req.schoolId,
    entityType: 'AnswerSheet',
    entityId: sheet._id,
    actorId: req.userid,
    actorRole: req.user?.oasesRole,
    action: 'SHEET_REPROCESS_REQUESTED',
    ipAddress: req.ip,
  });

  return oasesSuccess(res, { sheetId: sheet._id }, 'Sheet queued for reprocessing.');
});

// ── GET /upload/:sheetId/page/:pageNo ───────────────────────────
// Returns a signed (time-limited) URL for a single sheet page.
// Auth guard: only assigned evaluator or AD/SA/HE can access.
exports.getPageUrl = oasesAsync(async (req, res) => {
  const { sheetId, pageNo } = req.params;
  const pageIdx = Number(pageNo) - 1;

  const sheet = await AnswerSheet.findOne({
    _id: sheetId,
    schoolId: req.schoolId,
  }).select('pageImages anonymousCode eval1AssignedTo eval2AssignedTo headAssignedTo processingStatus');

  if (!sheet) return oasesError(res, 'Sheet not found.', 404);
  if (sheet.processingStatus !== PROCESSING_STATUS.DONE) {
    return oasesError(res, 'Sheet images not yet ready.', 409);
  }

  // Role-based access check
  const role = req.user?.oasesRole;
  const uid = req.userid?.toString();
  const isAdmin = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'HEAD_EXAMINER'].includes(role);
  const isAssigned = [
    sheet.eval1AssignedTo?.toString(),
    sheet.eval2AssignedTo?.toString(),
    sheet.headAssignedTo?.toString(),
  ].includes(uid);

  if (!isAdmin && !isAssigned) {
    return oasesError(res, 'You are not assigned to this sheet.', 403);
  }

  const images = sheet.pageImages.length ? sheet.pageImages : sheet.s3Keys;
  if (pageIdx < 0 || pageIdx >= images.length) {
    return oasesError(res, `Page ${pageNo} does not exist. Total pages: ${images.length}`, 400);
  }

  const url = await getSignedPageUrl(images[pageIdx]);
  return oasesSuccess(res, { url, page: Number(pageNo), totalPages: images.length }, 'Page URL generated.');
});

// ── PATCH /upload/:sheetId/reject ────────────────────────────────
exports.rejectSheet = oasesAsync(async (req, res) => {
  const { reason } = req.body;
  const sheet = await AnswerSheet.findOneAndUpdate(
    { _id: req.params.sheetId, schoolId: req.schoolId },
    { status: SHEET_STATUS.REJECTED, isRejected: true, rejectionNote: reason || '' },
    { new: true }
  );
  if (!sheet) return oasesError(res, 'Sheet not found.', 404);

  emitToAll('oases:sheet:status', { sheetId: sheet._id, examConfigId: sheet.examConfigId, status: SHEET_STATUS.REJECTED });
  auditService.log({
    schoolId: req.schoolId,
    entityType: 'AnswerSheet',
    entityId: sheet._id,
    actorId: req.userid,
    actorRole: req.user?.oasesRole,
    action: 'SHEET_REJECTED',
    details: { reason },
    ipAddress: req.ip,
  });
  return oasesSuccess(res, null, 'Sheet rejected.');
});

// ── PATCH /upload/:sheetId/flag-ufm ─────────────────────────────
exports.flagUfm = oasesAsync(async (req, res) => {
  const { note } = req.body;
  const sheet = await AnswerSheet.findOneAndUpdate(
    { _id: req.params.sheetId, schoolId: req.schoolId },
    { status: SHEET_STATUS.UFM_FLAGGED, isUfmFlagged: true, ufmNote: note || '' },
    { new: true }
  );
  if (!sheet) return oasesError(res, 'Sheet not found.', 404);

  emitToAll('oases:sheet:status', { sheetId: sheet._id, examConfigId: sheet.examConfigId, status: SHEET_STATUS.UFM_FLAGGED });
  auditService.log({
    schoolId: req.schoolId,
    entityType: 'AnswerSheet',
    entityId: sheet._id,
    actorId: req.userid,
    actorRole: req.user?.oasesRole,
    action: 'SHEET_UFM_FLAGGED',
    details: { note },
    ipAddress: req.ip,
  });
  return oasesSuccess(res, null, 'Sheet flagged for UFM.');
});
