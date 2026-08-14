/**
 * ExamService — edit / archive / delete / unlock for exams.
 *
 * Every rule lives here so the three routers that expose these actions (admin,
 * exam_controller, teacher) cannot drift apart. Previously the logic sat in
 * people/adminController and teachers had no path at all.
 *
 * Two invariants this file exists to hold:
 *   1. Marks are never destroyed as a side effect. A delete that would cascade
 *      Marks/MarksAuditLog refuses unless the caller echoes back the exact count.
 *   2. Every mutation is written to ExamAuditLog before the response returns.
 */

const Exam = require('../models/Exam');
const Marks = require('../models/MarksModel');
const MarksAuditLog = require('../models/MarksAuditLog');
const ExamSubjectConfig = require('../models/ExamSubjectConfig');
const ExamAuditLog = require('../models/ExamAuditLog');
const { evaluateMarksWindow } = require('../lib/marksWindow');
const ApiError = require('../../../core/http/ApiError');
const logger = require('../../../core/logging/logger');

const FULL_ACCESS_ROLES = ['admin', 'admission', 'exam_controller'];

// Only these may be edited. classIds and session are deliberately absent —
// changing either re-points existing marks at a class they were not entered for.
const EDITABLE_FIELDS = ['name', 'description', 'type', 'startDate', 'endDate'];

const _id = (v) => (v == null ? null : String(v));

/**
 * Dates arrive from HTML date inputs, which send '' for an empty box. Mongoose
 * casts '' to null, so a blank input used to silently wipe a stored date. Require
 * an explicit null to clear.
 */
const _parseDate = (value, field) => {
  if (value === null) return null;
  if (value === '') {
    throw ApiError.badRequest(`${field} cannot be blank. Send null to clear it, or a valid date.`);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest(`${field} is not a valid date.`);
  return d;
};

const _writeAudit = async (entry) => {
  try {
    await ExamAuditLog.create(entry);
  } catch (err) {
    // The mutation already happened. Losing the audit row is bad, but throwing
    // here would report failure for work that succeeded.
    logger.error('[ExamService] audit write failed', {
      examId: _id(entry.examId),
      action: entry.action,
      error: err.message,
    });
  }
};

const _loadExam = async (examId, schoolId) => {
  const exam = await Exam.findOne({ _id: examId, schoolId }).lean();
  if (!exam) throw ApiError.notFound('Exam not found');
  return exam;
};

/**
 * Role-only authorisation is all this codebase has, but Exam.createdBy and
 * createdByRole are already populated on both create paths, so ownership is
 * checkable without a schema change.
 *
 * @param {'manage'|'delete'} intent
 */
const _assertCanManage = (exam, actor, intent = 'manage') => {
  if (FULL_ACCESS_ROLES.includes(actor.role)) return;

  if (actor.role !== 'teacher') {
    throw ApiError.forbidden('You are not allowed to modify exams.');
  }
  if (_id(exam.createdBy) !== _id(actor._id)) {
    throw ApiError.forbidden('You can only modify tests you created.');
  }
  // Once the window is open, marks may already be arriving from other teachers.
  if (evaluateMarksWindow(exam).open) {
    throw ApiError.forbidden(
      `Marks entry for "${exam.name}" has already opened. Ask an administrator to change it.`
    );
  }
  if (intent === 'delete') {
    // A teacher must never be offered the "delete N marks" confirmation — that
    // is an administrator's decision. The caller checks the count separately.
    return;
  }
};

const countMarks = (examId, schoolId) => Marks.countDocuments({ examId, schoolId });

/**
 * Edit an exam.
 *
 * Date changes that would close the marks window on marks that already exist are
 * refused with a count until the caller confirms — never silently applied.
 */
async function updateExam({ examId, schoolId, actor, patch = {}, confirm = false }) {
  const exam = await _loadExam(examId, schoolId);

  if (exam.evaluationLocked) {
    throw ApiError.conflict(
      `"${exam.name}" is locked after evaluation. Unlock it before editing.`,
      { code: 'EVALUATION_LOCKED' }
    );
  }
  _assertCanManage(exam, actor, 'manage');

  const changes = {};
  for (const field of EDITABLE_FIELDS) {
    if (!(field in patch)) continue;
    const value =
      field === 'startDate' || field === 'endDate' ? _parseDate(patch[field], field) : patch[field];
    // Compare as time values; two Dates are never ===
    const same =
      value instanceof Date && exam[field] instanceof Date
        ? value.getTime() === exam[field].getTime()
        : value === exam[field];
    if (!same) changes[field] = value;
  }

  if (!Object.keys(changes).length) {
    return { exam, changed: false, marksAffected: 0 };
  }

  const startDate = 'startDate' in changes ? changes.startDate : exam.startDate;
  const endDate = 'endDate' in changes ? changes.endDate : exam.endDate;
  if (startDate && endDate && endDate < startDate) {
    throw ApiError.badRequest('End date cannot be before the start date.');
  }

  // Would the new dates shut the window on marks that already exist?
  if ('startDate' in changes) {
    const wouldClose = !evaluateMarksWindow({ ...exam, ...changes }).open;
    if (wouldClose) {
      const marksAffected = await countMarks(examId, schoolId);
      if (marksAffected > 0 && !confirm) {
        throw ApiError.conflict(
          `${marksAffected} mark(s) have already been entered for "${exam.name}". ` +
            `Moving the start date to ${startDate.toDateString()} closes marks entry and those ` +
            `marks can no longer be edited. Re-send with confirm: true to apply anyway.`,
          { code: 'MARKS_WOULD_BE_LOCKED_OUT', marksAffected, requiresConfirmation: true }
        );
      }
    }
  }

  const updated = await Exam.findOneAndUpdate(
    { _id: examId, schoolId },
    { $set: changes },
    { new: true, runValidators: true }
  ).lean();

  const before = {};
  for (const k of Object.keys(changes)) before[k] = exam[k] ?? null;

  await _writeAudit({
    examId,
    examName: exam.name,
    action: 'updated',
    actorId: actor._id,
    actorRole: actor.role,
    before,
    after: changes,
    schoolId,
  });

  return { exam: updated, changed: true, marksAffected: 0 };
}

/** Soft delete — keeps marks and audit rows, drops the exam from pick-lists. */
async function archiveExam({ examId, schoolId, actor }) {
  const exam = await _loadExam(examId, schoolId);
  _assertCanManage(exam, actor, 'manage');

  if (exam.isArchived) return { exam, changed: false };

  const updated = await Exam.findOneAndUpdate(
    { _id: examId, schoolId },
    { $set: { isArchived: true, archivedAt: new Date(), archivedBy: actor._id } },
    { new: true }
  ).lean();

  await _writeAudit({
    examId,
    examName: exam.name,
    action: 'archived',
    actorId: actor._id,
    actorRole: actor.role,
    before: { isArchived: false },
    after: { isArchived: true },
    marksAffected: await countMarks(examId, schoolId),
    schoolId,
  });

  return { exam: updated, changed: true };
}

async function restoreExam({ examId, schoolId, actor }) {
  const exam = await _loadExam(examId, schoolId);
  _assertCanManage(exam, actor, 'manage');

  if (!exam.isArchived) return { exam, changed: false };

  const updated = await Exam.findOneAndUpdate(
    { _id: examId, schoolId },
    { $set: { isArchived: false, archivedAt: null, archivedBy: null } },
    { new: true }
  ).lean();

  await _writeAudit({
    examId,
    examName: exam.name,
    action: 'restored',
    actorId: actor._id,
    actorRole: actor.role,
    before: { isArchived: true },
    after: { isArchived: false },
    schoolId,
  });

  return { exam: updated, changed: true };
}

/**
 * Hard delete. Cascades ExamSubjectConfig, Marks and MarksAuditLog — which is
 * exactly why it refuses to run blind.
 *
 * @param {number|string} [confirmDeleteMarks] must equal the current mark count.
 *   A number rather than a boolean on purpose: it fails safe if marks were added
 *   between the caller reading the count and sending the request.
 */
async function deleteExam({ examId, schoolId, actor, confirmDeleteMarks }) {
  const exam = await _loadExam(examId, schoolId);

  if (exam.evaluationLocked) {
    throw ApiError.conflict(
      `"${exam.name}" is locked after evaluation. Unlock it before deleting.`,
      { code: 'EVALUATION_LOCKED' }
    );
  }
  _assertCanManage(exam, actor, 'delete');

  const marksAffected = await countMarks(examId, schoolId);

  if (marksAffected > 0) {
    // A teacher may only delete a test nobody has marked.
    if (!FULL_ACCESS_ROLES.includes(actor.role)) {
      throw ApiError.conflict(
        `"${exam.name}" has ${marksAffected} mark(s) entered and cannot be deleted by a teacher. ` +
          `Ask an administrator to archive or delete it.`,
        { code: 'MARKS_EXIST', marksAffected }
      );
    }

    const confirmed = Number(confirmDeleteMarks);
    if (!Number.isInteger(confirmed) || confirmed !== marksAffected) {
      throw ApiError.conflict(
        `"${exam.name}" has ${marksAffected} mark(s). Deleting it destroys them and their audit ` +
          `trail permanently. Archive it instead, or re-send with confirmDeleteMarks=${marksAffected}.`,
        {
          code: 'MARKS_EXIST',
          marksAffected,
          requiresConfirmation: true,
          alternative: 'archive',
        }
      );
    }
  }

  // Audit BEFORE the delete: once the exam is gone the name is unrecoverable,
  // and a failure here must not leave a destroyed exam with no record.
  await _writeAudit({
    examId,
    examName: exam.name,
    action: 'deleted',
    actorId: actor._id,
    actorRole: actor.role,
    before: {
      name: exam.name,
      type: exam.type,
      startDate: exam.startDate,
      endDate: exam.endDate,
    },
    after: {},
    marksAffected,
    schoolId,
  });

  await Exam.deleteOne({ _id: examId, schoolId });
  await Promise.all([
    ExamSubjectConfig.deleteMany({ examId, schoolId }),
    Marks.deleteMany({ examId, schoolId }),
    MarksAuditLog.deleteMany({ examId, schoolId }),
  ]);

  logger.warn('[ExamService] exam hard-deleted', {
    examId: _id(examId),
    schoolId: _id(schoolId),
    marksAffected,
    actorId: _id(actor._id),
  });

  return { marksAffected };
}

/**
 * Clear evaluationLocked.
 *
 * completeEvaluation sets the lock and, outside OASES, nothing ever cleared it —
 * a locked exam could not be edited, deleted, or have marks entered, with no way
 * back. Administrators only.
 */
async function unlockExam({ examId, schoolId, actor }) {
  if (!FULL_ACCESS_ROLES.includes(actor.role)) {
    throw ApiError.forbidden('Only an administrator can unlock an exam.');
  }

  const exam = await _loadExam(examId, schoolId);
  if (!exam.evaluationLocked) {
    return { exam, changed: false };
  }

  // evaluationStatus goes back to in_progress: leaving it 'completed' would make
  // startEvaluation refuse, re-creating the dead end one level down.
  const updated = await Exam.findOneAndUpdate(
    { _id: examId, schoolId },
    { $set: { evaluationLocked: false, evaluationStatus: 'in_progress' } },
    { new: true }
  ).lean();

  await _writeAudit({
    examId,
    examName: exam.name,
    action: 'unlocked',
    actorId: actor._id,
    actorRole: actor.role,
    before: { evaluationLocked: true, evaluationStatus: exam.evaluationStatus },
    after: { evaluationLocked: false, evaluationStatus: 'in_progress' },
    schoolId,
  });

  logger.info('[ExamService] evaluation unlocked', {
    examId: _id(examId),
    schoolId: _id(schoolId),
    actorId: _id(actor._id),
  });

  return { exam: updated, changed: true };
}

/** Audit trail for one exam, or the whole school. */
async function listAuditLog({ schoolId, examId, limit = 100 }) {
  const filter = { schoolId };
  if (examId) filter.examId = examId;
  return ExamAuditLog.find(filter)
    .populate('actorId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .lean();
}

module.exports = {
  updateExam,
  archiveExam,
  restoreExam,
  deleteExam,
  unlockExam,
  listAuditLog,
  countMarks,
};
