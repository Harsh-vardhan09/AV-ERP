/**
 * AttendanceService — one record per student per school day.
 *
 * Who may mark: the class teacher assigned to the student's section
 * (ClassTeacherAssignment, the mechanism that already exists — no second source
 * of truth), plus school admin. A subject teacher gets a 403 naming the class
 * teacher, because "you cannot do this" without "and here is who can" turns into
 * a support call.
 */

const mongoose = require('mongoose');
const DailyAttendance = require('../models/DailyAttendance');
const { ClassTeacherAssignment } = require('../../academics');
const { StudentProfile } = require('../../people');
const { SchoolSettings } = require('../../tenancy');
const { toSchoolDay, toDayKey, monthRange, DEFAULT_TZ } = require('../lib/schoolDay');
const ApiError = require('../../../core/http/ApiError');
const logger = require('../../../core/logging/logger');

const ADMIN_ROLES = ['admin', 'admission'];
const VALID_STATUS = ['present', 'absent', 'late', 'leave'];

const _id = (v) => (v == null ? null : String(v));

/** The school's configured timezone, falling back to the platform default. */
async function getSchoolTimezone(schoolId) {
  const settings = await SchoolSettings.findOne({ schoolId }).select('timezone').lean();
  return settings?.timezone || DEFAULT_TZ;
}

/**
 * Who is the class teacher for this section?
 * @returns {Promise<object|null>} the assignment, populated with the teacher
 */
async function getClassTeacher({ schoolId, classId, sectionId, session }) {
  const filter = { schoolId, classId, sectionId };
  if (session) filter.session = session;
  return ClassTeacherAssignment.findOne(filter)
    .populate('teacherId', 'firstName lastName email')
    .lean();
}

/**
 * May this actor mark attendance for this section?
 * Throws ApiError.forbidden with an actionable message, or returns the role
 * the actor is acting in.
 */
async function assertCanMark({ schoolId, classId, sectionId, session, actor }) {
  if (ADMIN_ROLES.includes(actor.role)) return 'admin';

  if (actor.role !== 'teacher') {
    throw ApiError.forbidden('Only a class teacher or a school admin can mark attendance.');
  }

  const assignment = await getClassTeacher({ schoolId, classId, sectionId, session });

  if (!assignment) {
    // No class teacher assigned. Admin can still mark (handled above); a teacher
    // cannot self-appoint, or any subject teacher could mark any section.
    throw ApiError.forbidden(
      'No class teacher is assigned to this section, so only a school admin can mark its ' +
        'attendance. Ask the office to assign a class teacher.'
    );
  }

  if (_id(assignment.teacherId?._id || assignment.teacherId) !== _id(actor._id)) {
    const t = assignment.teacherId;
    const who = t?.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : 'another teacher';
    throw ApiError.forbidden(
      `Attendance for this section is marked by its class teacher (${who}). ` +
        `Subject teachers do not mark daily attendance.`
    );
  }
  return 'teacher';
}

/**
 * The roster for a section on one day, each student carrying today's mark when
 * one exists. Drives the marking screen.
 */
async function getSectionDay({ schoolId, classId, sectionId, session, date }) {
  const tz = await getSchoolTimezone(schoolId);
  const day = toSchoolDay(date, tz);
  if (!day) throw ApiError.badRequest('A valid date is required.');

  const students = await StudentProfile.find({
    schoolId,
    classId,
    sectionId,
    ...(session && { session }),
    status: 'active',
    isDeleted: { $ne: true },
  })
    .select('firstName lastName rollNo admissionNumber')
    .sort({ rollNo: 1, firstName: 1 })
    .lean();

  const marks = await DailyAttendance.find({ schoolId, sectionId, date: day })
    .populate('markedBy', 'firstName lastName role')
    .lean();
  const byStudent = Object.fromEntries(marks.map((m) => [String(m.studentId), m]));

  const roster = students.map((s) => {
    const mark = byStudent[String(s._id)];
    return {
      studentId: String(s._id),
      name: `${s.firstName} ${s.lastName || ''}`.trim(),
      rollNo: s.rollNo || '',
      admissionNumber: s.admissionNumber || '',
      status: mark?.status || 'present',
      remarks: mark?.remarks || '',
    };
  });

  const first = marks[0];
  const marker = first?.markedBy;
  const classTeacher = await getClassTeacher({ schoolId, classId, sectionId, session });

  return {
    date: toDayKey(day),
    timezone: tz,
    roster,
    markedCount: marks.length,
    totalStudents: students.length,
    // A day is "already marked" when every student on the roster has a row.
    isMarked: students.length > 0 && marks.length >= students.length,
    markedBy: marker
      ? {
          id: String(marker._id),
          name: `${marker.firstName} ${marker.lastName || ''}`.trim(),
          role: marker.role,
        }
      : null,
    markedAt: first?.markedAt || null,
    classTeacher: classTeacher?.teacherId
      ? {
          id: String(classTeacher.teacherId._id),
          name: `${classTeacher.teacherId.firstName} ${classTeacher.teacherId.lastName || ''}`.trim(),
        }
      : null,
  };
}

/**
 * Mark (or correct) one day for a whole section.
 *
 * Idempotent by construction: each student is upserted on the unique key
 * (schoolId, studentId, date). A duplicated submit from a flaky connection
 * rewrites the same row rather than inserting a second one, and two concurrent
 * submits are serialised by the index rather than by a read-then-write race.
 */
async function markDay({ schoolId, classId, sectionId, session, date, entries, actor }) {
  const markedByRole = await assertCanMark({ schoolId, classId, sectionId, session, actor });

  const tz = await getSchoolTimezone(schoolId);
  const day = toSchoolDay(date, tz);
  if (!day) throw ApiError.badRequest('A valid date is required.');

  // A day in the future cannot have been observed.
  const today = toSchoolDay(new Date(), tz);
  if (day.getTime() > today.getTime()) {
    throw ApiError.badRequest('Attendance cannot be marked for a future date.');
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest('No attendance entries provided.');
  }

  // Only students actually in this section may be marked through it.
  const students = await StudentProfile.find({
    schoolId,
    classId,
    sectionId,
    ...(session && { session }),
    isDeleted: { $ne: true },
  })
    .select('_id')
    .lean();
  const allowed = new Set(students.map((s) => String(s._id)));

  const ops = [];
  for (const e of entries) {
    const sid = _id(e.studentId);
    if (!sid || !mongoose.Types.ObjectId.isValid(sid)) {
      throw ApiError.badRequest(`Invalid studentId: ${e.studentId}`);
    }
    if (!allowed.has(sid)) {
      throw ApiError.badRequest('A student in this submission is not in this section.');
    }
    if (!VALID_STATUS.includes(e.status)) {
      throw ApiError.badRequest(
        `Invalid status "${e.status}". Use one of: ${VALID_STATUS.join(', ')}.`
      );
    }

    ops.push({
      updateOne: {
        filter: { schoolId, studentId: new mongoose.Types.ObjectId(sid), date: day },
        update: {
          $set: {
            status: e.status,
            remarks: e.remarks || '',
            leaveId: e.leaveId || null,
            classId,
            sectionId,
            session,
            markedBy: actor._id,
            markedByRole,
            markedAt: new Date(),
          },
          $setOnInsert: { schoolId, studentId: new mongoose.Types.ObjectId(sid), date: day },
        },
        upsert: true,
      },
    });
  }

  let result;
  try {
    result = await DailyAttendance.bulkWrite(ops, { ordered: false });
  } catch (err) {
    // A concurrent identical submit can still race between the upsert's lookup
    // and its insert. The index rejects the loser with E11000; the row it wanted
    // to write now exists with the same values, so this is success, not failure.
    if (err.code === 11000 || err.writeErrors?.every((w) => w.code === 11000)) {
      logger.info('[Attendance] Duplicate submit absorbed by the unique index', {
        schoolId: _id(schoolId),
        sectionId: _id(sectionId),
        date: toDayKey(day),
      });
      result = err.result || {};
    } else {
      throw err;
    }
  }

  const created = result.upsertedCount ?? 0;
  const updated = result.modifiedCount ?? 0;
  logger.info('[Attendance] Day marked', {
    schoolId: _id(schoolId),
    sectionId: _id(sectionId),
    date: toDayKey(day),
    created,
    updated,
    by: _id(actor._id),
  });

  // Non-blocking: a notification failure must never fail the attendance write.
  _notifyAbsentees({ schoolId, day, entries }).catch((err) =>
    logger.warn('[Attendance] Absence notifications failed (non-fatal)', { error: err.message })
  );

  return { date: toDayKey(day), created, updated, total: entries.length };
}

/**
 * Tell absent students (and, through them, their parents) the same day.
 *
 * Moved here from teacherController.takeAttendance, which fired once per PERIOD —
 * a student absent all day got one notification per subject. One per day is both
 * correct and quieter.
 */
async function _notifyAbsentees({ schoolId, day, entries }) {
  const absent = entries.filter((e) => e.status === 'absent');
  if (!absent.length) return;

  const { notificationService } = require('../../notifications');
  const { School } = require('../../tenancy');

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';
  const dateLabel = new Date(day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const profiles = await StudentProfile.find({
    _id: { $in: absent.map((a) => a.studentId) },
    schoolId,
  })
    .populate('userId', 'firstName lastName email')
    .lean();

  await Promise.allSettled(
    profiles.map(async (p) => {
      if (!p.userId) return;
      await notificationService.createInAppNotification({
        userId: p.userId._id,
        schoolId,
        type: 'attendance',
        title: 'Marked Absent',
        message: `You were marked absent on ${dateLabel}. — ${schoolName}`,
        link: '/student/attendance',
        metadata: { date: toDayKey(day) },
      });
    })
  );

  logger.info('[Attendance] Absence notifications sent', {
    schoolId: _id(schoolId),
    date: toDayKey(day),
    count: profiles.length,
  });
}

/**
 * One student's attendance for a month, plus their session-wide percentage.
 * The percentage denominator is DAYS MARKED, not periods and not calendar days:
 * a school cannot be marked absent for a day it never held.
 */
async function getStudentAttendance({ schoolId, studentId, session, year, month }) {
  const rows = await DailyAttendance.find({ schoolId, studentId, ...(session && { session }) })
    .select('date status remarks')
    .sort({ date: 1 })
    .lean();

  const summary = summarise(rows);

  let days = null;
  if (year && month) {
    const { start, end } = monthRange(Number(year), Number(month));
    days = rows
      .filter((r) => r.date >= start && r.date <= end)
      .map((r) => ({ date: toDayKey(r.date), status: r.status, remarks: r.remarks || '' }));
  }

  return {
    summary,
    ...(days && { month: { year: Number(year), month: Number(month), days } }),
    // Full session series, so a calendar can render any month without re-fetching
    all: rows.map((r) => ({ date: toDayKey(r.date), status: r.status })),
  };
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE ATTENDANCE RULES. One place, deliberately explicit.
 *
 * The student dashboard and the teacher dashboard used to compute this
 * separately and disagreed on all four of these at once — different model,
 * different denominator, opposite weighting of late and leave. Two
 * implementations of the same number always drift. Every consumer calls this.
 *
 *  1. DENOMINATOR = days that have a record.
 *     Not calendar days, not a working-day calendar. A school cannot be marked
 *     absent for a day it never held, and there is no holiday calendar in this
 *     system to subtract — inventing one would be guesswork. A Sunday has no
 *     record, so it never enters the denominator. The corollary is that an
 *     unmarked day silently vanishes: see getUnassignedSections.
 *
 *  2. LATE COUNTS AS PRESENT.
 *     The student was there. Punctuality is a different concern from
 *     attendance. lateDays is reported separately so a school that disagrees
 *     can weight it without a code change.
 *
 *  3. APPROVED LEAVE IS EXCLUDED FROM THE DENOMINATOR.
 *     Neither present nor absent — sanctioned absence should not depress a
 *     percentage. This is the rule a school is most likely to want changed;
 *     changing it means moving `leave` out of the subtraction below and
 *     nowhere else.
 *
 *  4. NO HALF-DAY.
 *     The status enum is present/absent/late/leave — half-day does not exist in
 *     this system. `halfDay: 0` is reported so consumers have a stable shape,
 *     but adding a real half-day means changing the enum, the marking UI, the
 *     import path and the migration, and deciding what every existing row means.
 * ════════════════════════════════════════════════════════════════════════════
 */
function summarise(rows) {
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  for (const r of rows) if (counts[r.status] !== undefined) counts[r.status]++;

  const totalDays = rows.length;
  const countedDays = totalDays - counts.leave; // rule 3
  const presentDays = counts.present + counts.late; // rule 2
  const percentage = countedDays > 0 ? Math.round((presentDays / countedDays) * 100) : 0;

  return {
    totalDays,
    presentDays: counts.present,
    absentDays: counts.absent,
    lateDays: counts.late,
    leaveDays: counts.leave,
    halfDayDays: 0, // rule 4 — no such status exists
    countedDays,
    // presentDays + lateDays, i.e. what the percentage is actually built from
    attendedDays: presentDays,
    percentage,
  };
}

/**
 * THE single entry point for "what is this student's attendance?".
 *
 * @param {object} opts
 * @param {string} opts.studentId  StudentProfile._id
 * @param {string} opts.schoolId
 * @param {string} [opts.session]  scope to one academic session
 * @param {Date|string} [opts.from] inclusive
 * @param {Date|string} [opts.to]   inclusive
 * @returns {Promise<object>} the summary, plus the day-by-day rows
 */
async function getSummary({ studentId, schoolId, session, from, to }) {
  if (!studentId) throw ApiError.badRequest('studentId is required.');
  if (!schoolId) throw ApiError.badRequest('School context is required.');

  const filter = { schoolId, studentId };
  if (session) filter.session = session;

  if (from || to) {
    const tz = await getSchoolTimezone(schoolId);
    filter.date = {};
    if (from) filter.date.$gte = toSchoolDay(from, tz);
    if (to) filter.date.$lte = toSchoolDay(to, tz);
  }

  const rows = await DailyAttendance.find(filter)
    .select('date status remarks')
    .sort({ date: 1 })
    .lean();

  return {
    ...summarise(rows),
    days: rows.map((r) => ({ date: toDayKey(r.date), status: r.status, remarks: r.remarks || '' })),
  };
}

/** Summaries for many students in one query — class lists and admin reports. */
async function getSummaries({ studentIds, schoolId, session, from, to }) {
  const filter = { schoolId, studentId: { $in: studentIds } };
  if (session) filter.session = session;
  if (from || to) {
    const tz = await getSchoolTimezone(schoolId);
    filter.date = {};
    if (from) filter.date.$gte = toSchoolDay(from, tz);
    if (to) filter.date.$lte = toSchoolDay(to, tz);
  }

  const rows = await DailyAttendance.find(filter).select('studentId status').lean();
  const byStudent = {};
  for (const r of rows) (byStudent[String(r.studentId)] ||= []).push(r);

  return Object.fromEntries(
    studentIds.map((id) => [String(id), summarise(byStudent[String(id)] || [])])
  );
}

/**
 * Sections with no class teacher assigned — a class going unmarked for weeks
 * must be visible somewhere, not silently absent from every report.
 */
async function getUnassignedSections({ schoolId, session }) {
  const { SectionModel, ClassModel } = require('../../academics');

  const sections = await SectionModel.find({ schoolId }).select('name classId').lean();
  const assignments = await ClassTeacherAssignment.find({
    schoolId,
    ...(session && { session }),
  })
    .select('classId sectionId')
    .lean();
  const assigned = new Set(assignments.map((a) => `${a.classId}:${a.sectionId}`));

  const classes = await ClassModel.find({ schoolId }).select('name').lean();
  const classById = Object.fromEntries(classes.map((c) => [String(c._id), c.name]));

  const tz = await getSchoolTimezone(schoolId);
  const today = toSchoolDay(new Date(), tz);

  const out = [];
  for (const s of sections) {
    if (assigned.has(`${s.classId}:${s._id}`)) continue;

    const last = await DailyAttendance.findOne({ schoolId, sectionId: s._id })
      .sort({ date: -1 })
      .select('date')
      .lean();

    out.push({
      classId: String(s.classId),
      className: classById[String(s.classId)] || '',
      sectionId: String(s._id),
      sectionName: s.name,
      lastMarkedOn: last ? toDayKey(last.date) : null,
      daysSinceMarked: last ? Math.round((today.getTime() - last.date.getTime()) / 86400000) : null,
    });
  }
  return out;
}

/**
 * Which students may this actor read?
 * A student may only ever read their own record; a parent, only their children.
 * Returns the StudentProfile _id, or throws.
 */
async function resolveReadableStudent({ schoolId, actor, requestedStudentId }) {
  if (actor.role === 'student') {
    const profile = await StudentProfile.findOne({ userId: actor._id, schoolId })
      .select('_id session')
      .lean();
    if (!profile) throw ApiError.notFound('No student profile found for this account.');
    // Any requested id is ignored rather than checked — there is no path here
    // that reads someone else's record, so none can be exploited.
    return profile;
  }

  // NOTE: there is no 'parent' role in this system. User.role is
  // ['admin','teacher','student','admission','accounts','librarian','exam_controller'],
  // and StudentProfile.parentDetails holds contact details, not a login. Parents
  // currently see their child's data through the student account. When a parent
  // role is introduced, add its branch HERE — the read path is already narrow
  // enough that a parent branch only has to resolve which children it may name.

  if (ADMIN_ROLES.includes(actor.role) || actor.role === 'teacher') {
    if (!requestedStudentId) throw ApiError.badRequest('studentId is required.');
    const profile = await StudentProfile.findOne({ _id: requestedStudentId, schoolId })
      .select('_id session classId sectionId')
      .lean();
    if (!profile) throw ApiError.notFound('Student not found.');
    return profile;
  }

  throw ApiError.forbidden('Not allowed to read attendance.');
}

module.exports = {
  getSchoolTimezone,
  getClassTeacher,
  assertCanMark,
  getSectionDay,
  markDay,
  getStudentAttendance,
  getUnassignedSections,
  resolveReadableStudent,
  // The shared summary — every consumer of an attendance percentage uses these.
  getSummary,
  getSummaries,
  summarise,
  VALID_STATUS,
};
