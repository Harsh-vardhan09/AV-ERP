// Legacy god-controller. Being extracted into domain modules — see
// docs/GOD-CONTROLLER-PLAN.md. Do not add to this file.
const StudentProfile = require('../models/StudentProfile');
const { Attendance } = require('../../attendance');
const {
  Assignment,
  Assignmentupload,
  ClassSubjectMap,
  AcademicSession,
  ClassTeacherAssignment,
} = require('../../academics');
const { MarksModel: Marks, ExamSubjectConfig, Exam } = require('../../examination');
const Leave = require('../../communication').Leave;
const ComplainBox = require('../../communication').ComplainBox;
const Knowledgecenter = require('../../communication').Knowledgecenter;
const Notice = require('../../communication').Notice;
const { uploadoncloud } = require('../../../core/config/storage.js');
const logger = require('../../../core/logging/logger.js');

// ── Phase 2: Notification imports ────────────────────────────────────────────
const { createInAppNotification } = require('../../notifications').notificationService;
const { User } = require('../../identity');
const { issueOtp, consumeOtp } = require('../../identity').otpController;

const studentProfileService = require('../services/studentProfileService');
const studentSelfService = require('../../communication').studentSelfServiceService;

// Helper: get student profile
const getStudentProfile = (userId) => studentProfileService.findByUserId(userId);

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await studentProfileService.findByUserId(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// ATTENDANCE
// ========================

exports.getMyAttendance = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // SECURITY: Ensure schoolId is present
    if (!req.schoolId) {
      return res
        .status(400)
        .json({ success: false, message: 'Authentication required: Missing school context' });
    }

    const filter = {
      classId: profile.classId._id,
      sectionId: profile.sectionId._id,
      session: profile.session._id,
      schoolId: req.schoolId,
    };
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.attendanceType) filter.attendanceType = req.query.attendanceType;
    if (req.query.from && req.query.to) {
      filter.date = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to),
      };
    } else if (req.query.month) {
      const [year, month] = req.query.month.split('-');
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      };
    }

    const records = await Attendance.find(filter)
      .populate('subjectId', 'name code')
      .populate('takenBy', 'firstName lastName')
      .sort({ date: -1 });

    // Extract only this student's record from each attendance session
    const myAttendance = records
      .map((record) => {
        const myRecord = record.records.find(
          (r) => r.studentId?.toString() === profile._id.toString()
        );
        return {
          _id: record._id,
          date: record.date,
          subject: record.subjectId,
          attendanceType: record.attendanceType,
          status: myRecord ? myRecord.status : null, // null if student not in record
          teacher: record.takenBy,
        };
      })
      .filter((r) => r.status !== null); // only include records where student appears

    // Summary
    const total = myAttendance.length;
    const present = myAttendance.filter((a) => a.status === 'present').length;
    const absent = myAttendance.filter((a) => a.status === 'absent').length;
    const late = myAttendance.filter((a) => a.status === 'late').length;
    const leave = myAttendance.filter((a) => a.status === 'leave').length;
    const percentage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      summary: { total, present, absent, late, leave, percentage },
      data: myAttendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// ASSIGNMENTS
// ========================

exports.getMyAssignments = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const filter = {
      classId: profile.classId._id,
      sectionId: profile.sectionId._id,
      session: profile.session._id,
    };
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    const assignments = await Assignment.find(filter)
      .populate('subjectId', 'name code')
      .populate('teacherid', 'firstName lastName')
      .sort({ dueDate: -1 });

    // Check which assignments are submitted — use profile._id (matches uploadassignment.studentid)
    const submittedDocs = await Assignmentupload.find({ studentid: profile._id }).select(
      'assignmentid submittedAt photo'
    );

    const submittedMap = {};
    submittedDocs.forEach((s) => {
      submittedMap[s.assignmentid.toString()] = {
        submittedAt: s.submittedAt || s.createdAt,
        fileUrl: s.photo,
      };
    });

    const enriched = assignments.map((a) => ({
      ...a.toObject(),
      isSubmitted: !!submittedMap[a._id.toString()],
      submittedAt: submittedMap[a._id.toString()]?.submittedAt || null,
      submittedFileUrl: submittedMap[a._id.toString()]?.fileUrl || null,
      isExpired: new Date(a.dueDate) < new Date(),
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentid } = req.body;

    // Check if assignment exists and not expired — scoped to school
    const assignment = await Assignment.findOne({ _id: assignmentid, schoolId: req.schoolId });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    if (new Date(assignment.dueDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Assignment deadline has passed' });
    }

    // Get student's profile (need its _id so rollNo populates in teacher view)
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // Upload file to Cloudinary
    let photoUrl = '';
    if (req.file) {
      const uploaded = await uploadoncloud(req.file.path);
      if (!uploaded) {
        return res.status(500).json({ success: false, message: 'File upload to cloud failed' });
      }
      photoUrl = uploaded.url;
    }

    // Upsert: create if first submission, update if re-submitting
    const submission = await Assignmentupload.findOneAndUpdate(
      { studentid: profile._id, assignmentid },
      {
        studentid: profile._id,
        teacherid: assignment.teacherid,
        assignmentid,
        photo: photoUrl,
        submittedAt: new Date(),
        fileHash: require('crypto')
          .createHash('md5')
          .update(photoUrl + Date.now())
          .digest('hex'),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res
      .status(200)
      .json({ success: true, message: 'Assignment submitted successfully', data: submission });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    (async () => {
      try {
        if (!assignment?.teacherid) return;
        const studentName = `${req.user.firstName} ${req.user.lastName}`;
        await createInAppNotification({
          userId: assignment.teacherid,
          schoolId: req.schoolId,
          type: 'assignment',
          title: 'Assignment Submitted',
          message: `${studentName} has submitted "${assignment.title}".`,
          link: `/teacher/assignment-submissions/${assignment._id}`,
          triggeredBy: req.user._id,
          triggeredByName: studentName,
          metadata: { assignmentId: assignment._id },
        });
      } catch (notifErr) {
        logger.warn('[Notif] Submission notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// LEAVE
// ========================

exports.applyLeave = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    // SECURITY: without schoolId the row is invisible to the school-scoped
    // approver queries in teacherController.getStudentLeaves
    if (!req.schoolId) {
      return res
        .status(400)
        .json({ success: false, message: 'Authentication required: Missing school context' });
    }

    const leave = await Leave.create({
      appliedBy: req.user._id,
      role: 'student',
      leaveType,
      startDate,
      endDate,
      reason,
      classId: profile.classId._id,
      sectionId: profile.sectionId._id,
      session: profile.session._id,
      schoolId: req.schoolId,
    });

    res.status(201).json({ success: true, message: 'Leave applied', data: leave });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    (async () => {
      try {
        const classTeacher = await ClassTeacherAssignment.findOne({
          schoolId: req.schoolId,
          classId: profile.classId._id,
        })
          .populate('teacherId', '_id')
          .lean();
        if (!classTeacher?.teacherId) return;

        const studentName = `${req.user.firstName} ${req.user.lastName}`;
        const fromDate = new Date(leave.startDate).toLocaleDateString('en-IN');
        const toDate = new Date(leave.endDate).toLocaleDateString('en-IN');

        await createInAppNotification({
          userId: classTeacher.teacherId._id,
          schoolId: req.schoolId,
          type: 'leave',
          title: `Leave Request — ${studentName}`,
          message: `${studentName} has requested leave from ${fromDate} to ${toDate}.`,
          link: '/teacher/student-leaves',
          triggeredBy: req.user._id,
          triggeredByName: studentName,
          metadata: { leaveId: leave._id, fromDate, toDate, studentName },
        });
      } catch (notifErr) {
        logger.warn('[Notif] Student leave apply notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await studentSelfService.listLeavesForUser(req.user._id, req.schoolId);
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// COMPLAINTS
// ========================

exports.submitComplaint = async (req, res) => {
  try {
    const { category, description, suggestion } = req.body;
    const complaint = await ComplainBox.create({
      complainBy: req.user._id,
      category,
      description,
      suggestion,
      status: 'pending',
      schoolId: req.schoolId, // SECURITY: multi-tenancy stamp
    });
    res.status(201).json({ success: true, message: 'Complaint submitted', data: complaint });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    (async () => {
      try {
        const admin = await User.findOne({
          schoolId: req.schoolId,
          role: 'admin',
          isActive: true,
        })
          .select('_id')
          .lean();
        if (!admin) return;

        const studentName = `${req.user.firstName} ${req.user.lastName}`;
        await createInAppNotification({
          userId: admin._id,
          schoolId: req.schoolId,
          type: 'complaint',
          title: `New Complaint — ${studentName}`,
          message: `${studentName} has submitted a new complaint.`,
          link: '/admin/dashboard',
          triggeredBy: req.user._id,
          triggeredByName: studentName,
          metadata: { complaintId: complaint._id },
        });
      } catch (notifErr) {
        logger.warn('[Notif] Complaint notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await studentSelfService.listComplaintsForUser(req.user._id, req.schoolId);
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// KNOWLEDGE CENTER
// ========================

exports.getMaterials = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const filter = {
      classId: profile.classId?._id,
      sectionId: profile.sectionId?._id,
      session: profile.session?._id,
    };
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const materials = await Knowledgecenter.find(filter)
      .populate('subjectId', 'name code')
      .populate('teacherid', 'firstName lastName')
      .sort({ createdAt: -1 });

    const enriched = materials.map((m) => ({
      ...m.toObject(),
      subjectDisplay: m.customSubjectName || m.subjectId?.name || 'Other',
      hasViewed: m.views?.some((v) => v.studentId?.toString() === profile._id.toString()),
      viewCount: m.views?.length || 0,
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markMaterialViewed = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user._id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    // SECURITY: scope to current school to prevent cross-tenant material marking
    const material = await Knowledgecenter.findOne({
      _id: req.params.materialId,
      schoolId: req.schoolId,
    });
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });

    const alreadyViewed = material.views?.some(
      (v) => v.studentId?.toString() === profile._id.toString()
    );
    if (!alreadyViewed) {
      material.views.push({ studentId: profile._id, viewedAt: new Date() });
      await material.save();
    }
    res.status(200).json({ success: true, message: 'Marked as viewed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// NOTICES
// ========================

exports.getNotices = async (req, res) => {
  try {
    // SECURITY: scope to current school — CRIT-4 fix.
    // Legacy notices predate `audience` and carry none; $in misses null, so they
    // are admitted explicitly rather than vanishing from every student's board.
    const notices = await Notice.find({
      schoolId: req.schoolId,
      $or: [{ audience: { $in: ['all', 'students'] } }, { audience: { $exists: false } }],
    })
      .populate('createdByID', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// MARKS / RESULTS
// ========================

exports.getMyMarks = async (req, res) => {
  try {
    // Get full profile with userId populated for name
    const profile = await StudentProfile.findOne({ userId: req.user._id }).populate(
      'userId',
      'firstName lastName'
    );
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // SECURITY: scope to current school — HIGH-3 fix
    const filter = { studentId: req.user._id, schoolId: req.schoolId };
    if (req.query.examId) filter.examId = req.query.examId;

    const marks = await Marks.find(filter)
      .populate('subjectId', 'name code')
      .populate('examId', 'name type startDate endDate')
      .populate('uploadedBy', 'firstName lastName');

    // Enrich with maxMarks from ExamSubjectConfig
    const enriched = await Promise.all(
      marks.map(async (m) => {
        // SECURITY: scope ExamSubjectConfig to current school
        const config = await ExamSubjectConfig.findOne({
          examId: m.examId?._id,
          classId: m.classId,
          subjectId: m.subjectId?._id,
          schoolId: req.schoolId,
        });
        return {
          ...m.toObject(),
          maxMarks: config?.maxMarks || null,
          passingMarks: config?.passingMarks || null,
          studentName:
            `${profile.userId?.firstName || ''} ${profile.userId?.lastName || ''}`.trim(),
          rollNo: profile.rollNo,
        };
      })
    );

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// PERFORMANCE REPORT
// ========================

exports.getMyReport = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // SECURITY: Ensure schoolId is present
    if (!req.schoolId) {
      return res
        .status(400)
        .json({ success: false, message: 'Authentication required: Missing school context' });
    }

    // Attendance stats
    const attendanceRecords = await Attendance.find({
      classId: profile.classId._id,
      sectionId: profile.sectionId._id,
      session: profile.session._id,
      schoolId: req.schoolId,
    });

    let totalClasses = 0,
      presentCount = 0;
    attendanceRecords.forEach((record) => {
      const myRecord = record.records.find(
        (r) => r.studentId.toString() === profile._id.toString()
      );
      if (myRecord) {
        totalClasses++;
        if (myRecord.status === 'present') presentCount++;
      }
    });

    // Assignment stats
    const totalAssignments = await Assignment.countDocuments({
      classId: profile.classId._id,
      sectionId: profile.sectionId._id,
      session: profile.session._id,
      schoolId: req.schoolId,
    });

    // Get all assignments for this student's context
    const assignments = await Assignment.find({
      classId: profile.classId._id,
      sectionId: profile.sectionId._id,
      session: profile.session._id,
      schoolId: req.schoolId,
    }).select('_id');

    const assignmentIds = assignments.map((a) => a._id);

    // Count submissions that match these assignments (using profile._id for studentid)
    const submittedAssignments = await Assignmentupload.countDocuments({
      studentid: profile._id,
      assignmentid: { $in: assignmentIds },
    });

    // Marks
    const allMarks = await Marks.find({ studentId: req.user._id })
      .populate('subjectId', 'name code')
      .populate('examId', 'name type');

    // Leave stats
    const leaveStats = await Leave.aggregate([
      { $match: { appliedBy: req.user._id, role: 'student', schoolId: req.schoolId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: `${profile.firstName} ${profile.lastName}`,
          class: profile.classId.name,
          section: profile.sectionId.name,
          rollNo: profile.rollNo,
          admissionNumber: profile.admissionNumber,
        },
        attendance: {
          totalClasses,
          present: presentCount,
          absent: totalClasses - presentCount,
          percentage: totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(2) : 0,
        },
        assignments: {
          total: totalAssignments,
          submitted: submittedAssignments,
          pending: totalAssignments - submittedAssignments,
        },
        marks: allMarks,
        leaves: leaveStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// LOGIN EMAIL (students are created with a rollNo only; login accepts either)
// ========================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Scoped to the requesting user so an OTP mailed for one student cannot be
// replayed to attach the same address to another account.
const otpKeyFor = (userId, email) => `student-email:${userId}:${email}`;

const normalizeEmail = (value) =>
  String(value || '')
    .toLowerCase()
    .trim();

const validateNewEmail = async (email, userId, schoolId) => {
  if (!email || !EMAIL_RE.test(email)) return 'Please provide a valid email address';
  const taken = await User.findOne({ email, schoolId, _id: { $ne: userId } }).select('_id');
  if (taken) return 'That email is already in use at this school';
  return null;
};

exports.requestEmailChange = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const error = await validateNewEmail(email, req.user._id, req.schoolId);
    if (error) return res.status(400).json({ success: false, message: error });

    await issueOtp(email, otpKeyFor(req.user._id, email));
    res.status(200).json({ success: true, message: `OTP sent to ${email}` });
  } catch (error) {
    logger.error('[Student] requestEmailChange failed', { error: error.message });
    res
      .status(500)
      .json({ success: false, message: 'Failed to send OTP. Please check the email address.' });
  }
};

exports.verifyEmailChange = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const error = await validateNewEmail(email, req.user._id, req.schoolId);
    if (error) return res.status(400).json({ success: false, message: error });

    const otpError = consumeOtp(otpKeyFor(req.user._id, email), otp);
    if (otpError) return res.status(400).json({ success: false, message: otpError });

    // Scoped by schoolId as well as _id — a student may only change their own
    await User.updateOne(
      { _id: req.user._id, schoolId: req.schoolId },
      { $set: { email, isVerified: true } }
    );

    res.status(200).json({ success: true, message: 'Login email added', data: { email } });
  } catch (error) {
    logger.error('[Student] verifyEmailChange failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};
