// OASES Controller — Assignment
// Adds: assignSingleSheet, bulkAssign (round-robin / random)
// Retains: assignSheets (bulk by sheetIds), listAssignments, getUnassignedSheets
const AnswerSheet          = require('../models/AnswerSheet');
const EvaluatorAssignment  = require('../models/EvaluatorAssignment');
const ExamConfig           = require('../models/ExamConfig');
const Exam                 = require('../../../../src-old/models/Exam');
const OasesNotification    = require('../models/Notification');
const { User }             = require('../../identity'); // exports.User pattern
const oasesAsync           = require('../../../core/http/asyncHandler');
const { ok, created } = require('../../../core/http/ApiResponse');
const { apiError } = require('../lib/respond');
const auditService         = require('../services/auditService');
const { emitToAll }        = require('../../../../src-old/socket');
const {
  SHEET_STATUS,
  PROCESSING_STATUS,
  EVAL_ROUNDS,
  NOTIFICATION_TYPES,
  OASES_ROLES,
} = require('../lib/constants');

// Helper: upsert EvaluatorAssignment + update AnswerSheet
const doAssign = async ({ schoolId, examConfigId, evaluatorId, sheetIds, round, assignedBy, deadlineDate, config }) => {
  const evalField = round === EVAL_ROUNDS.ROUND_2 ? 'eval2AssignedTo' : 'eval1AssignedTo';

  await AnswerSheet.updateMany(
    { _id: { $in: sheetIds }, schoolId },
    { [evalField]: evaluatorId, status: SHEET_STATUS.ASSIGNED }
  );

  const assignment = await EvaluatorAssignment.findOneAndUpdate(
    { examConfigId, evaluatorId, round, schoolId },
    {
      $addToSet:  { sheetIds: { $each: sheetIds } },
      $inc:       { totalAssigned: sheetIds.length },
      assignedBy,
      dailyLimit:   config?.dailyEvalLimit || 20,
      deadlineDate: deadlineDate || null,
    },
    { upsert: true, new: true }
  );

  // Notify evaluator
  OasesNotification.create({
    schoolId,
    recipientId: evaluatorId,
    type:        NOTIFICATION_TYPES.ASSIGNMENT,
    title:       'New Answer Sheets Assigned',
    message:     `${sheetIds.length} sheet(s) assigned for Round ${round} evaluation.`,
    entityType:  'EvaluatorAssignment',
    entityId:    assignment._id,
  }).catch(() => {});

  // Emit to evaluator's room + admin
  emitToAll('oases:assignment:new', { evaluatorId, examConfigId, count: sheetIds.length, round });

  return assignment;
};

// POST /assignment/sheet/:sheetId ─── single sheet assign
exports.assignSingleSheet = oasesAsync(async (req, res) => {
  const { sheetId }    = req.params;
  const { evaluatorId, round = 1, deadlineDate } = req.body;

  if (!evaluatorId) return apiError(res, 'evaluatorId is required.', 400);

  const sheet = await AnswerSheet.findOne({ _id: sheetId, schoolId: req.schoolId });
  if (!sheet) return apiError(res, 'Sheet not found.', 404);
  if (sheet.processingStatus !== PROCESSING_STATUS.DONE) {
    return apiError(res, 'Sheet must be fully processed before assignment.', 400);
  }

  // Verify evaluator same school with correct role
  const evaluator = await User.findOne({
    _id:      evaluatorId,
    schoolId: req.schoolId,
    isActive:  true,
    $or: [
      { oasesRole: OASES_ROLES.EVALUATOR },
      { role: 'teacher' }, // ERP teachers auto-mapped to EVALUATOR
    ],
  }).select('_id firstName lastName email');
  if (!evaluator) return apiError(res, 'Evaluator not found in this school or does not have EVALUATOR role.', 404);

  // Config is optional: used only to read dailyEvalLimit
  const config = (await ExamConfig.findById(sheet.examConfigId).select('dailyEvalLimit subjectCode').lean())
    || (await Exam.findById(sheet.examConfigId).select('dailyEvalLimit').lean())
    || {};

  const assignment = await doAssign({
    schoolId:    req.schoolId,
    examConfigId: sheet.examConfigId,
    evaluatorId,
    sheetIds:    [sheetId],
    round,
    assignedBy:  req.userid,
    deadlineDate,
    config,
  });

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'EvaluatorAssignment',
    entityId:   assignment._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'SHEET_ASSIGNED_SINGLE',
    details:    { evaluatorId, sheetId, round },
    ipAddress:  req.ip,
  });

  return created(res, assignment, 'Sheet assigned successfully.');
});

// POST /assignment/bulk/:examId ─── round-robin / random
exports.bulkAssign = oasesAsync(async (req, res) => {
  const { examId }       = req.params;
  const { evaluatorIds, strategy = 'round-robin', round = 1, deadlineDate } = req.body;

  if (!evaluatorIds || evaluatorIds.length === 0) {
    return apiError(res, 'evaluatorIds array is required.', 400);
  }

  const config = (await ExamConfig.findOne({ _id: examId, schoolId: req.schoolId }).lean())
    || (await Exam.findOne({ _id: examId, schoolId: req.schoolId }).lean());
  if (!config) return apiError(res, 'Exam config not found.', 404);

  // Verify all evaluators belong to school with EVALUATOR role
  const validEvaluators = await User.find({
    _id:       { $in: evaluatorIds },
    schoolId:  req.schoolId,
    isActive:  true,
    $or: [
      { oasesRole: OASES_ROLES.EVALUATOR },
      { role: 'teacher' }, // ERP teachers auto-mapped to EVALUATOR
    ],
  }).select('_id').lean();
  if (validEvaluators.length === 0) return apiError(res, 'No valid evaluators found.', 404);

  const validIds = validEvaluators.map((e) => e._id);

  // Get unassigned sheets (any status except rejected/ufm — don't block on processingStatus
  // since Bull queue may not be running in all environments)
  const evalField = round === EVAL_ROUNDS.ROUND_2 ? 'eval2AssignedTo' : 'eval1AssignedTo';
  const unassigned = await AnswerSheet.find({
    schoolId:     req.schoolId,
    examConfigId: examId,
    [evalField]:  null,
    status:       { $nin: [SHEET_STATUS.REJECTED, SHEET_STATUS.UFM_FLAGGED] },
  }).select('_id').lean();

  if (unassigned.length === 0) {
    return ok(res, { assigned: 0, skipped: 0 }, 'No unassigned ready sheets found.');
  }

  let sheetList = unassigned.map((s) => s._id.toString());

  // Shuffle for random strategy
  if (strategy === 'random') {
    for (let i = sheetList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sheetList[i], sheetList[j]] = [sheetList[j], sheetList[i]];
    }
  }

  // Distribute using round-robin across validIds
  const buckets = validIds.map(() => []);
  sheetList.forEach((sid, idx) => {
    buckets[idx % validIds.length].push(sid);
  });

  let totalAssigned = 0;
  for (let i = 0; i < validIds.length; i++) {
    if (buckets[i].length === 0) continue;
    await doAssign({
      schoolId:    req.schoolId,
      examConfigId: examId,
      evaluatorId: validIds[i],
      sheetIds:    buckets[i],
      round,
      assignedBy:  req.userid,
      deadlineDate,
      config,
    });
    totalAssigned += buckets[i].length;
  }

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'OasesExamConfig',
    entityId:   examId,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'SHEETS_BULK_ASSIGNED',
    details:    { strategy, round, totalAssigned, evaluatorCount: validIds.length },
    ipAddress:  req.ip,
  });

  return ok(res, {
    assigned:       totalAssigned,
    skipped:        unassigned.length - totalAssigned,
    evaluatorCount: validIds.length,
    strategy,
  }, `${totalAssigned} sheet(s) assigned via ${strategy}.`);
});

// POST /assignment/assign ── existing bulk by sheetIds
exports.assignSheets = oasesAsync(async (req, res) => {
  const { examConfigId, evaluatorId, sheetIds, round, deadlineDate } = req.body;
  if (!sheetIds || sheetIds.length === 0) return apiError(res, 'sheetIds cannot be empty.', 400);

  const config = (await ExamConfig.findOne({ _id: examConfigId, schoolId: req.schoolId }).lean())
    || (await Exam.findOne({ _id: examConfigId, schoolId: req.schoolId }).lean());
  if (!config) return apiError(res, 'Exam config not found.', 404);

  const assignment = await doAssign({
    schoolId:    req.schoolId,
    examConfigId,
    evaluatorId,
    sheetIds,
    round:       round || EVAL_ROUNDS.ROUND_1,
    assignedBy:  req.userid,
    deadlineDate,
    config,
  });

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'EvaluatorAssignment',
    entityId:   assignment._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'SHEETS_ASSIGNED',
    details:    { evaluatorId, sheetIds, round, count: sheetIds.length },
    ipAddress:  req.ip,
  });

  return created(res, assignment, `${sheetIds.length} sheet(s) assigned.`);
});

// GET /assignment ──── list assignments
exports.listAssignments = oasesAsync(async (req, res) => {
  const { examConfigId, evaluatorId, round } = req.query;
  const filter = { schoolId: req.schoolId };
  if (examConfigId) filter.examConfigId = examConfigId;
  if (evaluatorId)  filter.evaluatorId  = evaluatorId;
  if (round)        filter.round        = Number(round);

  const assignments = await EvaluatorAssignment.find(filter)
    .populate('evaluatorId', 'firstName lastName email')
    .populate('examConfigId', 'examName subjectCode totalMarks')
    .sort({ assignedAt: -1 });

  return ok(res, assignments, 'Assignments fetched.');
});

// GET /assignment/unassigned/:examConfigId
// Phase 5 fix: Show ALL non-rejected sheets regardless of processingStatus.
// Sheets still queued/processing also appear in Step 3 — with status indicator.
exports.getUnassignedSheets = oasesAsync(async (req, res) => {
  const sheets = await AnswerSheet.find({
    schoolId:        req.schoolId,
    examConfigId:    req.params.examConfigId,
    eval1AssignedTo: null,
    status:          { $nin: [SHEET_STATUS.REJECTED, SHEET_STATUS.UFM_FLAGGED] },
  }).select('anonymousCode set processingStatus status createdAt totalPages').lean();

  return ok(res, { sheets, total: sheets.length }, 'Unassigned sheets fetched.');
});

// GET /assignment/evaluators ── list school teachers/evaluators
exports.getEvaluators = oasesAsync(async (req, res) => {
  const evaluators = await User.find({
    schoolId: req.schoolId,
    isActive:  true,
    $or: [
      { oasesRole: OASES_ROLES.EVALUATOR },
      { role: 'teacher' },
    ],
  }).select('_id firstName lastName email role oasesRole').lean();

  return ok(res, evaluators, 'Evaluators fetched.');
});

// POST /assignment/auto/:examId ── smart auto-assign via subject teacher
// Looks up TeacherSubjectAssignment for the exam's class+section+subject,
// then bulk-assigns ALL unassigned sheets to that teacher in one click.
exports.autoAssign = oasesAsync(async (req, res) => {
  const { examId } = req.params;

  // Lazy-require ERP models
  const Exam                        = require('../../../../src-old/models/Exam');
  const SubjectMaster               = require('../../../../src-old/models/SubjectMaster');
  const ClassModel                  = require('../../../../src-old/models/ClassModel');
  const SectionModel                = require('../../../../src-old/models/SectionModel');
  const TeacherSubjectAssignment    = require('../../../../src-old/models/TeacherSubjectAssignment');
  const ClassTeacherAssignment      = require('../../../../src-old/models/ClassTeacherAssignment');

  // 1. Load exam
  let examSource = await Exam.findOne({ _id: examId, schoolId: req.schoolId }).lean();
  let legacyConfig = null;
  if (!examSource) {
    legacyConfig = await ExamConfig.findOne({ _id: examId, schoolId: req.schoolId }).lean();
    examSource = legacyConfig;
  }
  if (!examSource) return apiError(res, 'Exam config not found.', 404);

  // 2. Get all unassigned sheets
  const unassigned = await AnswerSheet.find({
    schoolId:        req.schoolId,
    examConfigId:    examId,
    eval1AssignedTo: null,
    status:          { $nin: [SHEET_STATUS.REJECTED, SHEET_STATUS.UFM_FLAGGED] },
  }).select('_id classId sectionId subjectId').lean();

  if (unassigned.length === 0) {
    return ok(res, { assigned: 0 }, 'All sheets are already assigned — nothing to do.');
  }

  // 3. Determine teacher from first sheet’s routing metadata
  // Strategy A: use classId/sectionId/subjectId stored on the sheet
  // Strategy B: fall back to classLevel string parsing (legacy)
  let teacherId = null;
  const sampleSheet = unassigned[0];

  if (sampleSheet.classId && sampleSheet.subjectId) {
    // Strategy A — preferred: routing metadata available
    const tsa = await TeacherSubjectAssignment.findOne({
      schoolId:  req.schoolId,
      subjectId: sampleSheet.subjectId,
      classId:   sampleSheet.classId,
      ...(sampleSheet.sectionId ? { sectionId: sampleSheet.sectionId } : {}),
    }).lean();
    if (tsa) teacherId = tsa.teacherId;

    // Fallback to class teacher if no subject teacher found
    if (!teacherId && sampleSheet.sectionId) {
      const cta = await ClassTeacherAssignment.findOne({
        schoolId:  req.schoolId,
        classId:   sampleSheet.classId,
        sectionId: sampleSheet.sectionId,
      }).lean();
      if (cta) teacherId = cta.teacherId;
    }
  } else {
    // Strategy B — legacy: parse classLevel string from OasesExamConfig
    const classLevel  = examSource.classLevel || '';
    const subjectCode = examSource.subjectCode || '';

    const subject = await SubjectMaster.findOne({ code: subjectCode, schoolId: req.schoolId }).lean();
    const allClasses  = await ClassModel.find({ schoolId: req.schoolId }).select('_id name').lean();
    const allSections = await SectionModel.find({ schoolId: req.schoolId }).select('_id name classId').lean();

    let matchedClassId   = null;
    let matchedSectionId = null;

    for (const cls of allClasses) {
      if (!classLevel.startsWith(cls.name)) continue;
      const secNamePart = classLevel.slice(cls.name.length);
      if (!secNamePart) { matchedClassId = cls._id; break; }
      const matchedSec = allSections.find(
        (s) => s.classId?.toString() === cls._id.toString() && s.name === secNamePart
      );
      if (matchedSec) { matchedClassId = cls._id; matchedSectionId = matchedSec._id; break; }
    }

    if (!matchedClassId) {
      return apiError(res, `Could not resolve class "${classLevel}" in this school. Ensure the class name in OASES matches School Settings.`, 404);
    }

    if (subject) {
      const tsa = await TeacherSubjectAssignment.findOne({
        schoolId:  req.schoolId,
        subjectId: subject._id,
        classId:   matchedClassId,
        ...(matchedSectionId ? { sectionId: matchedSectionId } : {}),
      }).lean();
      if (tsa) teacherId = tsa.teacherId;
    }

    if (!teacherId && matchedSectionId) {
      const cta = await ClassTeacherAssignment.findOne({
        schoolId:  req.schoolId,
        classId:   matchedClassId,
        sectionId: matchedSectionId,
      }).lean();
      if (cta) teacherId = cta.teacherId;
    }
  }

  if (!teacherId) {
    return apiError(res, 'No subject teacher found for this exam. Please assign a teacher in School Settings → Teacher Assignment, then retry.', 404);
  }

  // 4. Verify teacher account
  const teacher = await User.findOne({
    _id: teacherId, schoolId: req.schoolId, isActive: true,
  }).select('_id firstName lastName email').lean();

  if (!teacher) {
    return apiError(res, 'Subject teacher account not found or inactive.', 404);
  }

  // 5. Assign all sheets to teacher
  const sheetIds = unassigned.map((s) => s._id.toString());

  const assignment = await doAssign({
    schoolId:     req.schoolId,
    examConfigId: examId,
    evaluatorId:  teacher._id,
    sheetIds,
    round:        EVAL_ROUNDS.ROUND_1,
    assignedBy:   req.userid,
    config:       examSource,
  });

  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'EvaluatorAssignment',
    entityId:   assignment._id,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'SHEETS_AUTO_ASSIGNED',
    details:    {
      classId:   sampleSheet?.classId,
      sectionId: sampleSheet?.sectionId,
      subjectId: sampleSheet?.subjectId,
      teacherId: teacher._id,
      count:     sheetIds.length,
    },
    ipAddress:  req.ip,
  });

  return ok(res, {
    assigned:    sheetIds.length,
    teacherId:   teacher._id,
    teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
    teacherEmail: teacher.email,
  }, `${sheetIds.length} sheet(s) auto-assigned to ${teacher.firstName} ${teacher.lastName}.`);
});

