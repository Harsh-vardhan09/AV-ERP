// Thin HTTP layer over examService — no model access, no rules.
const asyncHandler = require('../../../core/http/asyncHandler');
const { ok } = require('../../../core/http/ApiResponse');
const examService = require('../services/examService');

// req.user carries _id and role; every service call is scoped by req.schoolId.
const actorOf = (req) => ({ _id: req.user._id, role: req.user.role });

exports.updateExam = asyncHandler(async (req, res) => {
  const { confirm, ...patch } = req.body;
  const { exam, changed } = await examService.updateExam({
    examId: req.params.id,
    schoolId: req.schoolId,
    actor: actorOf(req),
    patch,
    confirm: confirm === true || confirm === 'true',
  });
  return ok(res, exam, changed ? 'Exam updated' : 'No changes to apply');
});

exports.archiveExam = asyncHandler(async (req, res) => {
  const { exam, changed } = await examService.archiveExam({
    examId: req.params.id,
    schoolId: req.schoolId,
    actor: actorOf(req),
  });
  return ok(res, exam, changed ? 'Exam archived' : 'Exam was already archived');
});

exports.restoreExam = asyncHandler(async (req, res) => {
  const { exam, changed } = await examService.restoreExam({
    examId: req.params.id,
    schoolId: req.schoolId,
    actor: actorOf(req),
  });
  return ok(res, exam, changed ? 'Exam restored' : 'Exam was not archived');
});

exports.deleteExam = asyncHandler(async (req, res) => {
  // Accepts the count from either the query string or the body so a plain
  // DELETE (which often carries no body) can still confirm.
  const confirmDeleteMarks = req.query.confirmDeleteMarks ?? req.body?.confirmDeleteMarks;
  const { marksAffected } = await examService.deleteExam({
    examId: req.params.id,
    schoolId: req.schoolId,
    actor: actorOf(req),
    confirmDeleteMarks,
  });
  return ok(
    res,
    { marksAffected },
    marksAffected > 0 ? `Exam and ${marksAffected} mark(s) deleted` : 'Exam deleted'
  );
});

exports.unlockExam = asyncHandler(async (req, res) => {
  const { exam, changed } = await examService.unlockExam({
    examId: req.params.id,
    schoolId: req.schoolId,
    actor: actorOf(req),
  });
  return ok(res, exam, changed ? 'Evaluation unlocked' : 'Exam was not locked');
});

exports.getExamAuditLog = asyncHandler(async (req, res) => {
  const rows = await examService.listAuditLog({
    schoolId: req.schoolId,
    examId: req.query.examId,
    limit: req.query.limit,
  });
  return ok(res, rows);
});
