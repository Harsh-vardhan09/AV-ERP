// OASES Controller — ExamConfig
// Full CRUD + status change + soft delete
// All actions scoped to req.schoolId (multi-tenant).
const ExamConfig = require('../models/ExamConfig');
const { Exam } = require('../../examination');
const oasesAsync = require('../../../core/http/asyncHandler');
const { ok } = require('../../../core/http/ApiResponse');
const { apiError } = require('../lib/respond');
const auditService = require('../services/auditService');
const { examConfigStatusSchema } = require('../validators/examConfigValidator');

// Create
exports.createExamConfig = oasesAsync(async (req, res) => {
  return apiError(
    res,
    'Exams are managed from the Exams module. OASES exam creation is disabled.',
    400
  );
});

const mapExamForOases = (exam) => ({
  _id: exam._id,
  schoolId: exam.schoolId,
  examName: exam.name,
  name: exam.name,
  type: exam.type,
  session: exam.session,
  classIds: exam.classIds,
  startDate: exam.startDate,
  endDate: exam.endDate,
  status: exam.evaluationStatus,
  evaluationStatus: exam.evaluationStatus,
  evaluationLocked: exam.evaluationLocked,
  createdAt: exam.createdAt,
  updatedAt: exam.updatedAt,
});

const buildExamFilter = ({ schoolId, session, classId, status }) => {
  const filter = { schoolId };
  if (session) filter.session = session;
  if (classId) filter.classIds = classId;
  if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
    filter.evaluationStatus = status;
  }
  return filter;
};

const getFallbackSessionId = async (schoolId) => {
  const { AcademicSession } = require('../../academics');
  const active = await AcademicSession.findOne({ schoolId, isActive: true }).select('_id').lean();
  return active?._id || null;
};

const getFallbackClassIds = async (schoolId, sessionId) => {
  const { ClassModel } = require('../../academics');
  const filter = { schoolId };
  if (sessionId) filter.session = sessionId;
  const classes = await ClassModel.find(filter).select('_id').lean();
  return classes.map((c) => c._id);
};

// List
exports.listExamConfigs = oasesAsync(async (req, res) => {
  const { session, classId, status, page = 1, limit = 20 } = req.query;

  let effectiveSession = session || null;
  let classFilter = classId || null;
  if (!effectiveSession) {
    effectiveSession = await getFallbackSessionId(req.schoolId);
  }

  let examFilter = buildExamFilter({
    schoolId: req.schoolId,
    session: effectiveSession || undefined,
    classId: classFilter || undefined,
    status,
  });

  if (!classFilter) {
    const classIds = await getFallbackClassIds(req.schoolId, effectiveSession);
    if (classIds.length > 0) {
      examFilter.classIds = { $in: classIds };
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [configs, total] = await Promise.all([
    Exam.find(examFilter)
      .sort({ startDate: 1, createdAt: 1, name: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Exam.countDocuments(examFilter),
  ]);

  return ok(
    res,
    {
      configs: configs.map(mapExamForOases),
      total,
      page: Number(page),
      limit: Number(limit),
    },
    'Exams retrieved'
  );
});

// Single get
exports.getExamConfig = oasesAsync(async (req, res) => {
  const exam = await Exam.findOne({
    _id: req.params.id,
    schoolId: req.schoolId,
  }).lean();
  if (exam) return ok(res, mapExamForOases(exam), 'Exam retrieved');

  const config = await ExamConfig.findOne({
    _id: req.params.id,
    schoolId: req.schoolId,
  });
  if (!config) return apiError(res, 'Exam config not found', 404);
  return ok(res, config, 'Exam config retrieved');
});

// Update (block if not in draft)
exports.updateExamConfig = oasesAsync(async (req, res) => {
  return apiError(
    res,
    'Exams are managed from the Exams module. OASES exam update is disabled.',
    400
  );
});

// Change status
exports.changeStatus = oasesAsync(async (req, res) => {
  const parsed = examConfigStatusSchema.safeParse(req.body);
  if (!parsed.success) return apiError(res, 'Validation failed', 400, parsed.error.errors);

  const config = await ExamConfig.findOne({
    _id: req.params.id,
    schoolId: req.schoolId,
  });
  if (!config) return apiError(res, 'Exam config not found', 404);

  const { status } = parsed.data;

  // Valid transitions
  const allowed = {
    draft: ['active'],
    active: ['evaluation', 'closed'],
    evaluation: ['closed'],
    closed: [],
    archived: [],
  };

  if (!allowed[config.status]?.includes(status)) {
    return apiError(res, `Cannot transition from '${config.status}' to '${status}'`, 400);
  }

  const prevStatus = config.status;
  config.status = status;
  await config.save();

  auditService.log({
    schoolId: req.schoolId,
    entityType: 'OasesExamConfig',
    entityId: config._id,
    actorId: req.userid,
    actorRole: req.user?.oasesRole || req.user?.role,
    action: 'exam_config_status_changed',
    details: { from: prevStatus, to: status },
    ipAddress: req.ip,
  });

  return ok(res, config, `Status updated to '${status}'`);
});

// Soft delete (archive)
exports.deleteExamConfig = oasesAsync(async (req, res) => {
  return apiError(
    res,
    'Exams are managed from the Exams module. OASES exam delete is disabled.',
    400
  );
});
