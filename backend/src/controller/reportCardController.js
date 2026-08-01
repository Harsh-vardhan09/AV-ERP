const AcademicSession = require('../models/AcademicSession');
const ClassModel = require('../models/ClassModel');
const ClassSubjectMap = require('../models/ClassSubjectMap');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const CoScholasticMark = require('../models/CoScholasticMark');
const Exam = require('../models/Exam');
const ExamSubjectConfig = require('../models/ExamSubjectConfig');
const Marks = require('../models/MarksModel');
const ReportCard = require('../models/ReportCard');
const ReportCardMark = require('../models/ReportCardMark');
const StudentProfile = require('../models/StudentProfile');
const SchoolSettings = require('../models/SchoolSettings');
const {
  SLOT_MAX,
  CO_SCHOLASTIC_MAX,
  sanitizeScholasticRows,
  sanitizeCoScholasticRows,
  sanitizeDynamicMarks,
} = require('../utils/marksValidation');
const { canGenerateReport } = require('../utils/reportCardValidation');
const { getExamReadiness } = require('../services/marksReadinessService');
const logger = require('../utils/logger');

// ── Phase 2: Notification imports ────────────────────────────────────────────
const { createInAppNotification, sendEmailNotification } = require('../services/notificationService');

const SLOT_FIELDS = [
  'fa1_1',
  'fa1_2',
  'fa2_1',
  'fa2_2',
  'sa1',
  'fa3_1',
  'fa3_2',
  'fa4_1',
  'fa4_2',
  'sa2',
];

const FA_SLOT_ORDER = [
  'fa1_1',
  'fa1_2',
  'fa2_1',
  'fa2_2',
  'fa3_1',
  'fa3_2',
  'fa4_1',
  'fa4_2',
];

const DEFAULT_CO_SCHOLASTIC_SKILLS = [
  'Punctuality / Regularity',
  'Personal Cleanliness',
  'Discipline / Confidence',
  'Enjoy All Activities',
  'Completes work in time',
  'Maintain Book / Copies',
  'Concentration',
  'Vocabulary / Pronunciation',
];

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Number(parsed.toFixed(2)));
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const calculateGrade = (score) => {
  const safeScore = Number(score);
  if (!Number.isFinite(safeScore)) return 'E';

  if (safeScore >= 91) return 'A+';
  if (safeScore >= 81) return 'A';
  if (safeScore >= 71) return 'B+';
  if (safeScore >= 61) return 'B';
  if (safeScore >= 51) return 'C';
  if (safeScore >= 41) return 'D';
  return 'E';
};

const calculateSubjectTotal = (row) => {
  const total = SLOT_FIELDS.reduce((sum, key) => {
    const value = toNumberOrNull(row[key]);
    return sum + (value || 0);
  }, 0);

  const normalized = Math.min(100, Number(total.toFixed(2)));
  return {
    total: normalized,
    grade: calculateGrade(normalized),
  };
};

const normalizeExamName = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const isHalfYearlyExam = (exam) => {
  const normalized = normalizeExamName(exam?.name);
  return (
    exam?.type === 'half_yearly' ||
    normalized.includes('halfyear') ||
    normalized.includes('halfterm') ||
    normalized.includes('sai') ||
    normalized.includes('term1')
  );
};

const isAnnualExam = (exam) => {
  const normalized = normalizeExamName(exam?.name);
  return (
    exam?.type === 'annual' ||
    normalized.includes('annual') ||
    normalized.includes('final') ||
    normalized.includes('saii') ||
    normalized.includes('term2')
  );
};

const buildExamSlotMap = (exams = []) => {
  const sorted = [...exams].sort((a, b) => {
    const aTime = a?.startDate ? new Date(a.startDate).getTime() : 0;
    const bTime = b?.startDate ? new Date(b.startDate).getTime() : 0;

    if (aTime !== bTime) return aTime - bTime;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });

  const map = {};
  const usedSlots = new Set();
  let nextFaIndex = 0;

  sorted.forEach((exam) => {
    let slot = null;

    if (isHalfYearlyExam(exam) && !usedSlots.has('sa1')) {
      slot = 'sa1';
    } else if (isAnnualExam(exam) && !usedSlots.has('sa2')) {
      slot = 'sa2';
    } else if (nextFaIndex < FA_SLOT_ORDER.length) {
      slot = FA_SLOT_ORDER[nextFaIndex];
      nextFaIndex += 1;
    } else if (!usedSlots.has('sa1')) {
      slot = 'sa1';
    } else if (!usedSlots.has('sa2')) {
      slot = 'sa2';
    } else {
      slot = FA_SLOT_ORDER[FA_SLOT_ORDER.length - 1];
    }

    map[exam._id.toString()] = slot;
    usedSlots.add(slot);
  });

  return map;
};

const buildSlotExamDetails = (exams = [], slotMap = {}) => {
  const details = {};

  exams.forEach((exam) => {
    const slot = slotMap[exam._id.toString()];
    if (!slot || details[slot]) return;

    details[slot] = {
      examId: exam._id,
      name: exam.name,
      startDate: exam.startDate,
      type: exam.type,
    };
  });

  return details;
};

// ── Fetch exams for a class with per-exam maxMarks ───────────────────────────
// Sort priority: startDate ASC → createdAt ASC → name ASC
//   • startDate  : primary  — chronological order of the exam period
//   • createdAt  : fallback — when two exams share the same date (or date is missing)
//   • name       : final    — alphabetical determinism, eliminates any remaining randomness
// Exams with a null/missing startDate sort before those with a date (MongoDB ascending
// behaviour for nulls). This is acceptable; admins should always set startDate.
const fetchClassExams = async (classId, sessionId, schoolId) => {
  const exams = await Exam.find({
    classIds: classId,
    session: sessionId,
    schoolId,
  })
    .select('name type startDate createdAt evaluationStatus evaluationLocked')
    .sort({ startDate: 1, createdAt: 1, name: 1 });

  if (!exams.length) return [];

  const examIds = exams.map((e) => e._id);
  const configs = await ExamSubjectConfig.find({
    examId: { $in: examIds },
    classId,
    schoolId,
  }).select('examId maxMarks');

  const examMaxMap = {};
  configs.forEach((c) => {
    const eid = c.examId.toString();
    if (examMaxMap[eid] === undefined) examMaxMap[eid] = c.maxMarks;
  });

  return exams.map((e) => ({
    _id: e._id,
    name: e.name,
    type: e.type,
    maxMarks: examMaxMap[e._id.toString()] ?? 100,
    startDate: e.startDate,
    createdAt: e.createdAt,
    evaluationStatus: e.evaluationStatus || 'pending',
    evaluationLocked: Boolean(e.evaluationLocked),
  }));
};
// ── Compute dynamic total & grade for one subject row ────────────────────────
const calculateDynamicSubjectTotal = (dynamicMarks = {}, exams = []) => {
  let obtained = 0;
  let achievedMax = 0;
  const dm = dynamicMarks instanceof Map ? Object.fromEntries(dynamicMarks) : (dynamicMarks || {});
  exams.forEach((exam) => {
    const val = toNumberOrNull(dm[exam._id.toString()]);
    if (val !== null) {
      obtained += val;
      achievedMax += exam.maxMarks;
    }
  });
  const pct = achievedMax > 0 ? Number(((obtained / achievedMax) * 100).toFixed(2)) : 0;
  return {
    dynamicTotal: Number(obtained.toFixed(2)),
    dynamicGrade: achievedMax > 0 ? calculateGrade(pct) : '',
  };
};

const resolveSessionId = async (providedSessionId, schoolId) => {
  if (providedSessionId) {
    return providedSessionId;
  }

  const activeSession = await AcademicSession.findOne({ isActive: true, schoolId }).select('_id');
  return activeSession?._id || null;
};

const ensureTeacherCanAccessStudent = async (teacherId, studentProfile, sessionId, schoolId) => {
  const assignment = await ClassTeacherAssignment.findOne({
    teacherId,
    classId: studentProfile?.classId?._id ?? studentProfile?.classId,
    sectionId: studentProfile?.sectionId?._id ?? studentProfile?.sectionId,
    session: sessionId || (studentProfile?.session?._id ?? studentProfile?.session),
    schoolId,
  }).select('_id');

  return Boolean(assignment);
};

const ensureTeacherClassAccess = async (teacherId, classId, sessionId, schoolId, sectionId = null) => {
  const filter = {
    teacherId,
    classId,
    session: sessionId,
    schoolId,
  };

  if (sectionId) {
    filter.sectionId = sectionId;
  }

  const assignments = await ClassTeacherAssignment.find(filter).select('sectionId');
  return assignments;
};

const ensureCoScholasticRows = async (reportCardId, schoolId) => {
  const existing = await CoScholasticMark.find({ reportCardId, schoolId });
  const existingKeys = new Set(existing.map((item) => item.skillName));

  const toCreate = DEFAULT_CO_SCHOLASTIC_SKILLS
    .filter((skillName) => !existingKeys.has(skillName))
    .map((skillName) => ({ reportCardId, skillName, schoolId }));

  if (toCreate.length > 0) {
    await CoScholasticMark.insertMany(toCreate, { ordered: false });
  }
};

const seedSubjectRows = async (reportCardId, studentProfile, sessionId, schoolId, marksDocs = []) => {
  const mappings = await ClassSubjectMap.find({
    classId: studentProfile?.classId?._id ?? studentProfile?.classId,
    session: sessionId,
    schoolId,
  })
    .populate('subjectId', 'name')
    .sort({ createdAt: 1 });

  const subjectsFromMap = mappings
    .filter((item) => item.subjectId)
    .map((item) => ({
      subjectId: item.subjectId._id,
      subject: item.subjectId.name,
    }));

  const subjectSeeds = [...subjectsFromMap];

  if (subjectSeeds.length === 0) {
    const seen = new Set();

    marksDocs.forEach((mark) => {
      const subjectId = mark.subjectId?._id?.toString();
      const subject = mark.subjectId?.name;
      if (!subjectId || !subject || seen.has(subjectId)) return;
      seen.add(subjectId);
      subjectSeeds.push({ subjectId: mark.subjectId._id, subject });
    });
  }

  const existingRows = await ReportCardMark.find({ reportCardId, schoolId });
  const existingBySubjectId = new Set(
    existingRows
      .filter((row) => row.subjectId)
      .map((row) => row.subjectId.toString())
  );

  const existingBySubjectName = new Set(existingRows.map((row) => normalizeText(row.subject).toLowerCase()));

  // ── Auto-cleanup: remove ReportCardMark rows for deleted / unmapped subjects ──
  // Always runs. When subjectsFromMap is empty (all subjects deleted/unmapped),
  // activeMappedSubjectIds is an empty Set → every existing row with a subjectId
  // is stale and gets removed. This is the correct behaviour.
  const activeMappedSubjectIds = new Set(subjectsFromMap.map((s) => s.subjectId.toString()));
  const staleIds = existingRows
    .filter((row) => row.subjectId && !activeMappedSubjectIds.has(row.subjectId.toString()))
    .map((row) => row._id);
  if (staleIds.length > 0) {
    await ReportCardMark.deleteMany({ _id: { $in: staleIds }, schoolId });
    // Update the in-memory sets so rowsToCreate logic stays consistent
    staleIds.forEach((staleId) => {
      const staleRow = existingRows.find((r) => String(r._id) === String(staleId));
      if (staleRow?.subjectId) existingBySubjectId.delete(staleRow.subjectId.toString());
      if (staleRow?.subject) existingBySubjectName.delete(normalizeText(staleRow.subject).toLowerCase());
    });
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const rowsToCreate = [];
  subjectSeeds.forEach((seed) => {
    const sid = seed.subjectId?.toString();
    const subjectName = normalizeText(seed.subject);

    if (!subjectName) return;

    if ((sid && existingBySubjectId.has(sid)) || existingBySubjectName.has(subjectName.toLowerCase())) {
      return;
    }

    rowsToCreate.push({
      reportCardId,
      subject: subjectName,
      subjectId: seed.subjectId,
      schoolId,
    });
  });

  if (rowsToCreate.length > 0) {
    await ReportCardMark.insertMany(rowsToCreate, { ordered: false });
  }
};

const syncMarksFromSource = async (reportCard, studentProfile, sessionId, schoolId, debug = false) => {
  // Finalized report cards are immutable — never write marks/co-scholastic from source.
  if (reportCard.isFinalized) {
    const [marksRows, coScholasticRows] = await Promise.all([
      ReportCardMark.find({ reportCardId: reportCard._id, schoolId }).sort({ createdAt: 1, subject: 1 }),
      CoScholasticMark.find({ reportCardId: reportCard._id, schoolId }).sort({ createdAt: 1, skillName: 1 }),
    ]);
    return { marksRows, coScholasticRows, slotExamDetails: {} };
  }

  // Be tolerant to historical data saved with string IDs (bulkWrite can bypass casting).
  // IMPORTANT: studentProfile.userId/classId are populated docs here, so we must use their _id.
  const studentUserId = studentProfile?.userId?._id ?? studentProfile?.userId;
  const classId = studentProfile?.classId?._id ?? studentProfile?.classId;
  const session = sessionId;
  const schoolIdStr = schoolId ? String(schoolId) : null;

  const studentUserIdStr = studentUserId ? String(studentUserId) : null;
  const classIdStr = classId ? String(classId) : null;

  const marksDocs = await Marks.find({
    studentId: { $in: [studentUserId, ...(studentUserIdStr ? [studentUserIdStr] : [])] },
    classId: { $in: [classId, ...(classIdStr ? [classIdStr] : [])] },
    session: { $in: [session, ...(session ? [String(session)] : [])] },
    // Some historical uploads may not have schoolId saved, or saved as string/null.
    $or: [
      { schoolId },
      ...(schoolIdStr ? [{ schoolId: schoolIdStr }] : []),
      { schoolId: { $exists: false } },
      { schoolId: null },
    ],
  })
    .populate('examId', 'name type startDate')
    .populate('subjectId', 'name');

  const examIds = [...new Set(marksDocs.map((m) => m.examId?._id?.toString()).filter(Boolean))];
  const allowedConfigs = examIds.length
    ? await ExamSubjectConfig.find({
      examId: { $in: examIds },
      classId,
      schoolId,
    }).select('examId subjectId').lean()
    : [];
  const allowedPairs = new Set(
    allowedConfigs.map((cfg) => `${String(cfg.examId)}:${String(cfg.subjectId)}`)
  );
  const consistentMarksDocs = marksDocs.filter((m) => {
    const examKey = m.examId?._id ? String(m.examId._id) : null;
    const subjectKey = m.subjectId?._id ? String(m.subjectId._id) : null;
    if (!examKey || !subjectKey) return false;
    return allowedPairs.has(`${examKey}:${subjectKey}`);
  });

  const subjectsFromMarks = [...new Set(consistentMarksDocs.map((m) => m.subjectId?._id?.toString()).filter(Boolean))];

  if (debug) {
    // Debug logging: trace what the report card sync is using.
    const marks = consistentMarksDocs.slice(0, 20).map((m) => ({
      studentId: String(m.studentId || ''),
      examId: String(m.examId?._id || ''),
      examName: m.examId?.name || '(not populated)',
      subjectId: String(m.subjectId?._id || ''),
      subjectName: m.subjectId?.name || '(not populated)',
      marksObtained: m.marksObtained,
      schoolId: m.schoolId ? String(m.schoolId) : null,
    }));
    console.log('[ReportCardDebug] Student marks count from source:', consistentMarksDocs.length);
    console.log('[ReportCardDebug] Marks from source:', JSON.stringify(marks, null, 2));
    console.log('[ReportCardDebug] Unique subjects with marks:', subjectsFromMarks);
  }

  await seedSubjectRows(reportCard._id, studentProfile, sessionId, schoolId, consistentMarksDocs);

  // Track sync time (for debugging + freshness checks)
  reportCard.lastSyncedAt = new Date();
  await reportCard.save().catch(() => {});

  // ── Fetch ALL class exams (not just exams the student has marks for) ─────────
  // CRITICAL: always fetch from the class definition, not from student marks, so that
  // newly created exams (e.g. Half-Yearly) always appear in the report card columns.
  const classExams = await fetchClassExams(
    studentProfile?.classId?._id ?? studentProfile?.classId,
    sessionId,
    schoolId
  );

  if (debug) {
    console.log(
      '[ReportCardDebug] ClassExams (ALL exams for this class):',
      classExams.map((e) => ({ _id: String(e._id), name: e.name, type: e.type, maxMarks: e.maxMarks }))
    );
    console.log(
      '[ReportCardDebug] Marks examIds from source:',
      consistentMarksDocs.map((m) => ({ examId: String(m.examId?._id || ''), subject: m.subjectId?.name || '' }))
    );
  }

  const validExams = classExams; // Return all exams — filtering happens at frontend based on OASES toggle
  // When OASES is OFF, all exams are returned for marks entry
  // When OASES is ON, frontend will filter to completed ones only

  // Build slot map from completed exams only (for backward compat with legacy FA/SA slots).
  const completedExams = classExams.filter((exam) => exam.evaluationStatus === 'completed');
  const examSlotMap = buildExamSlotMap(completedExams);
  const slotExamDetails = buildSlotExamDetails(completedExams, examSlotMap);

  // Legacy FA/SA slot syncing is deprecated.
  // We keep the fields in the schema for backward compatibility, but do not sync them from Marks anymore.

  await ensureCoScholasticRows(reportCard._id, schoolId);

  // ── Dynamic marks sync ───────────────────────────────────────────────────────
  // Build a subject → { examId: marksObtained } map from ALL marks docs for this student.
  const dynBySubject = {};
  consistentMarksDocs.forEach((mark) => {
    const subjectId = mark.subjectId?._id?.toString();
    const examId = mark.examId?._id?.toString();
    const val = toNumberOrNull(mark.marksObtained);
    if (!subjectId || !examId || val === null) return;
    if (!dynBySubject[subjectId]) dynBySubject[subjectId] = {};
    dynBySubject[subjectId][examId] = val;
  });

  if (classExams.length > 0) {
    const allRows = await ReportCardMark.find({ reportCardId: reportCard._id, schoolId });
    for (const row of allRows) {
      const dmRaw = row.dynamicMarks instanceof Map
        ? Object.fromEntries(row.dynamicMarks)
        : (row.dynamicMarks || {});
      const subjectId = row.subjectId?.toString();
      if (!subjectId) continue;

      const sourceMarks = dynBySubject[subjectId] || {};

      // FIX: Instead of skipping isEdited rows entirely (which blocked Half-Yearly and other
      // new exams from appearing), we MERGE source marks ON TOP of existing marks.
      //
      // Merge strategy:
      //   - Start with existing marks (preserves any exam marks not in current source)
      //   - Overwrite with fresh source marks (ensures latest teacher-uploaded marks always win)
      //   - Result: ALL exams get their marks, old manual entries are not lost for exams
      //             that have since been removed from the Marks collection.
      let dm;
      if (row.isEdited && Object.keys(dmRaw).length > 0) {
        // Merge: existing marks as base, source marks override
        // This adds Half-Yearly (or any new exam) without wiping previously entered exam marks.
        dm = { ...dmRaw, ...sourceMarks };
      } else {
        // Row has no manual edits or is empty — full sync from source
        dm = { ...sourceMarks };
      }

      if (debug) {
        console.log(
          `[ReportCardDebug] Row "${row.subject}" (subjectId=${subjectId}, isEdited=${row.isEdited}):`,
          { existingDm: dmRaw, sourceMarks, mergedDm: dm }
        );
      }

      const { dynamicTotal, dynamicGrade } = calculateDynamicSubjectTotal(dm, classExams);
      await ReportCardMark.updateOne(
        { _id: row._id, schoolId },
        { $set: { dynamicMarks: dm, dynamicTotal, dynamicGrade } }
      );
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const finalRows = await ReportCardMark.find({ reportCardId: reportCard._id, schoolId }).sort({ createdAt: 1, subject: 1 });
  const coScholasticRows = await CoScholasticMark.find({ reportCardId: reportCard._id, schoolId }).sort({ createdAt: 1, skillName: 1 });

  return {
    marksRows: finalRows,
    coScholasticRows,
    slotExamDetails,
    classExams: validExams,
  };
};

const getOrCreateReportCard = async (studentProfile, sessionId, schoolId) => {
  const reportCard = await ReportCard.findOneAndUpdate(
    {
      studentId: studentProfile._id,
      session: sessionId,
      schoolId,
    },
    {
      $setOnInsert: {
        classId: studentProfile?.classId?._id ?? studentProfile?.classId,
        rank: '',
        remarksTerm1: '',
        remarksTerm2: '',
        healthTerm1: { height: '', weight: '' },
        healthTerm2: { height: '', weight: '' },
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  if (
    !reportCard.isFinalized &&
    String(reportCard.classId) !== String(studentProfile?.classId?._id ?? studentProfile?.classId)
  ) {
    reportCard.classId = studentProfile?.classId?._id ?? studentProfile?.classId;
    await reportCard.save();
  }

  return reportCard;
};

const buildSummary = (marksRows = [], classExams = []) => {
  const maxPerSubject = classExams.length > 0
    ? classExams.reduce((s, e) => s + e.maxMarks, 0)
    : 100;

  const grandTotal = Number(
    marksRows.reduce((sum, row) => {
      const val = classExams.length > 0 ? (Number(row.dynamicTotal) || 0) : (Number(row.total) || 0);
      return sum + val;
    }, 0).toFixed(2)
  );

  const totalMax = marksRows.length * maxPerSubject;
  const percentage = totalMax > 0
    ? Number(((grandTotal / totalMax) * 100).toFixed(2))
    : 0;

  return {
    subjectCount: marksRows.length,
    grandTotal,
    maxTotal: totalMax,
    percentage,
  };
};

const getStudentProfileByParam = async (studentIdParam, req) => {
  if (studentIdParam === 'me') {
    return StudentProfile.findOne({ userId: req.user._id, schoolId: req.schoolId })
      .populate('userId', 'firstName lastName email role')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name isActive');
  }

  return StudentProfile.findOne({ _id: studentIdParam, schoolId: req.schoolId })
    .populate('userId', 'firstName lastName email role')
    .populate('classId', 'name numericOrder')
    .populate('sectionId', 'name')
    .populate('session', 'name isActive');
};

const reportCardStillUnlocked = async (reportCardId, schoolId) =>
  ReportCard.exists({ _id: reportCardId, schoolId, isFinalized: false });

const ensureAllExamsEvaluated = async (classId, sessionId, schoolId) => {
  const exams = await Exam.find({
    classIds: classId,
    session: sessionId,
    schoolId,
  }).select('_id evaluationStatus');

  return exams.every((exam) => exam.evaluationStatus === 'completed');
};

const createPayload = ({ reportCard, studentProfile, marksRows, coScholasticRows, slotExamDetails, canEdit, classExams = [] }) => ({
  reportCard,
  student: {
    _id: studentProfile._id,
    userId: studentProfile.userId?._id,
    firstName: studentProfile.firstName,
    lastName: studentProfile.lastName,
    rollNo: studentProfile.rollNo,
    admissionNumber: studentProfile.admissionNumber,
    scholarNo: studentProfile.scholarNo,
    email: studentProfile.userId?.email,
  },
  classInfo: {
    classId: studentProfile.classId?._id,
    className: studentProfile.classId?.name,
    sectionId: studentProfile.sectionId?._id,
    sectionName: studentProfile.sectionId?.name,
    sessionId: reportCard.session,
    sessionName: studentProfile.session?.name,
  },
  exams: classExams,
  examSlots: slotExamDetails,
  marksRows,
  coScholastic: coScholasticRows,
  summary: buildSummary(marksRows, classExams),
  permissions: {
    canEdit,
    isFinalized: reportCard.isFinalized,
  },
});

exports.getReportCard = async (req, res) => {
  try {
    const studentProfile = await getStudentProfileByParam(req.params.studentId, req);

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    if (req.user.role === 'student' && String(studentProfile.userId?._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const sessionId = await resolveSessionId(req.query.session || studentProfile.session?._id, req.schoolId);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session not found. Activate a session first.' });
    }

    if (req.user.role === 'teacher') {
      const allowed = await ensureTeacherCanAccessStudent(req.user._id, studentProfile, sessionId, req.schoolId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'You are not assigned as class teacher for this student.' });
      }
    }

    const reportCard = await getOrCreateReportCard(studentProfile, sessionId, req.schoolId);

    const debugMode = req.query?.debug === '1' || req.query?.debug === 'true' || process.env.DEBUG_REPORT_CARDS === '1';

    // Only sync marks from source if the report card is NOT finalized.
    // Finalized cards are immutable — we read exactly what is stored.
    let marksRows, coScholasticRows, slotExamDetails, classExams;
    if (!reportCard.isFinalized) {
      ({ marksRows, coScholasticRows, slotExamDetails, classExams } = await syncMarksFromSource(
        reportCard,
        studentProfile,
        sessionId,
        req.schoolId,
        debugMode
      ));
    } else {
      [marksRows, coScholasticRows] = await Promise.all([
        ReportCardMark.find({ reportCardId: reportCard._id, schoolId: req.schoolId }).sort({ createdAt: 1, subject: 1 }),
        CoScholasticMark.find({ reportCardId: reportCard._id, schoolId: req.schoolId }).sort({ createdAt: 1, skillName: 1 }),
      ]);
      slotExamDetails = {};
      classExams = await fetchClassExams(
        studentProfile?.classId?._id ?? studentProfile?.classId,
        sessionId,
        req.schoolId
      );
    }

    const canEdit = req.user.role === 'admin'
      ? !reportCard.isFinalized   // admin also locked out until unlock
      : req.user.role === 'teacher' && !reportCard.isFinalized;

    return res.status(200).json({
      success: true,
      data: createPayload({
        reportCard,
        studentProfile,
        marksRows,
        coScholasticRows,
        slotExamDetails,
        canEdit,
        classExams: classExams || [],
      }),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReportCard = async (req, res) => {
  try {
    const reportCard = await ReportCard.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!reportCard) {
      return res.status(404).json({ success: false, message: 'Report card not found' });
    }

    const studentProfile = await StudentProfile.findOne({ _id: reportCard.studentId, schoolId: req.schoolId })
      .populate('userId', 'firstName lastName email role')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name isActive');

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    if (req.user.role === 'teacher') {
      const allowed = await ensureTeacherCanAccessStudent(req.user._id, studentProfile, reportCard.session, req.schoolId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'You are not assigned as class teacher for this student.' });
      }
    }

    // ── CRITICAL LOCK CHECK (applies to ALL roles, including admin) ──
    // A finalized report card is immutable. Use POST /unlock/:id first.
    if (reportCard.isFinalized) {
      return res.status(403).json({
        success: false,
        message: 'Report card is finalized and locked. Unlock it first to make changes.',
        code: 'REPORT_CARD_LOCKED',
      });
    }

    const {
      rank,
      remarksTerm1,
      remarksTerm2,
      healthTerm1,
      healthTerm2,
      marks,
      coScholastic,
    } = req.body;

    // CRITICAL: Only block direct marks updates if OASES is enabled
    // When OASES OFF, marks should be editable directly via report card API
    const schoolSettings = await SchoolSettings.findOne({ schoolId: req.schoolId });
    const isOasesEnabled = schoolSettings?.isOasesEnabled ?? false;

    if (isOasesEnabled && Array.isArray(marks) && marks.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Direct report-card marks updates are disabled. Update marks via Marks APIs only.',
        code: 'MARKS_SOURCE_LOCKED',
      });
    }

    // Co-scholastic values are editable here. Scholastic marks are sourced from Marks.
    // When OASES OFF, marks can also be edited directly via dynamicMarks
    let marksSanitized = null;
    if (!isOasesEnabled && Array.isArray(marks) && marks.length > 0) {
      // Allow direct marks editing when OASES is OFF
      marksSanitized = marks;
    }
    let coSanitized = Array.isArray(coScholastic) ? coScholastic : null;
    if (coSanitized) {
      const { rows, errors } = sanitizeCoScholasticRows(coSanitized);
      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid co-scholastic values. Use numbers only.',
          code: 'MARKS_VALIDATION_ERROR',
          errors,
        });
      }
      coSanitized = rows;
    }

    if (rank !== undefined) reportCard.rank = normalizeText(rank);
    if (remarksTerm1 !== undefined) reportCard.remarksTerm1 = normalizeText(remarksTerm1);
    if (remarksTerm2 !== undefined) reportCard.remarksTerm2 = normalizeText(remarksTerm2);

    if (healthTerm1 && typeof healthTerm1 === 'object') {
      reportCard.healthTerm1 = {
        height: healthTerm1.height !== undefined ? normalizeText(healthTerm1.height) : reportCard.healthTerm1?.height || '',
        weight: healthTerm1.weight !== undefined ? normalizeText(healthTerm1.weight) : reportCard.healthTerm1?.weight || '',
      };
    }

    if (healthTerm2 && typeof healthTerm2 === 'object') {
      reportCard.healthTerm2 = {
        height: healthTerm2.height !== undefined ? normalizeText(healthTerm2.height) : reportCard.healthTerm2?.height || '',
        weight: healthTerm2.weight !== undefined ? normalizeText(healthTerm2.weight) : reportCard.healthTerm2?.weight || '',
      };
    }

    if (!(await reportCardStillUnlocked(reportCard._id, req.schoolId))) {
      return res.status(403).json({
        success: false,
        message: 'Report card is finalized and locked. Unlock it first to make changes.',
        code: 'REPORT_CARD_LOCKED',
      });
    }

    await reportCard.save();

    if (marksSanitized) {
      if (!(await reportCardStillUnlocked(reportCard._id, req.schoolId))) {
        return res.status(403).json({
          success: false,
          message: 'Report card is finalized and locked. Unlock it first to make changes.',
          code: 'REPORT_CARD_LOCKED',
        });
      }
      for (const rowInput of marksSanitized) {
        let row = null;

        if (rowInput._id) {
          row = await ReportCardMark.findOne({
            _id: rowInput._id,
            reportCardId: reportCard._id,
            schoolId: req.schoolId,
          });
        } else if (rowInput.subject) {
          row = await ReportCardMark.findOne({
            reportCardId: reportCard._id,
            schoolId: req.schoolId,
            subject: normalizeText(rowInput.subject),
          });
        }

        if (!row) {
          if (!rowInput.subject) {
            continue;
          }

          row = await ReportCardMark.create({
            reportCardId: reportCard._id,
            subject: normalizeText(rowInput.subject),
            subjectId: rowInput.subjectId || undefined,
            schoolId: req.schoolId,
          });
        }

        const updates = {};
        let touchedSlots = false;

        SLOT_FIELDS.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(rowInput, field)) {
            const maxAllowed = SLOT_MAX[field];
            const raw = rowInput[field];
            const parsed = toNumberOrNull(raw);
            // Second-layer clamp (aligns with sanitizeScholasticRows)
            updates[field] = parsed !== null && maxAllowed !== undefined
              ? Math.min(maxAllowed, Math.max(0, parsed))
              : parsed;
            touchedSlots = true;
          }
        });

        if (rowInput.subject !== undefined) {
          updates.subject = normalizeText(rowInput.subject) || row.subject;
        }

        if (rowInput.subjectId !== undefined) {
          updates.subjectId = rowInput.subjectId || null;
        }

        if (rowInput.isEdited !== undefined) {
          updates.isEdited = Boolean(rowInput.isEdited);
        } else if (touchedSlots) {
          updates.isEdited = true;
        }

        const merged = { ...row.toObject(), ...updates };

        if (rowInput.total !== undefined) {
          updates.total = Math.min(100, Math.max(0, Number(rowInput.total) || 0));
        } else if (touchedSlots) {
          updates.total = calculateSubjectTotal(merged).total;
        }

        if (rowInput.grade !== undefined) {
          updates.grade = normalizeText(rowInput.grade) || calculateGrade(updates.total ?? row.total);
        } else if (touchedSlots || updates.total !== undefined) {
          const totalForGrade = updates.total !== undefined ? updates.total : row.total;
          updates.grade = calculateGrade(totalForGrade);
        }

        // ── Handle dynamicMarks (new exam-driven system) ───────────────────────────
        if (rowInput.dynamicMarks && typeof rowInput.dynamicMarks === 'object') {
          const rawDm = rowInput.dynamicMarks;
          const cleanDm = {};
          for (const [examId, val] of Object.entries(rawDm)) {
            const parsed = toNumberOrNull(val);
            cleanDm[examId] = parsed !== null ? Math.max(0, parsed) : null;
          }
          const examList = await fetchClassExams(
            row.subjectId ? (studentProfile?.classId?._id ?? studentProfile?.classId) : null,
            reportCard.session,
            req.schoolId
          ).catch(() => []);
          const { dynamicTotal, dynamicGrade } = calculateDynamicSubjectTotal(cleanDm, examList);
          updates.dynamicMarks = cleanDm;
          updates.dynamicTotal = dynamicTotal;
          updates.dynamicGrade = dynamicGrade;
          updates.isEdited = true;
        }
        // ──────────────────────────────────────────────────────────────────────

        await ReportCardMark.updateOne(
          { _id: row._id, reportCardId: reportCard._id, schoolId: req.schoolId },
          { $set: updates }
        );
      }
    }

    if (coSanitized) {
      if (!(await reportCardStillUnlocked(reportCard._id, req.schoolId))) {
        return res.status(403).json({
          success: false,
          message: 'Report card is finalized and locked. Unlock it first to make changes.',
          code: 'REPORT_CARD_LOCKED',
        });
      }
      for (const rowInput of coSanitized) {
        let row = null;

        if (rowInput._id) {
          row = await CoScholasticMark.findOne({
            _id: rowInput._id,
            reportCardId: reportCard._id,
            schoolId: req.schoolId,
          });
        } else if (rowInput.skillName) {
          row = await CoScholasticMark.findOne({
            reportCardId: reportCard._id,
            schoolId: req.schoolId,
            skillName: normalizeText(rowInput.skillName),
          });
        }

        if (!row) {
          if (!rowInput.skillName) {
            continue;
          }

          row = await CoScholasticMark.create({
            reportCardId: reportCard._id,
            skillName: normalizeText(rowInput.skillName),
            schoolId: req.schoolId,
          });
        }

        const rawTerm1 = Object.prototype.hasOwnProperty.call(rowInput, 'term1Marks')
          ? toNumberOrNull(rowInput.term1Marks)
          : row.term1Marks;
        const term1Marks = rawTerm1 !== null
          ? Math.min(CO_SCHOLASTIC_MAX, Math.max(0, rawTerm1))
          : rawTerm1;

        const rawTerm2 = Object.prototype.hasOwnProperty.call(rowInput, 'term2Marks')
          ? toNumberOrNull(rowInput.term2Marks)
          : row.term2Marks;
        const term2Marks = rawTerm2 !== null
          ? Math.min(CO_SCHOLASTIC_MAX, Math.max(0, rawTerm2))
          : rawTerm2;

        let grade = rowInput.grade !== undefined ? normalizeText(rowInput.grade) : '';

        if (!grade) {
          const values = [term1Marks, term2Marks].filter((value) => value !== null);
          const score = values.length > 0
            ? values.reduce((sum, value) => sum + value, 0) / values.length
            : 0;
          grade = calculateGrade(score);
        }

        await CoScholasticMark.updateOne(
          { _id: row._id, reportCardId: reportCard._id, schoolId: req.schoolId },
          {
            $set: {
              skillName: rowInput.skillName !== undefined ? normalizeText(rowInput.skillName) || row.skillName : row.skillName,
              term1Marks,
              term2Marks,
              grade,
            },
          }
        );
      }
    }

    if (!(await reportCardStillUnlocked(reportCard._id, req.schoolId))) {
      return res.status(403).json({
        success: false,
        message: 'Report card is finalized and locked. Unlock it first to make changes.',
        code: 'REPORT_CARD_LOCKED',
      });
    }

    const freshCard = await ReportCard.findOne({ _id: reportCard._id, schoolId: req.schoolId });
    if (!freshCard || freshCard.isFinalized) {
      return res.status(403).json({
        success: false,
        message: 'Report card is finalized and locked. Unlock it first to make changes.',
        code: 'REPORT_CARD_LOCKED',
      });
    }

    const { marksRows, coScholasticRows, slotExamDetails, classExams } = await syncMarksFromSource(
      freshCard,
      studentProfile,
      freshCard.session,
      req.schoolId,
      false
    );

    return res.status(200).json({
      success: true,
      message: 'Report card saved successfully',
      data: createPayload({
        reportCard: freshCard,
        studentProfile,
        marksRows,
        coScholasticRows,
        slotExamDetails,
        canEdit: true,
        classExams: classExams || [],
      }),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── NEW: Get exams for a class (used by report card editor) ───────────────────
exports.getExamsForClass = async (req, res) => {
  try {
    const { classId, session } = req.query;
    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }
    const sessionId = await resolveSessionId(session, req.schoolId);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session not found. Activate a session first.' });
    }
    const exams = await fetchClassExams(classId, sessionId, req.schoolId);
    return res.status(200).json({ success: true, data: exams });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateReportCards = async (req, res) => {
  try {
    const { classId, sectionId, session } = req.body;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    const sessionId = await resolveSessionId(session, req.schoolId);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session not found. Activate a session first.' });
    }

    // ── DUAL WORKFLOW VALIDATION ──
    // Unified check: OASES ON → require evaluation; OASES OFF → just check marks exist
    const validationResult = await canGenerateReport({
      classId,
      sessionId,
      schoolId: req.schoolId,
    });
    if (!validationResult.allowed) {
      return res.status(400).json({
        success: false,
        message: validationResult.reason || 'Report card generation is not allowed at this time.',
      });
    }

    if (req.user.role === 'teacher') {
      const assignments = await ensureTeacherClassAccess(req.user._id, classId, sessionId, req.schoolId, sectionId || null);
      if (!assignments.length) {
        return res.status(403).json({ success: false, message: 'You are not assigned as class teacher for this class.' });
      }
    }

    const studentFilter = {
      classId,
      session: sessionId,
      schoolId: req.schoolId,
      status: 'active',
    };

    if (sectionId) {
      studentFilter.sectionId = sectionId;
    } else if (req.user.role === 'teacher') {
      const assignments = await ensureTeacherClassAccess(req.user._id, classId, sessionId, req.schoolId);
      studentFilter.sectionId = { $in: assignments.map((item) => item.sectionId) };
    }

    const students = await StudentProfile.find(studentFilter)
      .populate('userId', 'firstName lastName email')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name isActive')
      .sort({ rollNo: 1 });

    if (!students.length) {
      return res.status(404).json({ success: false, message: 'No students found for this class.' });
    }

    const studentIds = students.map((student) => student._id);
    const finalizedCount = await ReportCard.countDocuments({
      studentId: { $in: studentIds },
      classId,
      session: sessionId,
      schoolId: req.schoolId,
      isFinalized: true,
    });
    if (finalizedCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot regenerate report cards after finalize. Unlock finalized report cards first.',
      });
    }

    for (const student of students) {
      const reportCard = await getOrCreateReportCard(student, sessionId, req.schoolId);
      await syncMarksFromSource(reportCard, student, sessionId, req.schoolId, false);
    }

    return res.status(200).json({
      success: true,
      message: `Generated report cards for ${students.length} student(s).`,
      data: {
        count: students.length,
        classId,
        sectionId: sectionId || null,
        session: sessionId,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.finalizeReportCard = async (req, res) => {
  try {
    const reportCard = await ReportCard.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!reportCard) {
      return res.status(404).json({ success: false, message: 'Report card not found' });
    }

    const studentProfile = await StudentProfile.findOne({ _id: reportCard.studentId, schoolId: req.schoolId }).select('classId sectionId session');

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    if (req.user.role === 'teacher') {
      const allowed = await ensureTeacherCanAccessStudent(req.user._id, studentProfile, reportCard.session, req.schoolId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'You are not assigned as class teacher for this student.' });
      }
    }

    const now = new Date();
    const finalized = await ReportCard.findOneAndUpdate(
      { _id: reportCard._id, schoolId: req.schoolId, isFinalized: false },
      { $set: { isFinalized: true, finalizedAt: now, finalizedBy: req.user._id } },
      { new: true }
    );

    if (!finalized) {
      const current = await ReportCard.findOne({ _id: reportCard._id, schoolId: req.schoolId }).select('isFinalized');
      if (!current) {
        return res.status(404).json({ success: false, message: 'Report card not found' });
      }
      return res.status(400).json({
        success: false,
        message: 'Report card is already finalized and locked.',
        code: 'ALREADY_FINALIZED',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Report card finalized and locked successfully',
      data: {
        _id: finalized._id,
        isFinalized: finalized.isFinalized,
        finalizedAt: finalized.finalizedAt,
        finalizedBy: finalized.finalizedBy,
      },
    });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const loginUrl = process.env.CLIENT_URL || 'https://campus-nexus.nexisparkx.com';
        const School = require('../models/School');
        const school = await School.findById(req.schoolId).select('name').lean();
        const schoolName = school?.name || 'School';

        // studentProfile is already fetched earlier in this function
        const fullProfile = await StudentProfile.findOne({
          _id: reportCard.studentId, schoolId: req.schoolId,
        }).populate('userId', 'firstName lastName email').lean();

        if (!fullProfile?.userId) return;
        const studentUser = fullProfile.userId;
        const studentName = `${studentUser.firstName} ${studentUser.lastName}`;

        // In-app notification
        await createInAppNotification({
          userId:          studentUser._id,
          schoolId:        req.schoolId,
          type:            'marks',
          title:           'Report Card Published',
          message:         'Your report card has been finalized and is ready to view.',
          link:            '/student/report-card',
          triggeredBy:     req.user._id,
          triggeredByName: `${req.user.firstName} ${req.user.lastName}`,
          metadata:        { reportCardId: finalized._id },
        });

        // Email notification
        if (studentUser.email) {
          await sendEmailNotification({
            to:      studentUser.email,
            subject: `Report Card Published | ${schoolName}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:#7C3AED;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
                  <h2 style="color:#fff;margin:0;font-size:20px;">${schoolName}</h2>
                  <p style="color:#DDD6FE;margin:5px 0 0;font-size:13px;">Report Card Published</p>
                </div>
                <div style="background:#fff;padding:24px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
                  <p style="color:#111827;font-size:15px;margin:0 0 12px;">Dear ${studentName},</p>
                  <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
                    Your report card has been finalized and is now available for viewing on the portal.
                  </p>
                  <div style="text-align:center;margin:20px 0;">
                    <a href="${loginUrl}/student/report-card"
                       style="background:#7C3AED;color:#fff;padding:10px 24px;border-radius:6px;
                              text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
                      View Report Card
                    </a>
                  </div>
                  <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;">
                  <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
                    ${schoolName} — This is an automated message.
                  </p>
                </div>
              </div>
            `,
          });
        }
      } catch (notifErr) {
        logger.warn('[Notif] Report card finalize notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.unlockReportCard = async (req, res) => {
  try {
    // Belt-and-suspenders: enforce admin-only in controller too
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can unlock a finalized report card.',
        code: 'UNAUTHORIZED',
      });
    }

    const reportCard = await ReportCard.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!reportCard) {
      return res.status(404).json({ success: false, message: 'Report card not found' });
    }

    const unlocked = await ReportCard.findOneAndUpdate(
      { _id: reportCard._id, schoolId: req.schoolId, isFinalized: true },
      {
        $set: {
          isFinalized: false,
          unlockedAt: new Date(),
          unlockedBy: req.user._id,
        },
      },
      { new: true }
    );

    if (!unlocked) {
      return res.status(400).json({ success: false, message: 'Report card is not finalized — nothing to unlock.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Report card unlocked successfully',
      data: {
        _id: unlocked._id,
        isFinalized: unlocked.isFinalized,
        unlockedAt: unlocked.unlockedAt,
        unlockedBy: unlocked.unlockedBy,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClassReportCards = async (req, res) => {
  try {
    const { classId } = req.params;
    const { sectionId, session, search } = req.query;

    const sessionId = await resolveSessionId(session, req.schoolId);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session not found. Activate a session first.' });
    }

    if (req.user.role === 'teacher') {
      const assignments = await ensureTeacherClassAccess(req.user._id, classId, sessionId, req.schoolId, sectionId || null);
      if (!assignments.length) {
        return res.status(403).json({ success: false, message: 'You are not assigned as class teacher for this class.' });
      }
    }

    const studentFilter = {
      classId,
      session: sessionId,
      schoolId: req.schoolId,
      status: 'active',
    };

    if (sectionId) {
      studentFilter.sectionId = sectionId;
    } else if (req.user.role === 'teacher') {
      const assignments = await ensureTeacherClassAccess(req.user._id, classId, sessionId, req.schoolId);
      studentFilter.sectionId = { $in: assignments.map((item) => item.sectionId) };
    }

    // Add search filter for student name or roll number
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      studentFilter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { fullName: searchRegex },
        { rollNo: searchRegex }
      ];
    }

    const students = await StudentProfile.find(studentFilter)
      .populate('userId', 'firstName lastName email')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .sort({ rollNo: 1 });

    const studentIds = students.map((student) => student._id);
    const reportCards = await ReportCard.find({
      studentId: { $in: studentIds },
      classId,
      session: sessionId,
      schoolId: req.schoolId,
    }).select('_id studentId isFinalized updatedAt createdAt');

    const reportCardByStudentId = new Map(
      reportCards.map((item) => [item.studentId.toString(), item])
    );

    const data = students.map((student) => {
      const existing = reportCardByStudentId.get(student._id.toString());

      let status = 'pending';
      if (existing?.isFinalized) {
        status = 'finalized';
      } else if (existing) {
        status = 'generated';
      }

      return {
        studentId: student._id,
        userId: student.userId?._id,
        firstName: student.firstName,
        lastName: student.lastName,
        rollNo: student.rollNo,
        admissionNumber: student.admissionNumber,
        sectionName: student.sectionId?.name,
        reportCardId: existing?._id || null,
        isFinalized: Boolean(existing?.isFinalized),
        status,
        updatedAt: existing?.updatedAt || null,
      };
    });

    const classInfo = await ClassModel.findOne({ _id: classId, schoolId: req.schoolId }).select('name numericOrder');

    return res.status(200).json({
      success: true,
      data,
      meta: {
        classId,
        className: classInfo?.name,
        session: sessionId,
        sectionId: sectionId || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Per-subject marks submission status for a class + exam.
 * GET /api/v1/report-card/readiness?examId=&classId=&sectionId=&session=
 *
 * Omit examId to get readiness for every exam of the class in the session
 * (used by the admin report-card screen to show which exams are blocking).
 *
 * ready === true means every subject configured for the class in that exam has
 * marks submitted — the precondition for students viewing their report card.
 */
exports.getMarksReadiness = async (req, res) => {
  try {
    const { examId, classId, sectionId, session } = req.query;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    const sessionId = await resolveSessionId(session, req.schoolId);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session not found. Activate a session first.' });
    }

    // Teachers only see classes they are assigned to.
    if (req.user.role === 'teacher') {
      const assignments = await ensureTeacherClassAccess(
        req.user._id, classId, sessionId, req.schoolId, sectionId || null
      );
      if (!assignments.length) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
      }
    }

    const examFilter = { classIds: classId, session: sessionId, schoolId: req.schoolId };
    if (examId) examFilter._id = examId;

    const exams = await Exam.find(examFilter)
      .select('name type startDate evaluationStatus evaluationLocked')
      .sort({ startDate: 1, createdAt: 1 })
      .lean();

    if (!exams.length) {
      return res.status(200).json({
        success: true,
        data: { exams: [], allReady: false, reason: 'No exams found for this class' },
      });
    }

    const results = await Promise.all(
      exams.map(async (exam) => ({
        examId: exam._id,
        examName: exam.name,
        examType: exam.type,
        evaluationStatus: exam.evaluationStatus || 'pending',
        evaluationLocked: Boolean(exam.evaluationLocked),
        ...(await getExamReadiness({
          examId: exam._id,
          classId,
          sectionId: sectionId || null,
          schoolId: req.schoolId,
          sessionId,
        })),
      }))
    );

    return res.status(200).json({
      success: true,
      data: {
        exams: results,
        // Exams with no configured subjects can never be "ready" — exclude them
        // so an unconfigured exam doesn't permanently block the class.
        allReady: results.filter(r => r.totalSubjects > 0).every(r => r.ready),
        classId,
        sectionId: sectionId || null,
        session: sessionId,
      },
    });
  } catch (error) {
    logger.error('[ReportCard] getMarksReadiness error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
