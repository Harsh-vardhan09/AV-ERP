// Thin HTTP layer over attendanceService — no model access, no rules.
const asyncHandler = require('../../../core/http/asyncHandler');
const { ok, created } = require('../../../core/http/ApiResponse');
const ApiError = require('../../../core/http/ApiError');
const attendanceService = require('../services/attendanceService');

const actorOf = (req) => ({ _id: req.user._id, role: req.user.role });

const requireSection = (req) => {
  const { classId, sectionId } = { ...req.query, ...req.body };
  if (!classId || !sectionId) throw ApiError.badRequest('classId and sectionId are required.');
  return { classId, sectionId, session: req.query.session || req.body.session };
};

/** GET /section-day — the roster for one section on one day, with today's marks */
exports.getSectionDay = asyncHandler(async (req, res) => {
  const { classId, sectionId, session } = requireSection(req);
  const data = await attendanceService.getSectionDay({
    schoolId: req.schoolId,
    classId,
    sectionId,
    session,
    date: req.query.date || new Date(),
  });
  return ok(res, data);
});

/** POST /mark — mark or correct one day for a whole section */
exports.markDay = asyncHandler(async (req, res) => {
  const { classId, sectionId, session } = requireSection(req);
  const result = await attendanceService.markDay({
    schoolId: req.schoolId,
    classId,
    sectionId,
    session,
    date: req.body.date,
    entries: req.body.entries,
    actor: actorOf(req),
  });
  return created(res, result, `Attendance saved for ${result.date}`);
});

/**
 * GET /me — the signed-in student's own attendance.
 * Identity comes from the token; no studentId is accepted, so there is no
 * parameter to tamper with.
 */
exports.getMyAttendance = asyncHandler(async (req, res) => {
  const profile = await attendanceService.resolveReadableStudent({
    schoolId: req.schoolId,
    actor: actorOf(req),
  });
  const data = await attendanceService.getStudentAttendance({
    schoolId: req.schoolId,
    studentId: profile._id,
    session: req.query.session || profile.session,
    year: req.query.year,
    month: req.query.month,
  });
  return ok(res, data);
});

/** GET /student/:studentId — staff view of one student */
exports.getStudentAttendance = asyncHandler(async (req, res) => {
  const profile = await attendanceService.resolveReadableStudent({
    schoolId: req.schoolId,
    actor: actorOf(req),
    requestedStudentId: req.params.studentId,
  });
  const data = await attendanceService.getStudentAttendance({
    schoolId: req.schoolId,
    studentId: profile._id,
    session: req.query.session || profile.session,
    year: req.query.year,
    month: req.query.month,
  });
  return ok(res, data);
});

/** GET /unassigned-sections — sections with no class teacher, so nobody marks them */
exports.getUnassignedSections = asyncHandler(async (req, res) => {
  const data = await attendanceService.getUnassignedSections({
    schoolId: req.schoolId,
    session: req.query.session,
  });
  return ok(res, data);
});
