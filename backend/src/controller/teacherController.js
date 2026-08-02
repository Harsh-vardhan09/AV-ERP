const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const Attendance = require('../models/attendance');
const Leave = require('../models/leave');
const Assignment = require('../models/assignment');
const Assignmentupload = require('../models/uploadassignment');
const Knowledgecenter = require('../models/knowledgecenter');
const Marks = require('../models/MarksModel');
const MarksAuditLog = require('../models/MarksAuditLog');
const StudentProfile = require('../models/StudentProfile');
const AcademicSession = require('../models/AcademicSession');
const ExamSubjectConfig = require('../models/ExamSubjectConfig');
const Exam = require('../models/Exam');
const ClassModel = require('../models/ClassModel');
const ClassSubjectMap = require('../models/ClassSubjectMap');
const ReportTemplate = require('../models/ReportTemplate');
const TemplateFieldExtractor = require('../services/templateFieldExtractor');
const { refreshExamEvaluationStatus } = require('../services/marksReadinessService');
const { User } = require('../models/user');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { uploadoncloud } = require('../config/cloudnary');
const logger = require('../utils/logger');

// ── Phase 2: Notification imports ────────────────────────────────────────────
const {
  createInAppNotification,
  notifyMultipleUsers,
  sendEmailNotification,
  sendBulkEmails,
} = require('../services/notificationService');
const {
  attendanceAbsentTemplate,
  marksPublishedTemplate,
} = require('../utils/emailTemplates');

const toObjectId = (value) => {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
};

const validateExamContext = async ({ examId, classId, sessionId, schoolId }) => {
  const exam = await Exam.findOne({
    _id: examId,
    schoolId,
    session: sessionId,
    classIds: classId,
  }).select('_id');
  return Boolean(exam);
};

// ========================
// MY ASSIGNMENTS (what classes/subjects am I assigned to)
// ========================

exports.getMyAssignments = async (req, res) => {
  try {
    const filter = { teacherId: req.user._id, schoolId: req.schoolId };
    if (req.query.session) filter.session = req.query.session;

    const assignments = await TeacherSubjectAssignment.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name isActive');
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check if I am class teacher
exports.getMyClassTeacherAssignment = async (req, res) => {
  try {
    const assignment = await ClassTeacherAssignment.find({ teacherId: req.user._id, schoolId: req.schoolId })
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name isActive');
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// ATTENDANCE
// ========================
const SchoolSettings = require('../models/SchoolSettings');
// const Leave = require('../models/leave');

// GET students for a class+section for taking attendance (any teacher)
exports.getStudentsForAttendance = async (req, res) => {
  try {
    const { classId, sectionId, session } = req.query;
    if (!classId || !sectionId || !session) {
      return res.status(400).json({ success: false, message: 'classId, sectionId and session required' });
    }

    // SECURITY: scope by schoolId
    const students = await StudentProfile.find({ classId, sectionId, session, status: 'active', schoolId: req.schoolId })
      .sort({ rollNo: 1 });

    // Check for approved leaves active TODAY
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const studentUserIds = students.map(s => s.userId);
    const activeLeaves = await Leave.find({
      appliedBy: { $in: studentUserIds },
      role: 'student',
      status: 'approved',
      startDate: { $lte: tomorrow },
      endDate: { $gte: today },
      schoolId: req.schoolId
    });

    // Map leaveId by userId for quick lookup
    const leaveMap = {};
    activeLeaves.forEach(l => {
      leaveMap[l.appliedBy.toString()] = l._id;
    });

    const enriched = students.map(s => ({
      _id: s._id,
      userId: s.userId,
      firstName: s.firstName,
      lastName: s.lastName,
      rollNo: s.rollNo,
      admissionNumber: s.admissionNumber,
      onLeave: !!leaveMap[s.userId?.toString()],
      leaveId: leaveMap[s.userId?.toString()] || null
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.takeAttendance = async (req, res) => {
  try {
    const { classId, sectionId, subjectId, session, date, records, attendanceType = 'subject' } = req.body;

    // ── Same-day-only check (IST) ──
    const todayIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const inputDate = new Date(date);
    const isSameDay =
      inputDate.getFullYear() === todayIST.getFullYear() &&
      inputDate.getMonth() === todayIST.getMonth() &&
      inputDate.getDate() === todayIST.getDate();
    if (!isSameDay) {
      return res.status(400).json({ success: false, message: 'Attendance can only be taken for today.' });
    }

    // ── Hall attendance: check permission ──
    if (attendanceType === 'hall') {
      // SECURITY: scope SchoolSettings to current school (FIX 8A)
      const settings = await SchoolSettings.findOne({ schoolId: req.schoolId });
      if (!settings?.allowHallAttendance) {
        return res.status(403).json({ success: false, message: 'Hall/Full-day attendance is not enabled by admin.' });
      }
    } else {
      // Subject attendance: verify teacher is assigned to this subject
      if (!subjectId) {
        return res.status(400).json({ success: false, message: 'subjectId is required for subject attendance.' });
      }
      const assignment = await TeacherSubjectAssignment.findOne({
        teacherId: req.user._id,
        subjectId,
        classId,
        sectionId,
        session,
        schoolId: req.schoolId,
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to teach this subject in this class/section.' });
      }
    }

    // ── Upsert: update if attendance already taken today ──
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const filterWithoutSchoolId = {
      classId, sectionId, session,
      attendanceType,
      date: dateObj,
      ...(attendanceType === 'subject' ? { subjectId } : { subjectId: null })
    };

    // Always check for existing attendance first — scoped to school (FIX 8B)
    const existing = await Attendance.findOne({ ...filterWithoutSchoolId, schoolId: req.schoolId });
    
    const updateData = {
      takenBy: req.user._id,
      records,
      schoolId: req.schoolId
    };

    if (existing) {
      // Update existing attendance
      const attendance = await Attendance.findByIdAndUpdate(
        existing._id,
        { $set: updateData },
        { new: true }
      );
      res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        data: attendance,
        alreadyExists: true
      });

      // ── NOTIFICATION BLOCK — non-blocking ─────────────────────────────────
      ;(async () => {
        try {
          const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
          const School = require('../models/School');
          const school = await School.findById(req.schoolId).select('name').lean();
          const schoolName = school?.name || 'School';

          const absentRecords = (records || []).filter(r => r.status === 'absent');

          await Promise.allSettled(absentRecords.map(async (record) => {
            const studentProf = await StudentProfile.findById(record.studentId)
              .populate('userId', 'firstName lastName email').lean();
            if (!studentProf?.userId) return;

            const studentUser = studentProf.userId;
            const studentName = `${studentUser.firstName} ${studentUser.lastName}`;
            const formattedDate = new Date().toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            });

            // In-app: absent notification
            await createInAppNotification({
              userId:   studentUser._id,
              schoolId: req.schoolId,
              type:     'attendance',
              title:    'Absent Today',
              message:  `You were marked absent on ${formattedDate}.`,
              link:     '/student/attendance',
              metadata: { date: formattedDate },
            });

            // Low attendance check
            const allAttendance = await Attendance.find({
              schoolId: req.schoolId,
              'records.studentId': studentProf._id,
            }).select('records').lean();

            let totalCount = 0, presentCount = 0;
            allAttendance.forEach(att => {
              const rec = att.records?.find(
                r => r.studentId?.toString() === studentProf._id.toString()
              );
              if (rec) {
                totalCount++;
                if (rec.status === 'present') presentCount++;
              }
            });

            const attendancePct = totalCount > 0
              ? Math.round((presentCount / totalCount) * 100)
              : 100;

            if (attendancePct < 75) {
              await createInAppNotification({
                userId:   studentUser._id,
                schoolId: req.schoolId,
                type:     'attendance',
                title:    'Low Attendance Warning',
                message:  `Your attendance is ${attendancePct}%, below the required 75%. Please attend regularly.`,
                link:     '/student/attendance',
                metadata: { percentage: attendancePct },
              });

              const adminUser = await User.findOne({
                schoolId: req.schoolId,
                role: 'admin',
                isActive: true,
              }).select('_id').lean();
              if (adminUser) {
                await createInAppNotification({
                  userId:   adminUser._id,
                  schoolId: req.schoolId,
                  type:     'attendance',
                  title:    `Low Attendance — ${studentName}`,
                  message:  `${studentName}'s attendance is at ${attendancePct}%, below 75%.`,
                  link:     '/admin/dashboard',
                  metadata: { studentName, percentage: attendancePct },
                });
              }
            }

            // Consecutive absence check (3+ days)
            const recentAttendances = await Attendance.find({
              schoolId: req.schoolId,
              'records.studentId': studentProf._id,
            }).sort({ date: -1 }).limit(3).lean();

            const allRecentAbsent = recentAttendances.length >= 3 &&
              recentAttendances.every(att => {
                const rec = att.records?.find(
                  r => r.studentId?.toString() === studentProf._id.toString()
                );
                return rec?.status === 'absent';
              });

            if (allRecentAbsent) {
              const classTeacher = await ClassTeacherAssignment.findOne({
                schoolId: req.schoolId,
                classId,
              }).populate('teacherId', '_id firstName lastName').lean();
              if (classTeacher?.teacherId) {
                await createInAppNotification({
                  userId:   classTeacher.teacherId._id,
                  schoolId: req.schoolId,
                  type:     'attendance',
                  title:    `Student Absent 3+ Days — ${studentName}`,
                  message:  `${studentName} has been absent for 3 or more consecutive days. Please follow up.`,
                  link:     '/teacher/my-students',
                  metadata: { studentName },
                });
              }
            }
          }));

          // Confirmation to teacher
          await createInAppNotification({
            userId:   req.user._id,
            schoolId: req.schoolId,
            type:     'attendance',
            title:    'Attendance Saved',
            message:  'Attendance updated successfully for today.',
            link:     '/teacher/attendance',
            metadata: {},
          });
        } catch (notifErr) {
          logger.warn('[Notif] Attendance notification failed', {
            error: notifErr.message, schoolId: req.schoolId,
          });
        }
      })();
      // ── END NOTIFICATION BLOCK ───────────────────────────────────────────
    } else {
      // Create new attendance
      const attendance = await Attendance.create({
        classId, sectionId, session,
        attendanceType,
        date: dateObj,
        ...(attendanceType === 'subject' ? { subjectId } : { subjectId: null }),
        ...updateData
      });
      res.status(200).json({
        success: true,
        message: 'Attendance recorded successfully',
        data: attendance,
        alreadyExists: false
      });

      // ── NOTIFICATION BLOCK — non-blocking ─────────────────────────────────
      ;(async () => {
        try {
          const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
          const School = require('../models/School');
          const school = await School.findById(req.schoolId).select('name').lean();
          const schoolName = school?.name || 'School';

          const absentRecords = (records || []).filter(r => r.status === 'absent');

          await Promise.allSettled(absentRecords.map(async (record) => {
            const studentProf = await StudentProfile.findById(record.studentId)
              .populate('userId', 'firstName lastName email').lean();
            if (!studentProf?.userId) return;

            const studentUser = studentProf.userId;
            const studentName = `${studentUser.firstName} ${studentUser.lastName}`;
            const formattedDate = new Date().toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            });

            // In-app: absent notification
            await createInAppNotification({
              userId:   studentUser._id,
              schoolId: req.schoolId,
              type:     'attendance',
              title:    'Absent Today',
              message:  `You were marked absent on ${formattedDate}.`,
              link:     '/student/attendance',
              metadata: { date: formattedDate },
            });

            // Low attendance check
            const allAttendance = await Attendance.find({
              schoolId: req.schoolId,
              'records.studentId': studentProf._id,
            }).select('records').lean();

            let totalCount = 0, presentCount = 0;
            allAttendance.forEach(att => {
              const rec = att.records?.find(
                r => r.studentId?.toString() === studentProf._id.toString()
              );
              if (rec) {
                totalCount++;
                if (rec.status === 'present') presentCount++;
              }
            });

            const attendancePct = totalCount > 0
              ? Math.round((presentCount / totalCount) * 100)
              : 100;

            if (attendancePct < 75) {
              await createInAppNotification({
                userId:   studentUser._id,
                schoolId: req.schoolId,
                type:     'attendance',
                title:    'Low Attendance Warning',
                message:  `Your attendance is ${attendancePct}%, below the required 75%. Please attend regularly.`,
                link:     '/student/attendance',
                metadata: { percentage: attendancePct },
              });

              const adminUser = await User.findOne({
                schoolId: req.schoolId,
                role: 'admin',
                isActive: true,
              }).select('_id').lean();
              if (adminUser) {
                await createInAppNotification({
                  userId:   adminUser._id,
                  schoolId: req.schoolId,
                  type:     'attendance',
                  title:    `Low Attendance — ${studentName}`,
                  message:  `${studentName}'s attendance is at ${attendancePct}%, below 75%.`,
                  link:     '/admin/dashboard',
                  metadata: { studentName, percentage: attendancePct },
                });
              }
            }

            // Consecutive absence check (3+ days)
            const recentAttendances = await Attendance.find({
              schoolId: req.schoolId,
              'records.studentId': studentProf._id,
            }).sort({ date: -1 }).limit(3).lean();

            const allRecentAbsent = recentAttendances.length >= 3 &&
              recentAttendances.every(att => {
                const rec = att.records?.find(
                  r => r.studentId?.toString() === studentProf._id.toString()
                );
                return rec?.status === 'absent';
              });

            if (allRecentAbsent) {
              const classTeacher = await ClassTeacherAssignment.findOne({
                schoolId: req.schoolId,
                classId,
              }).populate('teacherId', '_id firstName lastName').lean();
              if (classTeacher?.teacherId) {
                await createInAppNotification({
                  userId:   classTeacher.teacherId._id,
                  schoolId: req.schoolId,
                  type:     'attendance',
                  title:    `Student Absent 3+ Days — ${studentName}`,
                  message:  `${studentName} has been absent for 3 or more consecutive days. Please follow up.`,
                  link:     '/teacher/my-students',
                  metadata: { studentName },
                });
              }
            }
          }));

          // Confirmation to teacher
          await createInAppNotification({
            userId:   req.user._id,
            schoolId: req.schoolId,
            type:     'attendance',
            title:    'Attendance Saved',
            message:  'Attendance recorded successfully for today.',
            link:     '/teacher/attendance',
            metadata: {},
          });
        } catch (notifErr) {
          logger.warn('[Notif] Attendance notification failed', {
            error: notifErr.message, schoolId: req.schoolId,
          });
        }
      })();
      // ── END NOTIFICATION BLOCK ───────────────────────────────────────────
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAttendanceRecords = async (req, res) => {
  try {
    // SECURITY: scope to current school (FIX 8C)
    const filter = { takenBy: req.user._id, schoolId: req.schoolId };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.attendanceType) filter.attendanceType = req.query.attendanceType;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    } else if (req.query.date) {
      const d = new Date(req.query.date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    const records = await Attendance.find(filter)
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('subjectId', 'name code')
      .populate('records.studentId', 'firstName lastName rollNo admissionNumber')
      .sort({ date: -1 });

    const enriched = records.map(r => {
      const obj = r.toObject();
      const total = obj.records.length;
      const present = obj.records.filter(x => x.status === 'present').length;
      const absent = obj.records.filter(x => x.status === 'absent').length;
      const late = obj.records.filter(x => x.status === 'late').length;
      const leave = obj.records.filter(x => x.status === 'leave').length;
      return { ...obj, summary: { total, present, absent, late, leave } };
    });

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// ========================
// TEACHER LEAVE
// ========================

exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    // SECURITY: Ensure schoolId is present
    if (!req.schoolId) {
      return res.status(400).json({ success: false, message: 'Authentication required: Missing school context' });
    }

    const leave = await Leave.create({
      appliedBy: req.user._id,
      role: 'teacher',
      leaveType,
      startDate,
      endDate,
      reason,
      schoolId: req.schoolId
    });

    res.status(201).json({ success: true, message: 'Leave applied successfully', data: leave });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const admin = await User.findOne({
          schoolId: req.schoolId,
          role: 'admin',
          isActive: true,
        }).select('_id').lean();
        if (!admin) return;

        const teacherName = `${req.user.firstName} ${req.user.lastName}`;
        const fromDate = new Date(leave.startDate).toLocaleDateString('en-IN');
        const toDate   = new Date(leave.endDate).toLocaleDateString('en-IN');

        await createInAppNotification({
          userId:          admin._id,
          schoolId:        req.schoolId,
          type:            'leave',
          title:           `Leave Request — ${teacherName}`,
          message:         `${teacherName} has applied for leave from ${fromDate} to ${toDate}.`,
          link:            '/admin/teacher-leaves',
          triggeredBy:     req.user._id,
          triggeredByName: teacherName,
          metadata:        { leaveId: leave._id, fromDate, toDate, teacherName },
        });
      } catch (notifErr) {
        logger.warn('[Notif] Teacher leave apply notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ appliedBy: req.user._id, role: 'teacher', schoolId: req.schoolId })
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// STUDENT LEAVE MANAGEMENT (Class Teacher only)
// ========================

exports.getStudentLeaves = async (req, res) => {
  try {
    // Check if this teacher is a class teacher — scoped to school (FIX 9A)
    const ctAssignment = await ClassTeacherAssignment.findOne({ 
      teacherId: req.user._id,
      schoolId: req.schoolId
    });
    if (!ctAssignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned as a class teacher to any class'
      });
    }

    // SECURITY: scope leave filter to current school (FIX 9B)
    const filter = {
      role: 'student',
      classId: ctAssignment.classId,
      sectionId: ctAssignment.sectionId,
      schoolId: req.schoolId
    };
    if (req.query.status) filter.status = req.query.status;

    const leaves = await Leave.find(filter)
      .populate('appliedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveStudentLeave = async (req, res) => {
  try {
    const { status, approvalRemarks } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    // Verify class teacher — scoped to school (FIX 9A for approveStudentLeave)
    const ctAssignment = await ClassTeacherAssignment.findOne({ 
      teacherId: req.user._id,
      schoolId: req.schoolId
    });
    if (!ctAssignment) {
      return res.status(403).json({ success: false, message: 'Not a class teacher' });
    }

    // SECURITY: scope leave update to current school (FIX 9C)
    const leave = await Leave.findOneAndUpdate(
      { 
        _id: req.params.id, 
        classId: ctAssignment.classId, 
        sectionId: ctAssignment.sectionId,
        schoolId: req.schoolId
      },
      { status, approvedBy: req.user._id, approvalRemarks },
      { new: true }
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found or not in your class' });

    res.status(200).json({ success: true, message: `Leave ${status}`, data: leave });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
        const School = require('../models/School');
        const school = await School.findById(req.schoolId).select('name').lean();
        const schoolName = school?.name || 'School';

        const studentUser = await User.findById(leave.appliedBy)
          .select('firstName lastName email').lean();
        if (!studentUser) return;

        const studentName   = `${studentUser.firstName} ${studentUser.lastName}`;
        const approverName  = `${req.user.firstName} ${req.user.lastName}`;
        const isApproved    = leave.status === 'approved';
        const fromDate      = new Date(leave.startDate).toLocaleDateString('en-IN');
        const toDate        = new Date(leave.endDate).toLocaleDateString('en-IN');

        // In-app to student
        await createInAppNotification({
          userId:          studentUser._id,
          schoolId:        req.schoolId,
          type:            'leave',
          title:           `Leave ${isApproved ? 'Approved' : 'Rejected'}`,
          message:         `Your leave request (${fromDate} to ${toDate}) has been ${leave.status} by ${approverName}.`,
          link:            '/student/leave',
          triggeredBy:     req.user._id,
          triggeredByName: approverName,
          metadata:        { status: leave.status, fromDate, toDate, approverName },
        });

        // Email to student
        const { leaveDecisionTemplate } = require('../utils/emailTemplates');
        const { subject, html } = leaveDecisionTemplate({
          applicantName:  studentName,
          leaveType:      leave.leaveType || 'Leave',
          fromDate,
          toDate,
          status:         leave.status.toUpperCase(),
          reason:         leave.approvalRemarks || '',
          approvedByName: approverName,
          schoolName,
          loginUrl,
        });
        await sendEmailNotification({ to: studentUser.email, subject, html });
      } catch (notifErr) {
        logger.warn('[Notif] Student leave decision notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// ASSIGNMENT UPLOAD (Teacher creates assignments)
// ========================

exports.createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, subjectId, classId, sectionId, session } = req.body;

    // Verify teacher is assigned to this
    const assignment = await TeacherSubjectAssignment.findOne({
      teacherId: req.user._id, subjectId, classId, sectionId, session, schoolId: req.schoolId
    });
    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this subject/class' });
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

    const newAssignment = await Assignment.create({
      teacherid: req.user._id, title, description, dueDate,
      subjectId, classId, sectionId, session,
      photo: photoUrl || '',
      schoolId: req.schoolId  // ── multi-tenancy stamp ──
    });

    res.status(201).json({ success: true, message: 'Assignment created', data: newAssignment });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const students = await StudentProfile.find({
          schoolId: req.schoolId,
          classId:  newAssignment.classId,
          sectionId: newAssignment.sectionId,
          status: 'active',
        }).select('userId').lean();

        const studentUserIds = students.map(s => s.userId).filter(Boolean);
        if (studentUserIds.length === 0) return;

        const dueDateFormatted = newAssignment.dueDate
          ? new Date(newAssignment.dueDate).toLocaleDateString('en-IN')
          : 'No due date';

        await notifyMultipleUsers(studentUserIds, {
          schoolId:        req.schoolId,
          type:            'assignment',
          title:           `New Assignment — ${newAssignment.title}`,
          message:         `A new assignment "${newAssignment.title}" has been posted. Due: ${dueDateFormatted}`,
          link:            '/student/assignments',
          triggeredBy:     req.user._id,
          triggeredByName: `${req.user.firstName} ${req.user.lastName}`,
          metadata:        { assignmentId: newAssignment._id, dueDate: dueDateFormatted },
        });
      } catch (notifErr) {
        logger.warn('[Notif] Assignment notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyCreatedAssignments = async (req, res) => {
  try {
    // SECURITY: scope by schoolId + teacher
    const filter = { teacherid: req.user._id, schoolId: req.schoolId };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    const assignments = await Assignment.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ createdAt: -1 });

    // Attach real submission counts from Assignmentupload
    const assignmentIds = assignments.map(a => a._id);
    const submissionCounts = await Assignmentupload.aggregate([
      { $match: { assignmentid: { $in: assignmentIds } } },
      { $group: { _id: '$assignmentid', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    submissionCounts.forEach(s => { countMap[s._id.toString()] = s.count; });

    const enriched = assignments.map(a => ({
      ...a.toObject(),
      submissionCount: countMap[a._id.toString()] || 0
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const submissions = await Assignmentupload.find({ assignmentid: req.params.assignmentId })
      .populate('studentid', 'firstName lastName rollNo admissionNumber')
      .sort({ submittedAt: -1 });
    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotSubmittedStudents = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    // SECURITY: scope by schoolId to prevent cross-tenant access
    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId: req.schoolId });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Get all students in this class/section/session
    const allStudents = await StudentProfile.find({
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      session: assignment.session,
      isActive: { $ne: false }
    }).select('firstName lastName rollNo admissionNumber');

    // Get who has submitted
    const submitted = await Assignmentupload.find({ assignmentid: assignmentId }).select('studentid');
    const submittedIds = new Set(submitted.map(s => s.studentid.toString()));

    const notSubmitted = allStudents.filter(s => !submittedIds.has(s._id.toString()));

    res.status(200).json({
      success: true,
      data: notSubmitted,
      total: allStudents.length,
      submitted: submittedIds.size,
      pending: notSubmitted.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    // SECURITY: scope by schoolId to prevent cross-tenant modification
    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId: req.schoolId });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.teacherid.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this assignment' });
    }

    const { title, description, dueDate } = req.body;
    if (title) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;

    // If a new file is uploaded, replace it on Cloudinary
    if (req.file) {
      const uploaded = await uploadoncloud(req.file.path);
      if (!uploaded) return res.status(500).json({ success: false, message: 'File upload to cloud failed' });
      assignment.photo = uploaded.url;
    }

    await assignment.save();
    res.status(200).json({ success: true, message: 'Assignment updated', data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    // SECURITY: scope by schoolId
    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId: req.schoolId });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.teacherid.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this assignment' });
    }

    // Remove all student submissions for this assignment
    await Assignmentupload.deleteMany({ assignmentid: assignmentId });
    await Assignment.findOneAndDelete({ _id: assignmentId, schoolId: req.schoolId });

    res.status(200).json({ success: true, message: 'Assignment and all submissions deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ========================
// KNOWLEDGE CENTER
// ========================

exports.uploadMaterial = async (req, res) => {
  try {
    const { title, description, subjectId, customSubjectName, classId, sectionId, session } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a file' });
    }

    const uploaded = await uploadoncloud(req.file.path);
    if (!uploaded) {
      return res.status(500).json({ success: false, message: 'File upload to cloud failed' });
    }

    const ext = req.file.originalname?.split('.').pop()?.toLowerCase() || '';
    const fileType = ['pdf'].includes(ext) ? 'pdf'
      : ['doc', 'docx'].includes(ext) ? 'doc'
        : ['jpg', 'jpeg', 'png', 'gif'].includes(ext) ? 'image'
          : ext || 'other';

    const material = await Knowledgecenter.create({
      teacherid: req.user._id,
      teacherName: `${req.user.firstName} ${req.user.lastName}`,
      title,
      description,
      subjectId: subjectId || null,
      customSubjectName: subjectId ? undefined : customSubjectName,
      classId,
      sectionId,
      session,
      fileUrl: uploaded.url,
      fileType,
      schoolId: req.schoolId  // ── multi-tenancy stamp ──
    });

    const populated = await material.populate([
      { path: 'subjectId', select: 'name code' },
      { path: 'classId', select: 'name' },
      { path: 'sectionId', select: 'name' }
    ]);

    res.status(201).json({ success: true, message: 'Material uploaded', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyMaterials = async (req, res) => {
  try {
    // SECURITY: scope by schoolId + teacher
    const filter = { teacherid: req.user._id, schoolId: req.schoolId };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const materials = await Knowledgecenter.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ createdAt: -1 });

    const enriched = materials.map(m => ({
      ...m.toObject(),
      viewCount: m.views?.length || 0,
      subjectDisplay: m.customSubjectName || m.subjectId?.name || 'Other'
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    // SECURITY: scope by schoolId to prevent cross-tenant material access
    const material = await Knowledgecenter.findOne({ _id: req.params.materialId, schoolId: req.schoolId });
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    if (material.teacherid.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, description, customSubjectName } = req.body;
    if (title) material.title = title;
    if (description !== undefined) material.description = description;
    if (customSubjectName !== undefined) material.customSubjectName = customSubjectName;

    if (req.file) {
      const uploaded = await uploadoncloud(req.file.path);
      if (!uploaded) return res.status(500).json({ success: false, message: 'File upload failed' });
      material.fileUrl = uploaded.url;
    }

    await material.save();
    res.status(200).json({ success: true, message: 'Material updated', data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    // SECURITY: scope by schoolId
    const material = await Knowledgecenter.findOne({ _id: req.params.materialId, schoolId: req.schoolId });
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    if (material.teacherid.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Knowledgecenter.findOneAndDelete({ _id: req.params.materialId, schoolId: req.schoolId });
    res.status(200).json({ success: true, message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// ========================
// MARKS
// ========================

// Get students for marks entry (teacher selects exam → class → section)
exports.getStudentsForMarks = async (req, res) => {
  try {
    const { classId, sectionId, session } = req.query;
    if (!classId || !sectionId || !session) {
      return res.status(400).json({ success: false, message: 'classId, sectionId and session are required' });
    }

    const students = await StudentProfile.find({
      classId, sectionId, session, status: 'active', schoolId: req.schoolId
    }).populate('userId', 'firstName lastName email').sort({ rollNo: 1 });

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// GET exams available for this teacher (based on their assigned classes)
exports.getMyExams = async (req, res) => {
  try {
    const { session } = req.query;

    // ── EXAM_CONTROLLER: MARKS_ALL_ACCESS — skip assignment filter, see all school exams ──
    const hasAllAccess = req.user.role === 'exam_controller';

    let filter = { schoolId: req.schoolId };
    if (session) filter.session = toObjectId(session);

    if (!hasAllAccess) {
      // Find all unique classIds this teacher is assigned to
      const assignmentFilter = { teacherId: req.user._id, schoolId: req.schoolId };
      if (session) assignmentFilter.session = toObjectId(session);

      const assignments = await TeacherSubjectAssignment.find(assignmentFilter)
        .select('classId')
        .lean();

      const classIds = [...new Set(assignments.map(a => String(a.classId)).filter(Boolean))];

      if (classIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      // Find exams that include ANY of the teacher's classes
      filter.classIds = { $in: classIds.map(id => toObjectId(id)) };
    }

    const exams = await Exam.find(filter)
      .select('name type startDate endDate status session classIds')
      .populate('session', 'name year')
      .sort({ startDate: -1 })
      .lean();

    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    logger.error('getMyExams error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadMarks = async (req, res) => {
  try {
    const {
      examId, subjectId, classId, sectionId, session,
      marks,
      marksType = 'theory',    // used in OLD format
      templateId,              // optional: for new dynamic-fields format
    } = req.body;
    // marks = [
    //   OLD: { studentId, marksObtained, remarks }
    //   NEW: { studentId, fields: { math_theory: 80, math_practical: 20 }, remarks }
    // ]

    // Detect format: if ANY mark entry has a `fields` map, use the new pipeline
    const isNewFormat = Array.isArray(marks) && marks.some(m => m.fields && typeof m.fields === 'object');

    // normalizedType defined HERE (before it is used in maxMarks calculation below)
    const normalizedType = (marksType || 'theory').toString().trim().toLowerCase();

    const examObjectId = toObjectId(examId);
    const subjectObjectId = toObjectId(subjectId);
    const classObjectId = toObjectId(classId);
    const sectionObjectId = toObjectId(sectionId);
    const sessionObjectId = toObjectId(session);
    const schoolObjectId = toObjectId(req.schoolId);

    if (!examObjectId || !subjectObjectId || !classObjectId || !sectionObjectId || !sessionObjectId) {
      return res.status(400).json({ success: false, message: 'Invalid examId/subjectId/classId/sectionId/session' });
    }

    const examExists = await validateExamContext({
      examId: examObjectId,
      classId: classObjectId,
      sessionId: sessionObjectId,
      schoolId: req.schoolId,
    });
    if (!examExists) {
      return res.status(400).json({ success: false, message: 'Exam not found for this school/session/class' });
    }

    // ── EXAM_CONTROLLER: MARKS_ALL_ACCESS — bypass assignment check ──────────
    const hasAllAccess = req.user.role === 'exam_controller';
    if (!hasAllAccess) {
      // Verify teacher is assigned to this subject
      const assignment = await TeacherSubjectAssignment.findOne({
        teacherId: req.user._id,
        subjectId: subjectObjectId,
        classId: classObjectId,
        sectionId: sectionObjectId,
        session: sessionObjectId,
        schoolId: req.schoolId,
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this subject/class/section' });
      }
    }

    // ExamSubjectConfig: REQUIRED for legacy format, OPTIONAL for dynamic template format.
    // For dynamic format we use it only for per-field max-marks validation.
    const examConfig = await ExamSubjectConfig.findOne({
      examId: examObjectId, subjectId: subjectObjectId,
      classId: classObjectId, schoolId: req.schoolId,
    });
    if (!examConfig && !isNewFormat) {
      return res.status(400).json({ success: false, message: 'This subject is not configured for this class in this exam' });
    }

    // Build per-field max map from marksDistribution
    // e.g. { theory: 80, practical: 20, oral: 20, notebook: 10 }
    const fieldMaxMap = {};
    let totalMaxMarks  = 100;
    if (examConfig) {
      if (Array.isArray(examConfig.marksDistribution) && examConfig.marksDistribution.length > 0) {
        examConfig.marksDistribution.forEach(d => {
          if (d.type) fieldMaxMap[d.type.toLowerCase()] = Number(d.maxMarks) || Infinity;
        });
        totalMaxMarks = examConfig.marksDistribution.reduce((s, d) => s + (Number(d.maxMarks) || 0), 0) || 100;
      } else if (normalizedType === 'practical' && (examConfig.practicalMaxMarks || 0) > 0) {
        totalMaxMarks = Number(examConfig.practicalMaxMarks);
      } else if (normalizedType === 'project' && (examConfig.projectMaxMarks || 0) > 0) {
        totalMaxMarks = Number(examConfig.projectMaxMarks);
      } else {
        const mx = Number(examConfig.maxMarks);
        totalMaxMarks = Number.isFinite(mx) && mx > 0 ? mx : 100;
      }
    }

    // Resolve per-field cap for dynamic template marks.
    // "t1_oral" → strip term prefix → "oral" → look up in fieldMaxMap.
    // Falls back to totalMaxMarks (exam total) when no specific distribution entry matches.
    const resolveFieldMax = (fieldKey) => {
      if (!fieldKey) return totalMaxMarks;
      const lower = fieldKey.toLowerCase();
      if (fieldMaxMap[lower] !== undefined) return fieldMaxMap[lower];
      const withoutTerm = lower.replace(/^t[12]_/, '');
      if (fieldMaxMap[withoutTerm] !== undefined) return fieldMaxMap[withoutTerm];
      // No specific entry found — cap at total (e.g. 100) to prevent wild values
      return totalMaxMarks;
    };

    // OLD-format sanitized marks (only used in legacy branch below)
    const maxMarks = totalMaxMarks;
    let clampedCount = 0;
    const sanitizedMarks = (Array.isArray(marks) ? marks : [])
      .filter(m => m && m.marksObtained !== '' && m.marksObtained !== undefined)
      .map((m) => {
        const studentObjectId = toObjectId(m.studentId);
        if (!studentObjectId) return null;
        const raw = Number(m.marksObtained);
        if (!Number.isFinite(raw)) return null;
        const clamped = Math.min(maxMarks, Math.max(0, raw));
        if (clamped !== raw) clampedCount += 1;
        return { ...m, studentId: studentObjectId, marksObtained: clamped };
      })
      .filter(Boolean);

    if (isNewFormat) {
      // ══ NEW FORMAT: dynamic template fields ═══════════════════════════════════
      const validMarks = (Array.isArray(marks) ? marks : []).filter(
        m => m && m.studentId && m.fields && typeof m.fields === 'object' && Object.keys(m.fields).length > 0
      );
      if (validMarks.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid marks entries provided' });
      }

      const operations = validMarks.map(m => {
        const studentObjectId = toObjectId(m.studentId);
        if (!studentObjectId) return null;
        const cleanedFields = {};
        Object.entries(m.fields).forEach(([k, v]) => {
          const num = Number(v);
          if (Number.isFinite(num)) {
            const cap = resolveFieldMax(k);
            cleanedFields[k] = Math.max(0, isFinite(cap) ? Math.min(cap, num) : num);
          }
        });
        if (Object.keys(cleanedFields).length === 0) return null;
        return {
          updateOne: {
            filter: {
              examId:    examObjectId,
              studentId: studentObjectId,
              subjectId: subjectObjectId,
              schoolId:  schoolObjectId || req.schoolId,
            },
            update: {
              $set: {
                schoolId:   schoolObjectId || req.schoolId,
                classId:    classObjectId,
                sectionId:  sectionObjectId,
                session:    sessionObjectId,
                fields:     cleanedFields,
                uploadedBy: req.user._id,
                remarks:    m.remarks || '',
                marksType:  'fields',
              },
            },
            upsert: true,
          },
        };
      }).filter(Boolean);

      if (operations.length > 0) await Marks.bulkWrite(operations);

      // Refresh per-subject completion roll-up on the exam (never throws)
      await refreshExamEvaluationStatus({ examId: examObjectId, schoolId: req.schoolId });

      await MarksAuditLog.create({
        examId: examObjectId, classId: classObjectId, sectionId: sectionObjectId,
        subjectId: subjectObjectId, uploadedBy: req.user._id,
        uploadedByRole: req.user.role === 'exam_controller' ? 'exam_controller' : 'teacher',
        uploadMethod: 'manual_dynamic',
        studentCount: operations.length,
        session: sessionObjectId, schoolId: schoolObjectId || req.schoolId,
      });

      return res.status(200).json({
        success: true,
        message: `Dynamic marks uploaded for ${operations.length} student(s)`,
        ...(examConfig ? {} : { warning: 'Subject not pre-configured; saved without max-marks cap' }),
      });
    }

    // ══ OLD FORMAT: single marksType + marksObtained (backward compat) ═══════
    if (!normalizedType) {
      return res.status(400).json({ success: false, message: 'marksType is required' });
    }


    const operations = sanitizedMarks.map(m => ({
      updateOne: {
        filter: {
          examId:    examObjectId,
          studentId: m.studentId,
          subjectId: subjectObjectId,
          marksType: normalizedType,
          schoolId:  schoolObjectId || req.schoolId,
        },
        update: {
          $set: {
            schoolId:     schoolObjectId || req.schoolId,
            classId:      classObjectId,
            sectionId:    sectionObjectId,
            session:      sessionObjectId,
            marksObtained: m.marksObtained,
            marksType:    normalizedType,
            uploadedBy:   req.user._id,
            remarks:      m.remarks || '',
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await Marks.bulkWrite(operations);
    }

    // Refresh per-subject completion roll-up on the exam (never throws)
    await refreshExamEvaluationStatus({ examId: examObjectId, schoolId: req.schoolId });

    // Create audit log entry
    await MarksAuditLog.create({
      examId: examObjectId, classId: classObjectId, sectionId: sectionObjectId, subjectId: subjectObjectId,
      uploadedBy: req.user._id,
      uploadedByRole: req.user.role === 'exam_controller' ? 'exam_controller' : 'teacher',
      uploadMethod: 'manual',
      studentCount: sanitizedMarks.length,
      session: sessionObjectId,
      schoolId: schoolObjectId || req.schoolId
    });

    const clampMsg = clampedCount > 0 ? ` (clamped ${clampedCount} value(s) to max ${maxMarks})` : '';
    res.status(200).json({ success: true, message: `${marksType} marks uploaded for ${sanitizedMarks.length} student(s)${clampMsg}` });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        if (sanitizedMarks.length === 0) return;

        const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
        const School = require('../models/School');
        const school = await School.findById(req.schoolId).select('name').lean();
        const schoolName = school?.name || 'School';

        // Resolve exam and subject names from already-validated docs
        const examDoc    = await Exam.findById(examObjectId).select('name').lean();
        const subjectDoc = await ExamSubjectConfig.findOne({
          examId: examObjectId, subjectId: subjectObjectId, classId: classObjectId, schoolId: req.schoolId,
        }).populate('subjectId', 'name').lean();
        const examName    = examDoc?.name    || 'Exam';
        const subjectName = subjectDoc?.subjectId?.name || 'Subject';

        // sanitizedMarks[].studentId = StudentProfile._id
        // Need to resolve to User._id for notifications
        const studentProfileIds = sanitizedMarks.map(m => m.studentId);
        const studentProfiles   = await StudentProfile.find({
          _id: { $in: studentProfileIds }, schoolId: req.schoolId,
        }).select('userId').lean();

        const studentUserIds = studentProfiles.map(p => p.userId).filter(Boolean);
        if (studentUserIds.length === 0) return;

        // In-app for all students
        await notifyMultipleUsers(studentUserIds, {
          schoolId: req.schoolId,
          type:     'marks',
          title:    `Marks Published — ${subjectName}`,
          message:  `Your marks for ${subjectName} in ${examName} have been published. Login to view.`,
          link:     '/student/marks',
          metadata: { examName, subjectName },
        });

        // Build email list (fetch users in one query)
        const studentUsers = await User.find({
          _id: { $in: studentUserIds }, schoolId: req.schoolId,
        }).select('_id firstName lastName email').lean();

        const emailList = studentUsers.map(su => {
          const { subject, html } = marksPublishedTemplate({
            studentName: `${su.firstName} ${su.lastName}`,
            subjectName, examName, schoolName, loginUrl,
          });
          return { to: su.email, subject, html };
        });
        if (emailList.length > 0) await sendBulkEmails(emailList);

        // Failed subject check — notify students who scored below passing
        const passingMarks = examConfig?.passingMarks || 0;
        if (passingMarks > 0) {
          const failedProfileIds = sanitizedMarks
            .filter(m => m.marksObtained < passingMarks)
            .map(m => m.studentId);

          if (failedProfileIds.length > 0) {
            const failedProfiles = await StudentProfile.find({
              _id: { $in: failedProfileIds }, schoolId: req.schoolId,
            }).select('userId').lean();
            const failedUserIds = failedProfiles.map(p => p.userId).filter(Boolean);

            if (failedUserIds.length > 0) {
              await notifyMultipleUsers(failedUserIds, {
                schoolId: req.schoolId,
                type:     'marks',
                title:    `Below Passing — ${subjectName}`,
                message:  `You have scored below the passing marks in ${subjectName} (${examName}). Please consult your teacher.`,
                link:     '/student/marks',
                metadata: { examName, subjectName, passingMarks },
              });

              const admin = await User.findOne({
                schoolId: req.schoolId, role: 'admin', isActive: true,
              }).select('_id').lean();
              if (admin) {
                await createInAppNotification({
                  userId:   admin._id,
                  schoolId: req.schoolId,
                  type:     'marks',
                  title:    `${failedUserIds.length} Student(s) Failed — ${subjectName}`,
                  message:  `${failedUserIds.length} student(s) scored below passing in ${subjectName} (${examName}).`,
                  link:     '/admin/marks-audit-log',
                  metadata: { examName, subjectName, count: failedUserIds.length },
                });
              }
            }
          }
        }
      } catch (notifErr) {
        logger.warn('[Notif] Marks notification failed', { error: notifErr.message, schoolId: req.schoolId });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadMarksExcel = async (req, res) => {
  try {
    const { examId, subjectId, classId, sectionId, session, marksType: rawMarksType } = req.body;
    const normalizedType = (rawMarksType || 'theory').toString().trim().toLowerCase();

    const examObjectId = toObjectId(examId);
    const subjectObjectId = toObjectId(subjectId);
    const classObjectId = toObjectId(classId);
    const sectionObjectId = toObjectId(sectionId);
    const sessionObjectId = toObjectId(session);
    const schoolObjectId = toObjectId(req.schoolId);

    if (!examObjectId || !subjectObjectId || !classObjectId || !sectionObjectId || !sessionObjectId) {
      return res.status(400).json({ success: false, message: 'Invalid examId/subjectId/classId/sectionId/session' });
    }

    const examExists = await validateExamContext({
      examId: examObjectId,
      classId: classObjectId,
      sessionId: sessionObjectId,
      schoolId: req.schoolId,
    });
    if (!examExists) {
      return res.status(400).json({ success: false, message: 'Exam not found for this school/session/class' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file is required' });
    }

    // ── EXAM_CONTROLLER: MARKS_ALL_ACCESS — bypass assignment check ──────────
    const hasAllAccess = req.user.role === 'exam_controller';
    if (!hasAllAccess) {
      // Verify teacher assignment
      const assignment = await TeacherSubjectAssignment.findOne({
        teacherId: req.user._id,
        subjectId: subjectObjectId,
        classId: classObjectId,
        sectionId: sectionObjectId,
        session: sessionObjectId,
        schoolId: req.schoolId,
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this subject/class/section' });
      }
    }

    // Verify exam subject config
    const examConfig = await ExamSubjectConfig.findOne({ examId: examObjectId, subjectId: subjectObjectId, classId: classObjectId, schoolId: req.schoolId });
    if (!examConfig) {
      return res.status(400).json({ success: false, message: 'Subject not configured for this class in this exam' });
    }

    // Determine max marks from distribution or legacy fields
    let maxMarks = 100;
    if (Array.isArray(examConfig.marksDistribution) && examConfig.marksDistribution.length > 0) {
      const distEntry = examConfig.marksDistribution.find(d => d.type === normalizedType);
      maxMarks = distEntry ? Number(distEntry.maxMarks) || 100
        : examConfig.marksDistribution.reduce((s, d) => s + (Number(d.maxMarks) || 0), 0) || 100;
    } else {
      const mx = Number(examConfig.maxMarks);
      maxMarks = Number.isFinite(mx) && mx > 0 ? mx : 100;
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    // Get all students in this class/section to match by roll no
    const students = await StudentProfile.find({
      classId: classObjectId, sectionId: sectionObjectId, session: sessionObjectId, status: 'active'
    });
    const rollNoMap = {};
    students.forEach(s => { rollNoMap[String(s.rollNo)] = s.userId.toString(); });

    // Build marks from Excel rows
    // Expected columns: Roll No (or RollNo), Marks (or MarksObtained), Remarks
    const operations = [];
    const errors = [];
    let clampedCount = 0;

    rows.forEach((row, idx) => {
      const rollNo = String(row['Roll No'] || row['RollNo'] || row['roll_no'] || '').trim();
      const marksVal = row['Marks'] || row['MarksObtained'] || row['marks_obtained'];
      const remarks = row['Remarks'] || row['remarks'] || '';

      if (!rollNo || marksVal === undefined || marksVal === '') {
        errors.push(`Row ${idx + 2}: Missing roll no or marks`);
        return;
      }

      const studentId = rollNoMap[rollNo];
      if (!studentId) {
        errors.push(`Row ${idx + 2}: Roll No ${rollNo} not found`);
        return;
      }

      const raw = Number(marksVal);
      if (!Number.isFinite(raw)) {
        errors.push(`Row ${idx + 2}: Marks must be a number`);
        return;
      }
      const clamped = Math.min(maxMarks, Math.max(0, raw));
      if (clamped !== raw) clampedCount += 1;

      operations.push({
        updateOne: {
          filter: {
            examId: examObjectId,
            studentId: toObjectId(studentId) || studentId,
            subjectId: subjectObjectId,
            marksType: normalizedType,
            schoolId: schoolObjectId || req.schoolId
          },
          update: {
            $set: {
              schoolId: schoolObjectId || req.schoolId,
              classId: classObjectId,
              sectionId: sectionObjectId,
              session: sessionObjectId,
              marksObtained: clamped,
              marksType: normalizedType,
              uploadedBy: req.user._id,
              remarks: String(remarks)
            }
          },
          upsert: true
        }
      });
    });

    if (operations.length > 0) {
      await Marks.bulkWrite(operations);
    }

    // Refresh per-subject completion roll-up on the exam (never throws)
    await refreshExamEvaluationStatus({ examId: examObjectId, schoolId: req.schoolId });

    // Audit log
    await MarksAuditLog.create({
      examId: examObjectId, classId: classObjectId, sectionId: sectionObjectId, subjectId: subjectObjectId,
      uploadedBy: req.user._id,
      uploadedByRole: req.user.role === 'exam_controller' ? 'exam_controller' : 'teacher',
      uploadMethod: 'excel',
      studentCount: operations.length,
      session: sessionObjectId,
      schoolId: schoolObjectId || req.schoolId
    });

    const clampMsg = clampedCount > 0 ? ` (clamped ${clampedCount} value(s) to max ${maxMarks})` : '';
    res.status(200).json({
      success: true,
      message: `${operations.length} marks uploaded via Excel${clampMsg}`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMarks = async (req, res) => {
  try {
    // SECURITY: always scope to this school
    const filter = { schoolId: req.schoolId };
    if (req.query.examId) filter.examId = req.query.examId;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    const marks = await Marks.find(filter)
      .populate('studentId', 'firstName lastName email')
      .populate('subjectId', 'name code')
      .populate('examId', 'name type')
      .populate('uploadedBy', 'firstName lastName');
    res.status(200).json({ success: true, data: marks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// TEACHER TEST CREATION
// ========================

exports.createTeacherTest = async (req, res) => {
  try {
    const { name, description, session, startDate, endDate, maxMarks, passingMarks } = req.body;
    if (!session) {
      return res.status(400).json({ success: false, message: 'session is required' });
    }

    // Get teacher's assignments to determine which classes/subjects
    const myAssignments = await TeacherSubjectAssignment.find({
      teacherId: req.user._id,
      session,
      schoolId: req.schoolId,
    });

    if (myAssignments.length === 0) {
      return res.status(400).json({ success: false, message: 'You have no teaching assignments for this session' });
    }

    // Group unique classIds from assignments
    const classIdSet = [...new Set(myAssignments.map(a => a.classId.toString()))];

    // Create test (type = unit_test, createdByRole = teacher)
    const exam = await Exam.create({
      name,
      type: 'unit_test',
      description,
      session,
      classIds: classIdSet,
      startDate, endDate,
      createdBy: req.user._id,
      createdByRole: 'teacher',
      schoolId: req.schoolId,
    });

    // Auto-create subject configs only for teacher's own subjects per class
    const defaultMax = maxMarks || 100;
    const defaultPass = passingMarks || 33;
    let configCount = 0;

    for (const a of myAssignments) {
      try {
        await ExamSubjectConfig.create({
          examId: exam._id,
          classId: a.classId,
          subjectId: a.subjectId,
          maxMarks: defaultMax,
          passingMarks: defaultPass,
          schoolId: req.schoolId,
        });
        configCount++;
      } catch (err) {
        if (err.code !== 11000) throw err; // skip duplicate
      }
    }

    res.status(201).json({
      success: true,
      message: `Test created for ${classIdSet.length} class(es) with ${configCount} subject config(s)`,
      data: exam
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get exams visible to this teacher (admin exams + own tests)
exports.getMyExams = async (req, res) => {
  try {
    const { session } = req.query;

    // ── EXAM_CONTROLLER: MARKS_ALL_ACCESS — return ALL school exams ────────────
    // EC has no TeacherSubjectAssignment rows, so we skip that filter entirely
    if (req.user.role === 'exam_controller') {
      const filter = { schoolId: req.schoolId };
      if (session) filter.session = session;
      const exams = await Exam.find(filter)
        .populate('classIds', 'name numericOrder')
        .populate('createdBy', 'firstName lastName')
        .populate('session', 'name year')
        .sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: exams });
    }

    // ── Teacher path: session is required ─────────────────────────────────────
    if (!session) {
      return res.status(400).json({ success: false, message: 'session is required' });
    }

    // Get classes this teacher teaches
    const myAssignments = await TeacherSubjectAssignment.find({
      teacherId: req.user._id,
      session,
      schoolId: req.schoolId,
    });
    const myClassIds = [...new Set(myAssignments.map(a => a.classId.toString()))];
    
    if (myClassIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Find exams that include any of teacher's classes
    const exams = await Exam.find({
      schoolId: req.schoolId,
      session,
      classIds: { $in: myClassIds },
    })
      .populate('classIds', 'name numericOrder')
      .populate('createdBy', 'firstName lastName')
      .populate('session', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ========================
// CLASS TEACHER: VIEW MY STUDENTS (supports multiple class assignments)
// ========================

exports.getMyClassStudents = async (req, res) => {
  try {
    // SECURITY: scope class-teacher lookup by schoolId
    const ctAssignments = await ClassTeacherAssignment.find({ teacherId: req.user._id, schoolId: req.schoolId })
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name isActive');

    if (!ctAssignments.length) {
      return res.status(404).json({ success: false, message: 'You are not a class teacher' });
    }

    // If specific class/section/session passed, filter to that one; else default to first
    const { classId, sectionId, session } = req.query;
    let selected = ctAssignments[0];
    if (classId && sectionId && session) {
      const match = ctAssignments.find(
        a => a.classId?._id?.toString() === classId &&
             a.sectionId?._id?.toString() === sectionId &&
             a.session?._id?.toString() === session
      );
      if (match) selected = match;
    }

    const students = await StudentProfile.find({
      classId:   selected.classId?._id,
      sectionId: selected.sectionId?._id,
      session:   selected.session?._id,
      status: 'active'
    })
      .populate('userId', 'firstName lastName email isActive')
      .sort({ rollNo: 1 });

    res.status(200).json({
      success: true,
      // All assignments for the filter dropdowns
      assignments: ctAssignments.map(a => ({
        classId:   a.classId?._id,
        className: a.classId?.name,
        sectionId: a.sectionId?._id,
        sectionName: a.sectionId?.name,
        sessionId:  a.session?._id,
        sessionName: a.session?.name,
      })),
      // Currently selected slot
      classInfo: {
        classId:   selected.classId?._id,
        class:     selected.classId?.name,
        sectionId: selected.sectionId?._id,
        section:   selected.sectionId?.name,
        sessionId: selected.session?._id,
        session:   selected.session?.name,
      },
      data: students
    });
  } catch (error) {
    logger.error('Error fetching class students', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// CLASS TEACHER: STUDENT PERFORMANCE SUMMARY
// ========================

exports.getStudentPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, sectionId, session } = req.query;

    // Verify this teacher is class teacher of that class+section+session
    const ctAssignment = await ClassTeacherAssignment.findOne({
      teacherId: req.user._id,
      ...(classId   && { classId }),
      ...(sectionId && { sectionId }),
      ...(session   && { session }),
    });
    if (!ctAssignment) {
      return res.status(403).json({ success: false, message: 'Not your class' });
    }

    // --- Attendance summary ---
    const attendanceDocs = await Attendance.find({
      classId:   ctAssignment.classId,
      sectionId: ctAssignment.sectionId,
      session:   ctAssignment.session,
      'records.studentId': studentId,
    }).select('date attendanceType subjectId records');

    let totalSessions = 0, present = 0, absent = 0, late = 0, leave = 0;
    const recentAttendance = [];

    attendanceDocs.forEach(doc => {
      const rec = doc.records.find(r => r.studentId?.toString() === studentId);
      if (!rec) return;
      totalSessions++;
      if (rec.status === 'present') present++;
      else if (rec.status === 'absent') absent++;
      else if (rec.status === 'late') late++;
      else if (rec.status === 'leave') leave++;
      recentAttendance.push({ date: doc.date, status: rec.status, type: doc.attendanceType });
    });

    // Sort recent desc, take last 10
    recentAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentSlice = recentAttendance.slice(0, 10);

    const attendancePct = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : null;

    // --- Assignment summary ---
    const assignments = await Assignment.find({
      classId:   ctAssignment.classId,
      sectionId: ctAssignment.sectionId,
      session:   ctAssignment.session,
    }).select('title dueDate subjectId createdAt').populate('subjectId', 'name');

    const studentProfile = await StudentProfile.findById(studentId).select('userId');

    let submitted = 0;
    const assignmentDetails = [];
    for (const a of assignments) {
      const submission = await Assignmentupload.findOne({
        assignmentId: a._id,
        userId: studentProfile?.userId,
      }).select('submittedAt');
      const isSubmitted = !!submission;
      if (isSubmitted) submitted++;
      assignmentDetails.push({
        title: a.title,
        subject: a.subjectId?.name,
        dueDate: a.dueDate,
        submitted: isSubmitted,
        submittedAt: submission?.submittedAt,
      });
    }

    res.status(200).json({
      success: true,
      attendance: {
        total: totalSessions,
        present,
        absent,
        late,
        leave,
        percentage: attendancePct,
        recent: recentSlice,
      },
      assignments: {
        total: assignments.length,
        submitted,
        pending: assignments.length - submitted,
        details: assignmentDetails,
      },
    });
  } catch (error) {
    logger.error('Error fetching student performance', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClassMarks = async (req, res) => {
  try {
    // SECURITY: scope class-teacher lookup by schoolId
    const ctAssignment = await ClassTeacherAssignment.findOne({ teacherId: req.user._id, schoolId: req.schoolId });
    if (!ctAssignment) {
      return res.status(404).json({ success: false, message: 'You are not a class teacher' });
    }

    const filter = {
      classId: ctAssignment.classId,
      sectionId: ctAssignment.sectionId,
      session: ctAssignment.session,
      schoolId: req.schoolId   // SECURITY: always scope marks by school
    };
    if (req.query.examId) filter.examId = req.query.examId;

    const marks = await Marks.find(filter)
      .populate('studentId', 'firstName lastName email')
      .populate('subjectId', 'name code')
      .populate('examId', 'name type')
      .populate('uploadedBy', 'firstName lastName');

    res.status(200).json({ success: true, data: marks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/teacher/template?examId=...
 *
 * Resolves the report template for a given exam using a 3-tier fallback:
 *   1. exam.templateId  (exam-specific override)
 *   2. isDefault: true  (school-wide default)
 *   3. any active template for the school (most recent upload wins)
 *
 * Always returns schema. If schema was never extracted (old template),
 * re-extracts it live from htmlContent.
 */
exports.getTemplateForExam = async (req, res) => {
  try {
    const { examId } = req.query;
    const schoolId   = req.schoolId;

    const SELECT = 'name templateSchema htmlContent isDefault createdAt';
    let template = null;
    let tier = 0;

    // ── Tier 1: exam has an explicit templateId ─────────────────────────
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      const exam = await Exam.findOne({ _id: examId, schoolId })
        .select('templateId name').lean();
      if (exam?.templateId) {
        template = await ReportTemplate.findOne({
          _id: exam.templateId, schoolId, isActive: true,
        }).select(SELECT).lean();
        if (template) tier = 1;
      }
    }

    // ── Tier 2: school default template ────────────────────────────────
    if (!template) {
      template = await ReportTemplate.findOne({ schoolId, isActive: true, isDefault: true })
        .select(SELECT).lean();
      if (template) tier = 2;
    }

    // ── Tier 3: any active template for this school ─────────────────────
    // This is the critical missing fallback — picks the most recently created template.
    if (!template) {
      template = await ReportTemplate.findOne({ schoolId, isActive: true })
        .sort({ createdAt: -1 })
        .select(SELECT).lean();
      if (template) tier = 3;
    }

    // No template at all — return gracefully with empty schema
    if (!template) {
      logger.info('[Teacher] getTemplateForExam: no template found for school', { schoolId });
      return res.status(200).json({
        success: true,
        data: { templateId: null, templateName: null, schema: null, tier: 0 },
      });
    }

    // ── Ensure schema is populated and has marks fields ────────────────────
    // Re-extract if: (a) no schema at all, (b) schema has no fields, OR
    // (c) schema has fields but none classified as 'marks' — catches old schemas
    //     that collapsed subjects[0].t1_oral to rootKey 'subjects' (category 'other').
    // (d) ANY field has no category property (stale schema from older extractor version).
    let schema = template.templateSchema;
    const schemaFields = schema?.fields || [];
    // IMPORTANT: only check field OBJECTS for marks category, NOT the marksFields[] array.
    // The marksFields[] array may have been saved by an old extractor run that correctly
    // identified marks fields by name but stored them in schema.fields with category:'other'.
    // Using marksFields.length > 0 would falsely skip re-extraction in that case.
    const hasMarksFields = schemaFields.some(f => f.category === 'marks');
    const hasStaleCategoryFields = schemaFields.some(f => !f.category || f.category === 'other');

    if (!schema || schemaFields.length === 0 || !hasMarksFields || hasStaleCategoryFields) {
      logger.info('[Teacher] getTemplateForExam: re-extracting schema', {
        name: template.name, hasMarksFields, hasStaleCategoryFields,
      });
      schema = TemplateFieldExtractor.extractAndClassify(template.htmlContent);

      // Persist the corrected schema so future calls are fast
      await ReportTemplate.findByIdAndUpdate(template._id, {
        $set: { templateSchema: schema },
      });
    }

    console.log(`[Teacher] getTemplateForExam: resolved via Tier ${tier} → "${template.name}" | marks fields: ${schema?.marksFields?.length ?? schema?.fields?.filter(f=>f.category==='marks').length ?? 0}`);

    // ── Load marksDistribution so frontend can display max marks per field ────
    // When classId is provided (EC path), scope to that class so fieldMaxMap is accurate.
    const { classId } = req.query;
    let totalMaxMarks = 100;
    let marksDistribution = [];
    let fieldMaxMap = {};
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      const configFilter = { examId, schoolId };
      if (classId && mongoose.Types.ObjectId.isValid(classId)) configFilter.classId = classId;
      const configs = await ExamSubjectConfig.find(configFilter);
      configs.forEach(cfg => {
        (cfg.marksDistribution || []).forEach(d => {
          if (d.type && fieldMaxMap[d.type.toLowerCase()] === undefined) {
            fieldMaxMap[d.type.toLowerCase()] = Number(d.maxMarks) || 0;
          }
        });
        // Also populate from legacy maxMarks/practicalMaxMarks fields
        if (!fieldMaxMap['theory'] && cfg.maxMarks) fieldMaxMap['theory'] = Number(cfg.maxMarks);
        if (!fieldMaxMap['practical'] && cfg.practicalMaxMarks) fieldMaxMap['practical'] = Number(cfg.practicalMaxMarks);
      });
      marksDistribution = Object.entries(fieldMaxMap).map(([type, maxMarks]) => ({ type, maxMarks }));
      totalMaxMarks = marksDistribution.reduce((s, d) => s + (Number(d.maxMarks) || 0), 0) || 100;
    }

    return res.status(200).json({
      success: true,
      data: {
        templateId:        template._id,
        templateName:      template.name,
        schema,
        tier,              // 1=exam-specific, 2=school-default, 3=any-active
        marksDistribution, // [{type, maxMarks}] e.g. [{type:'theory',maxMarks:80}]
        fieldMaxMap,       // {theory:80, practical:20, ...} for quick lookup
        totalMaxMarks,     // fallback cap for fields not in fieldMaxMap
      },
    });
  } catch (error) {
    logger.error('[Teacher] getTemplateForExam error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Co-Scholastic Marks (Discipline / Activity) ──────────────────────────────
const CoScholasticMark = require('../models/CoScholasticMark');
const ReportCard       = require('../models/ReportCard');

// const TEMPLATE_EXAM_TYPES = new Set(['annual', 'half_yearly', 'term1', 'term2', 'custom']);
// const TEMPLATE_SYSTEM_KEYS = new Set([
//   'name', 'firstName', 'lastName', 'middleName', 'scholarNo', 'rollNo', 'admissionNo', 'admissionNumber',
//   'pen', 'dob', 'dateOfBirth', 'gender', 'category', 'bloodGroup', 'religion', 'caste', 'nationality',
//   'className', 'sectionName', 'classSection', 'fatherName', 'motherName', 'parentName', 'address',
//   'city', 'state', 'pincode', 'phone', 'email', 'session', 'academicYear', 'year_start', 'year_end',
//   'attendance', 'attendance_str', 'attendance_total', 'attendance_present', 'attendance_absent',
//   'attendance_percentage', 'total_days', 'present_days', 'absent_days', 'grandTotal', 'grandMaxTotal',
//   'percentage', 'grade', 'rank', 'rank_number', 'totalPercentage', 'totalGrade', 'result', 'remark',
//   'remarksTerm1', 'remarksTerm2', 'isFinalized', 'promotedTo', 'heightTerm1', 'weightTerm1',
//   'heightTerm2', 'weightTerm2', 'schoolName', 'schoolAddress', 'logo', 'dise', 'estd', 'subjectCount',
// ]);
// const TEMPLATE_SYSTEM_PREFIXES = [
//   'student.', 'school.', 'class.', 'section.', 'academic.', 'summary.', 'attendance.',
//   'subjects.', 'subject.', 'marks.', 'term1.', 'term2.', 't1_', 't2_', 'sub_', 'obt_',
//   'max_', 'gt_', 'grand_', 'total_', 'percentage_', 'rank_', 'exam_', 'date_', 'teacher_',
//   'principal_', 'signature_', 'logo_',
// ];

// const normalizeTemplateKey = (value = '') =>
//   String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// const labelFromTemplateToken = (token = '') => {
//   const clean = String(token)
//     .replace(/\[[0-9]+\]/g, '')
//     .split('.').pop()
//     .replace(/_?grade$/i, '')
//     .replace(/[-_]+/g, ' ')
//     .trim();
//   return clean.replace(/\b\w/g, ch => ch.toUpperCase()) || String(token);
// };

// const isTemplateSystemToken = (token = '') => {
//   const raw = String(token).trim();
//   const normalized = normalizeTemplateKey(raw);
//   if (!raw || TEMPLATE_SYSTEM_KEYS.has(raw) || TEMPLATE_SYSTEM_KEYS.has(normalized)) return true;
//   return TEMPLATE_SYSTEM_PREFIXES.some(prefix => raw.toLowerCase().startsWith(prefix));
// };

// const mapToPlainObject = (value) => {
//   if (!value) return {};
//   if (value instanceof Map) return Object.fromEntries(value.entries());
//   if (typeof value.toObject === 'function') return value.toObject();
//   return value;
// };

// const getCoScholasticFieldsFromTemplate = (template) => {
//   if (!template?.htmlContent) return { fields: [], source: 'missing_template' };

//   const mappings = mapToPlainObject(template.fieldMappings);
//   const mappedFields = Object.entries(mappings || {})
//     .filter(([, target]) => /(^|\.|_)co_?scholastic|(^|\.|_)skills?|(^|\.|_)observations?/i.test(String(target || '')))
//     .map(([token, target], index) => {
//       const targetParts = String(target || '').split('.').filter(Boolean);
//       const labelSeed = targetParts[targetParts.length - 1] || token;
//       return {
//         key: normalizeTemplateKey(token || labelSeed),
//         label: labelFromTemplateToken(labelSeed),
//         fieldName: token,
//         order: index,
//         optional: false,
//       };
//     });
//   if (mappedFields.length) {
//     return { fields: mappedFields, source: 'field_mappings' };
//   }

//   const extraction = TemplateFieldExtractor.extractFields(template.htmlContent);
//   const directFields = [];
//   const seen = new Set();

//   (extraction.fields || []).forEach((field) => {
//     const token = field?.name || '';
//     if (!token || field.type === 'bracket_access' || isTemplateSystemToken(token)) return;
//     const key = normalizeTemplateKey(token);
//     if (!key || seen.has(key)) return;
//     seen.add(key);
//     directFields.push({
//       key,
//       label: labelFromTemplateToken(token),
//       fieldName: token,
//       order: directFields.length,
//       optional: false,
//     });
//   });

//   return {
//     fields: directFields,
//     source: directFields.length ? 'template_tokens' : 'template_loop',
//     loopDriven: (extraction.arrays || []).some(name => ['skills', 'co_scholastic', 'coscholastic', 'observations'].includes(String(name).toLowerCase())),
//   };
// };

// const describeTemplateMatch = (template) => {
//   if (!template) return 'No template matched';
//   if (template.matchReason === 'global_default' || template.matchReason === 'any_default' || template.matchReason === 'first_active') {
//     return 'Using Global Fallback Template';
//   }
//   return `Auto-matched: ${template.classGroupName || template.name}`;
// };

// const getClassTemplateContext = async ({ schoolId, classId, examType, templateId }) => {
//   const classDoc = await ClassModel.findOne({ _id: classId, schoolId }).select('_id name numericOrder').lean();
//   if (!classDoc) return { classDoc: null, templates: [], recommended: null };

//   const normalizedExamType = TEMPLATE_EXAM_TYPES.has(String(examType || '').trim())
//     ? String(examType).trim()
//     : 'annual';

//   const allTemplates = await ReportTemplate.find({
//     schoolId,
//     isActive: true,
//     templateStatus: { $ne: 'archived' },
//     $or: [
//       { templateType: normalizedExamType },
//       { templateType: 'custom' },
//       { applicableExams: normalizedExamType },
//       { applicableExams: { $size: 0 } },
//       { applicableExams: { $exists: false } },
//     ],
//   }).sort({ isDefault: -1, updatedAt: -1 }).lean();

//   const classIdStr = String(classDoc._id);
//   const numericOrder = classDoc.numericOrder;
//   const applicable = allTemplates.filter(template => {
//     const exactIds = template.applicableClassIds || [];
//     if (exactIds.length) return exactIds.some(id => String(id) === classIdStr);
//     if (template.classRangeFrom !== null && template.classRangeFrom !== undefined &&
//         template.classRangeTo !== null && template.classRangeTo !== undefined) {
//       return numericOrder !== null && numericOrder !== undefined &&
//         numericOrder >= template.classRangeFrom && numericOrder <= template.classRangeTo;
//     }
//     return true;
//   });

//   const recommended = await resolveTemplate({
//     schoolId,
//     classNumericOrder: numericOrder,
//     classId: classIdStr,
//     examType: normalizedExamType,
//     templateId: templateId || null,
//   });

//   const recommendedId = recommended?._id ? String(recommended._id) : null;
//   const finalTemplates = applicable.some(t => String(t._id) === recommendedId) || !recommended
//     ? applicable
//     : [recommended, ...applicable];

//   const templates = finalTemplates.map(template => {
//     const fieldInfo = getCoScholasticFieldsFromTemplate(template);
//     return {
//       _id: template._id,
//       name: template.name,
//       description: template.description || '',
//       templateType: template.templateType || 'custom',
//       classGroupName: template.classGroupName || '',
//       classRangeFrom: template.classRangeFrom ?? null,
//       classRangeTo: template.classRangeTo ?? null,
//       isDefault: Boolean(template.isDefault),
//       matchReason: String(template._id) === recommendedId ? recommended.matchReason : null,
//       isRecommended: String(template._id) === recommendedId,
//       badgeText: String(template._id) === recommendedId ? describeTemplateMatch(recommended) : '',
//       coScholasticFields: fieldInfo.fields,
//       fieldSource: fieldInfo.source,
//       loopDriven: Boolean(fieldInfo.loopDriven),
//     };
//   });

//   return { classDoc, templates, recommended };
// };

// /**
//  * GET /api/v1/teacher/co-scholastic/templates
//  * Query: classId, session, examType, templateId?
//  */
// exports.getCoScholasticTemplates = async (req, res) => {
//   try {
//     const { classId, session: sessionParam, examType = 'annual', templateId } = req.query;
//     if (!classId) return res.status(400).json({ success: false, message: 'classId is required' });

//     const sessionDoc = sessionParam
//       ? await AcademicSession.findOne({ _id: sessionParam, schoolId: req.schoolId }).lean()
//       : await AcademicSession.findOne({ schoolId: req.schoolId, isActive: true }).lean();
//     if (!sessionDoc) {
//       return res.status(400).json({ success: false, message: 'No active session found. Please activate an academic session.' });
//     }

//     const ctFilter = { teacherId: req.user._id, classId, schoolId: req.schoolId };
//     const ctAssignment = await ClassTeacherAssignment.findOne(ctFilter).lean();
//     if (!ctAssignment) {
//       return res.status(403).json({
//         success: false,
//         message: 'Only the designated class teacher can select co-scholastic templates for this class.',
//       });
//     }

//     const context = await getClassTemplateContext({
//       schoolId: req.schoolId,
//       classId,
//       examType,
//       templateId,
//     });

//     if (!context.classDoc) {
//       return res.status(404).json({ success: false, message: 'Class not found for this school.' });
//     }

//     const recommendedId = context.recommended?._id ? String(context.recommended._id) : null;
//     return res.json({
//       success: true,
//       sessionId: sessionDoc._id,
//       sessionName: sessionDoc.name,
//       examType,
//       classInfo: context.classDoc,
//       recommendedTemplateId: recommendedId,
//       matchReason: context.recommended?.matchReason || 'no_templates',
//       badgeText: context.recommended ? describeTemplateMatch(context.recommended) : 'No report card template configured',
//       templates: context.templates,
//     });
//   } catch (err) {
//     logger.error('[Teacher] getCoScholasticTemplates', { error: err.message });
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

/**
 * GET /api/v1/teacher/co-scholastic
 * Query: classId, sectionId, session, skills (comma-separated skill names)
 */
exports.getCoScholasticMarks = async (req, res) => {
  try {
  const { classId, sectionId, session: sessionParam } = req.query;
    const skillNames = (req.query.skills || 'Discipline,Activity,Games,Drawing,Music')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!classId) return res.status(400).json({ success: false, message: 'classId is required' });

    // ── Resolve session ──────────────────────────────────────────────────────
    const sessionDoc = sessionParam
      ? await AcademicSession.findById(sessionParam).lean()
      : await AcademicSession.findOne({ schoolId: req.schoolId, isActive: true }).lean();
    if (!sessionDoc) return res.status(400).json({ success: false, message: 'No active session found. Please create or activate an academic session.' });

    // ── Class-teacher guard — session-agnostic ────────────────────────────────
    // We search WITHOUT session so that assignments created in any session for
    // this class/section are found (common when admin copies assignments across sessions).
    const ctFilter = {
      teacherId: req.user._id,
      classId,
      schoolId: req.schoolId,
    };
    if (sectionId) ctFilter.sectionId = sectionId;

    const ctAssignment = await ClassTeacherAssignment.findOne(ctFilter).lean();
    if (!ctAssignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not the class teacher of this class/section. Only the designated class teacher can enter co-scholastic marks.',
      });
    }

    // ── Fetch students ────────────────────────────────────────────────────────
    // let selectedTemplate = null;
    // let fieldInfo = null;
    // if (templateId) {
    //   selectedTemplate = await ReportTemplate.findOne({
    //     _id: templateId,
    //     schoolId: req.schoolId,
    //     isActive: true,
    //     templateStatus: { $ne: 'archived' },
    //   }).lean();
    //   if (!selectedTemplate) {
    //     return res.status(404).json({ success: false, message: 'Selected report card template was not found or is inactive.' });
    //   }
    //   fieldInfo = getCoScholasticFieldsFromTemplate(selectedTemplate);
    // } else {
    //   const context = await getClassTemplateContext({ schoolId: req.schoolId, classId, examType });
    //   selectedTemplate = context.recommended || null;
    //   fieldInfo = selectedTemplate ? getCoScholasticFieldsFromTemplate(selectedTemplate) : null;
    // }

    // const skillFields = fieldInfo?.fields?.length
    //   ? fieldInfo.fields
    //   : (req.query.skills || '').split(',').map((s, index) => {
    //       const label = s.trim();
    //       return label ? { key: normalizeTemplateKey(label), label, fieldName: label, order: index, optional: false } : null;
    //     }).filter(Boolean);

    // if (selectedTemplate && !skillFields.length) {
    //   return res.status(422).json({
    //     success: false,
    //     message: 'The selected template does not expose any co-scholastic grade fields. Please choose another template or configure co-scholastic mappings.',
    //     template: {
    //       _id: selectedTemplate._id,
    //       name: selectedTemplate.name,
    //       fieldSource: fieldInfo?.source || 'unknown',
    //       loopDriven: Boolean(fieldInfo?.loopDriven),
    //     },
    //   });
    // }

    // const skillNames = skillFields.map(field => field.label);
    // const skillKeys = skillFields.map(field => field.key).filter(Boolean);

    const studentFilter = {
      classId,
      session: sessionDoc._id,
      schoolId: req.schoolId,
      status: 'active',
    };
    if (sectionId) studentFilter.sectionId = sectionId;

    let students = await StudentProfile.find(studentFilter)
      .select('firstName lastName rollNo scholarNo').sort({ rollNo: 1 }).lean();

    // Fallback: if the session stored on StudentProfile is the session name string
    // instead of ObjectId (legacy data), try matching by name.
    if (students.length === 0) {
      students = await StudentProfile.find({
        classId,
        session: sessionDoc.name,   // some schools store session name as string
        schoolId: req.schoolId,
        status: 'active',
        ...(sectionId ? { sectionId } : {}),
      }).select('firstName lastName rollNo scholarNo').sort({ rollNo: 1 }).lean();
    }

    const studentIds = students.map(s => s._id);

    // ── Load existing co-scholastic grades ───────────────────────────────────
    const reportCards = studentIds.length
      ? await ReportCard.find({
          studentId: { $in: studentIds },
          session: sessionDoc._id,
          schoolId: req.schoolId,
        }).select('_id studentId').lean()
      : [];

    // Also try with session name string (fallback for legacy ReportCard docs)
    const reportCards2 = (reportCards.length === 0 && studentIds.length)
      ? await ReportCard.find({
          studentId: { $in: studentIds },
          session: sessionDoc.name,
          schoolId: req.schoolId,
        }).select('_id studentId').lean()
      : [];

    const allReportCards = [...reportCards, ...reportCards2];
    const rcByStudent   = Object.fromEntries(allReportCards.map(rc => [String(rc.studentId), rc._id]));
    const rcIds         = allReportCards.map(r => r._id);

    const existingMarks = rcIds.length
      ? await CoScholasticMark.find({
          reportCardId: { $in: rcIds },
          skillName:    { $in: skillNames },
          schoolId:     req.schoolId,
        }).lean()
      : [];
    // Index: reportCardId → skillName → { grade, t1Grade, t2Grade }
     const gradeIndex = {};
    existingMarks.forEach(m => {
      const key = String(m.reportCardId);
      if (!gradeIndex[key]) gradeIndex[key] = {};
      gradeIndex[key][m.skillName] = {
        grade:   m.grade   || '',
        t1Grade: m.t1Grade || '',
        t2Grade: m.t2Grade || '',
      };
    });

    const data = students.map(st => {
      const rcId  = rcByStudent[String(st._id)] || null;
        const coScholastic = skillNames.map(skill => {
        const saved = (rcId && gradeIndex[String(rcId)]?.[skill]) || {};
        return {
          skillName: skill,
          grade:     saved.grade   || '',
          t1Grade:   saved.t1Grade || '',
          t2Grade:   saved.t2Grade || '',
        };
      });
      return {
        studentId:    st._id,
        name:         `${st.firstName || ''} ${st.lastName || ''}`.trim(),
        firstName:    st.firstName,
        lastName:     st.lastName,
        rollNo:       st.rollNo || '',
        reportCardId: rcId,
        coScholastic,
      };
    });

    return res.json({
      success: true,
      students: data,
      skills: skillNames,
      sessionId: sessionDoc._id,
      sessionName: sessionDoc.name,
    });
  } catch (err) {
    logger.error('[Teacher] getCoScholasticMarks', { error: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * POST /api/v1/teacher/co-scholastic
 * Body: { classId, sectionId, session, rows: [{ studentId, grades: { Discipline:'A', Activity:'B' } }] }
 *
 * Upserts one CoScholasticMark record per student per skill.
 * Creates a ReportCard if one doesn't exist yet (safe — won't overwrite marks).
 */
exports.saveCoScholasticMarks = async (req, res) => {
  try {
    const { classId, sectionId, session: sessionParam, templateId, examType = 'annual' } = req.body;

    // Accept both `entries` (new format) and `rows` (old format) for backward compat
    const entries = req.body.entries || req.body.rows || [];

    if (!classId || !entries.length) {
      return res.status(400).json({ success: false, message: 'classId and entries[] are required' });
    }

    // ── Resolve session ──────────────────────────────────────────────────────
    const sessionDoc = sessionParam
      ? await AcademicSession.findById(sessionParam).lean()
      : await AcademicSession.findOne({ schoolId: req.schoolId, isActive: true }).lean();
    if (!sessionDoc) return res.status(400).json({ success: false, message: 'No active session found. Please activate an academic session.' });

    // ── Class-teacher guard (session-agnostic) ───────────────────────────────
    const ctFilter = { teacherId: req.user._id, classId, schoolId: req.schoolId };
    if (sectionId) ctFilter.sectionId = sectionId;
    const ctAssignment = await ClassTeacherAssignment.findOne(ctFilter).lean();
    if (!ctAssignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not the class teacher of this class/section.',
      });
    }

    // let selectedTemplate = null;
    // let allowedFieldKeys = null;
    // if (templateId) {
    //   selectedTemplate = await ReportTemplate.findOne({
    //     _id: templateId,
    //     schoolId: req.schoolId,
    //     isActive: true,
    //     templateStatus: { $ne: 'archived' },
    //   }).lean();
    //   if (!selectedTemplate) {
    //     return res.status(404).json({ success: false, message: 'Selected report card template was not found or is inactive.' });
    //   }
    //   const fieldInfo = getCoScholasticFieldsFromTemplate(selectedTemplate);
    //   if (!fieldInfo.fields.length) {
    //     return res.status(422).json({ success: false, message: 'Selected template has no co-scholastic fields to save.' });
    //   }
    //   allowedFieldKeys = new Set();
    //   fieldInfo.fields.forEach(field => {
    //     allowedFieldKeys.add(field.key);
    //     allowedFieldKeys.add(normalizeTemplateKey(field.label));
    //     allowedFieldKeys.add(normalizeTemplateKey(field.fieldName));
    //   });
    // }

    let saved = 0;

    // entries: [{ studentId, skillName, grade }]  ← new format from frontend
    // rows:    [{ studentId, grades: { Skill: 'A' } }]  ← old format (kept for compat)
    for (const entry of entries) {
      const studentId = entry.studentId;
      if (!studentId) continue;

      const sp = await StudentProfile.findOne({ _id: studentId, schoolId: req.schoolId }).lean();
      if (!sp) continue;

      // Ensure a ReportCard exists for this student + session
      let rc = await ReportCard.findOne({
        studentId: sp._id, session: sessionDoc._id, schoolId: req.schoolId,
      });
      if (!rc) {
        // Also try session name string as fallback
        rc = await ReportCard.findOne({
          studentId: sp._id, session: sessionDoc.name, schoolId: req.schoolId,
        });
      }
      if (!rc) {
        rc = await ReportCard.create({
          studentId:   sp._id,
          classId:     sp.classId,
          sectionId:   sp.sectionId,
          session:     sessionDoc._id,
          schoolId:    req.schoolId,
          isFinalized: false,
        });
      }
      if (rc.isFinalized) continue; // locked — skip silently

      // ── New format: each entry has ONE skillName + grade (+ optional t1Grade/t2Grade) ─
       if (entry.skillName !== undefined) {
        const normalizedSkill  = String(entry.skillName || '').trim();
        const normalizedT1     = String(entry.t1Grade   || '').trim().toUpperCase();
        const normalizedT2     = String(entry.t2Grade   || '').trim().toUpperCase();
        // Overall grade: use explicit value if provided, otherwise derive from T1/T2
        const normalizedGrade  = String(entry.grade || entry.t1Grade || entry.t2Grade || '').trim().toUpperCase();
        if (!normalizedSkill) continue;
        await CoScholasticMark.findOneAndUpdate(
          { reportCardId: rc._id, skillName: normalizedSkill, schoolId: req.schoolId },
          { $set: { grade: normalizedGrade, t1Grade: normalizedT1, t2Grade: normalizedT2, studentId: sp._id } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        saved++;
        continue;
      }

      // ── Old format: entry has a grades object ─────────────────────────────
      if (entry.grades && typeof entry.grades === 'object') {
        for (const [skillName, grade] of Object.entries(entry.grades)) {
            const normalizedSkill = String(skillName || '').trim();
          const normalizedGrade = String(grade || '').trim().toUpperCase();
          if (!normalizedSkill) continue;
          await CoScholasticMark.findOneAndUpdate(
            { reportCardId: rc._id, skillName: normalizedSkill, schoolId: req.schoolId },
            { $set: { grade: normalizedGrade, studentId: sp._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          saved++;
        }
      }
    }

    return res.json({ success: true, message: `Saved ${saved} co-scholastic grade(s).`, saved });
  } catch (err) {
    logger.error('[Teacher] saveCoScholasticMarks', { error: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ─── Template Skills Extractor (for Co-Scholastic page) ──────────────────────


/**
 * GET /api/v1/teacher/co-scholastic/skills?classId=&session=
 *
 * Returns the ordered list of co-scholastic skill names the teacher should
 * enter grades for.  Priority:
 *   1. Distinct skillNames already saved in the DB for this school (most authoritative)
 *   2. If the active template has a {{#co_scholastic}} loop → return school defaults
 *      (loop-driven templates store skill names as DATA, not as HTML tokens)
 *   3. Flat-token extraction from the template HTML (rarely hits this branch)
 *   4. Hard default list
 *
 * NOTE: extractFields() returns an OBJECT {fields, simple, arrays, …} — never an array.
 */
exports.getCoScholasticSkills = async (req, res) => {
  const DEFAULT_SKILLS = ['Discipline', 'Activity', 'Games', 'Drawing', 'Music'];
  try {
    // ── 1. DB-first: fetch distinct skillNames saved for this school ──────────
    // distinct() returns a plain array — filter out empties and reserved tokens
    const RESERVED = new Set([
      'overall','overalltotal','t1','t2','element','remarks','remark',
      'promotedclass','promoted','date','total','rank','result','grade',
      'signature','principal','teacher','elements','dates','totals',
    ]);
    const cleanDb = (await CoScholasticMark.distinct('skillName', { schoolId: req.schoolId }))
      .filter(s => {
        if (!s || typeof s !== 'string') return false;
        const norm = s.toLowerCase().replace(/[^a-z0-9]/g, '');
        return !RESERVED.has(norm);
      })
      .sort();

    if (cleanDb.length > 0) {
      return res.json({ success: true, skills: cleanDb, source: 'database' });
    }

    // ── 2. Find the active template for this school ───────────────────────────
    const template = await ReportTemplate.findOne({ schoolId: req.schoolId, isActive: true })
      .sort({ updatedAt: -1 }).lean()
      || await ReportTemplate.findOne({ schoolId: req.schoolId }).sort({ updatedAt: -1 }).lean();

    if (!template?.htmlContent) {
      return res.json({ success: true, skills: DEFAULT_SKILLS, source: 'defaults' });
    }

    // ── 3. Loop-driven template check ─────────────────────────────────────────
    // If the template uses {{#co_scholastic}} the skill names are stored as DATA
    // (not embedded as HTML tokens), so token extraction gives no useful signal.
    const hasCoScholasticLoop = /\{\{#co_?scholastic\}\}/i.test(template.htmlContent);
    if (hasCoScholasticLoop) {
      return res.json({
        success: true,
        skills:  DEFAULT_SKILLS,
        source:  'template_loop',
        templateName: template.name || '',
      });
    }

    // ── 4. Flat-token extraction ───────────────────────────────────────────────
    // extractFields() returns { fields, simple, arrays, objects, … } — NOT an array.
    const extracted = TemplateFieldExtractor.extractFields(template.htmlContent);
    // .simple is already a deduplicated array of bare token name strings
    const simpleTokens = Array.isArray(extracted.simple) ? extracted.simple : [];

    const CO_SCHOLASTIC_KEYWORDS = [
      'discipline', 'activity', 'games', 'drawing', 'music', 'dance', 'sports',
      'punctuality', 'behaviour', 'behavior', 'neatness', 'regularity', 'confidence',
      'leadership', 'communication', 'hygiene', 'concentration', 'crafts',
      'yoga', 'scouting', 'elocution', 'debate', 'participation',
    ];
    const SYSTEM_PREFIXES = [
      'student', 'school', 'class', 'section', 'roll', 'admission', 'scholar',
      'academic', 'session', 'exam', 'date', 'rank', 'result', 'grade', 'grand',
      'total', 'percentage', 'subjects', 'subject', 'promoted', 'height', 'weight',
      'remark', 'teacher', 'principal', 'signature', 'logo', 'name', 'father',
      'mother', 'guardian', 'dob', 'address', 'phone', 'co_scholastic',
    ];

    const detectedSkills = simpleTokens.filter(token => {
      const t = token.toLowerCase().replace(/[^a-z]/g, '');
      const isSystem = SYSTEM_PREFIXES.some(p => t.startsWith(p.replace(/[^a-z]/g, '')));
      if (isSystem) return false;
      return CO_SCHOLASTIC_KEYWORDS.some(kw => t.includes(kw));
    }).map(t => t.charAt(0).toUpperCase() + t.slice(1));

    const skills = detectedSkills.length > 0
      ? [...new Set(detectedSkills)]
      : DEFAULT_SKILLS;

    return res.json({
      success: true,
      skills,
      source:       detectedSkills.length > 0 ? 'template' : 'defaults',
      templateName: template.name || '',
    });

  } catch (err) {
    logger.error('[Teacher] getCoScholasticSkills', { error: err.message, stack: err.stack });
    // Never 500 the UI — return safe defaults
    return res.json({ success: true, skills: ['Discipline', 'Activity', 'Games', 'Drawing', 'Music'], source: 'defaults' });
  }
};


