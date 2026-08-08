const {
  AcademicSession,
  ClassModel,
  SectionModel,
  SubjectMaster,
  ClassSubjectMap,
  TeacherSubjectAssignment,
  ClassTeacherAssignment,
} = require('../../src/modules/academics');
const {
  Exam,
  ExamSubjectConfig,
  MarksModel: Marks,
  MarksAuditLog,
} = require('../../src/modules/examination');
const StudentProfile = require('../../src/modules/people/models/StudentProfile');
const TeacherProfile = require('../../src/modules/people/models/TeacherProfile');
const { User } = require('../../src/modules/identity');
const Leave = require('../../src/modules/communication').Leave;
const logger = require('../../src/core/logging/logger.js');

// ── Phase 2: Notification imports ────────────────────────────────────────────
const {
  createInAppNotification,
  sendEmailNotification,
} = require('../../src/modules/notifications').notificationService;
const { scheduleMarksDeadlineReminder } = require('../../src/modules/notifications').scheduleNotifications;

// ========================
// SESSION MANAGEMENT
// ========================

// ========================
// CLASS MANAGEMENT
// ========================

// ========================
// SECTION MANAGEMENT
// ========================

exports.createSection = async (req, res) => {
  try {
    const { name, classId, session } = req.body;
    const section = await SectionModel.create({ name, classId, session, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Section created', data: section });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This section already exists in this class' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBulkSections = async (req, res) => {
  try {
    const { names, classId, session } = req.body;
    // names is a comma-separated string like "A, B, C"
    const nameList = names.split(',').map(n => n.trim()).filter(n => n.length > 0);

    if (nameList.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one section name is required' });
    }

    const created = [];
    const errors = [];

    for (const name of nameList) {
      try {
        const section = await SectionModel.create({ name, classId, session, schoolId: req.schoolId });
        created.push(section);
      } catch (err) {
        if (err.code === 11000) {
          errors.push(`"${name}" already exists`);
        } else {
          errors.push(`"${name}": ${err.message}`);
        }
      }
    }

    const message = created.length > 0
      ? `${created.length} section(s) created${errors.length > 0 ? `. Skipped: ${errors.join(', ')}` : ''}`
      : `No sections created. ${errors.join(', ')}`;

    res.status(created.length > 0 ? 201 : 400).json({
      success: created.length > 0,
      message,
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSections = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.session) filter.session = req.query.session;
    const sections = await SectionModel.find(filter)
      .populate('classId', 'name numericOrder')
      .populate('session', 'name');
    res.status(200).json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const section = await SectionModel.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.status(200).json({ success: true, message: 'Section updated', data: section });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const sectionId = req.params.id;
    // SECURITY: scope by schoolId
    const section = await SectionModel.findOne({ _id: sectionId, schoolId: req.schoolId });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    // Dependency checks — scoped to school
    const [studentCount, teacherAssignCount, classTeacherCount] = await Promise.all([
      StudentProfile.countDocuments({ sectionId, schoolId: req.schoolId }),
      TeacherSubjectAssignment.countDocuments({ sectionId, schoolId: req.schoolId }),
      ClassTeacherAssignment.countDocuments({ sectionId, schoolId: req.schoolId })
    ]);

    const deps = [];
    if (studentCount > 0) deps.push(`${studentCount} student(s)`);
    if (teacherAssignCount > 0) deps.push(`${teacherAssignCount} teacher-subject assignment(s)`);
    if (classTeacherCount > 0) deps.push(`${classTeacherCount} class teacher assignment(s)`);

    if (deps.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete section. Dependencies: ${deps.join(', ')}. Remove them first.`
      });
    }

    await SectionModel.findOneAndDelete({ _id: sectionId, schoolId: req.schoolId });
    res.status(200).json({ success: true, message: 'Section deleted' });
  } catch (error) {
    return next(error);
  }
};

// ========================
// SUBJECT MANAGEMENT
// ========================

exports.createSubject = async (req, res) => {
  try {
    const { name, code, type } = req.body;
    const subject = await SubjectMaster.create({ name, code, type, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Subject created', data: subject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject with this code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await SubjectMaster.find({ schoolId: req.schoolId }).sort({ name: 1 });
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await SubjectMaster.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.status(200).json({ success: true, message: 'Subject updated', data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subjectId = req.params.id;
    // SECURITY: scope by schoolId
    const subject = await SubjectMaster.findOne({ _id: subjectId, schoolId: req.schoolId });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    // Dependency checks — scoped to school
    const [mappingCount, teacherAssignCount] = await Promise.all([
      ClassSubjectMap.countDocuments({ subjectId, schoolId: req.schoolId }),
      TeacherSubjectAssignment.countDocuments({ subjectId, schoolId: req.schoolId })
    ]);

    const deps = [];
    if (mappingCount > 0) deps.push(`${mappingCount} class-subject mapping(s)`);
    if (teacherAssignCount > 0) deps.push(`${teacherAssignCount} teacher assignment(s)`);

    if (deps.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete subject. Dependencies: ${deps.join(', ')}. Remove them first.`
      });
    }

    await SubjectMaster.findOneAndDelete({ _id: subjectId, schoolId: req.schoolId });
    res.status(200).json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    return next(error);
  }
};

// ========================
// CLASS-SUBJECT MAPPING
// ========================

exports.mapSubjectToClass = async (req, res) => {
  try {
    const { classId, subjectId, session } = req.body;
    const mapping = await ClassSubjectMap.create({ classId, subjectId, session, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Subject mapped to class', data: mapping });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This subject is already mapped to this class' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClassSubjects = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.session) filter.session = req.query.session;
    const mappings = await ClassSubjectMap.find(filter)
      .populate('classId', 'name numericOrder')
      .populate('subjectId', 'name code type')
      .populate('session', 'name');
    res.status(200).json({ success: true, data: mappings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeClassSubjectMapping = async (req, res) => {
  try {
    const mapping = await ClassSubjectMap.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!mapping) return res.status(404).json({ success: false, message: 'Mapping not found' });

    const teacherAssignCount = await TeacherSubjectAssignment.countDocuments({
      classId: mapping.classId, subjectId: mapping.subjectId, session: mapping.session, schoolId: req.schoolId
    });
    if (teacherAssignCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove mapping. ${teacherAssignCount} teacher assignment(s) depend on it. Remove them first.`
      });
    }
    await ClassSubjectMap.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Mapping removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// TEACHER-SUBJECT ASSIGNMENT
// ========================

exports.assignTeacherToSubject = async (req, res) => {
  try {
    const { teacherId, subjectId, classId, sectionId, session } = req.body;
    const teacher = await User.findOne({ _id: teacherId, schoolId: req.schoolId });
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID' });
    }
    const assignment = await TeacherSubjectAssignment.create({
      teacherId, subjectId, classId, sectionId, session, schoolId: req.schoolId
    });
    res.status(201).json({ success: true, message: 'Teacher assigned to subject', data: assignment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This teacher is already assigned to this subject in this class/section' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherAssignments = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };
    if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.session) filter.session = req.query.session;
    const assignments = await TeacherSubjectAssignment.find(filter)
      .populate('teacherId', 'firstName lastName email')
      .populate('subjectId', 'name code')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name');
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeTeacherAssignment = async (req, res) => {
  try {
    const assignment = await TeacherSubjectAssignment.findOneAndDelete({ _id: req.params.id, schoolId: req.schoolId });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(200).json({ success: true, message: 'Teacher assignment removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// CLASS TEACHER ASSIGNMENT
// ========================

exports.assignClassTeacher = async (req, res) => {
  try {
    const { teacherId, classId, sectionId, session } = req.body;
    const teacher = await User.findOne({ _id: teacherId, schoolId: req.schoolId });
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID' });
    }
    const assignment = await ClassTeacherAssignment.create({
      teacherId, classId, sectionId, session, schoolId: req.schoolId
    });
    res.status(201).json({ success: true, message: 'Class teacher assigned', data: assignment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A class teacher is already assigned to this class/section' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClassTeachers = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };
    if (req.query.session) filter.session = req.query.session;
    if (req.query.classId) filter.classId = req.query.classId;
    const assignments = await ClassTeacherAssignment.find(filter)
      .populate('teacherId', 'firstName lastName email')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name');
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeClassTeacher = async (req, res) => {
  try {
    const assignment = await ClassTeacherAssignment.findOneAndDelete({ _id: req.params.id, schoolId: req.schoolId });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(200).json({ success: true, message: 'Class teacher assignment removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// EXAM MANAGEMENT
// ========================

exports.createExam = async (req, res) => {
  try {
    const {
      name, type, description, session, scope, classIds,
      startDate, endDate, maxMarks, passingMarks,
      // NEW: marks distribution support
      // defaultDistribution: array of {type, label, maxMarks} applied to all classes
      // classWiseDistribution: { [classId]: [{type, label, maxMarks}] } for overrides
      defaultDistribution,
      classWiseDistribution,
    } = req.body;

    if (!session) {
      return res.status(400).json({ success: false, message: 'session is required' });
    }

    // Determine which classes to include
    let selectedClassIds = classIds || [];
    if (scope === 'all') {
      const allClasses = await ClassModel.find({ session, schoolId: req.schoolId });
      selectedClassIds = allClasses.map(c => c._id);
    }

    if (selectedClassIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one class is required' });
    }

    const uniqueClassIds = [...new Set(selectedClassIds.map((id) => String(id)))];

    // Create exam
    const exam = await Exam.create({
      name, type, description, session,
      classIds: uniqueClassIds,
      startDate, endDate,
      templateId: req.body.templateId || null,
      createdBy: req.user._id,
      createdByRole: 'admin',
      schoolId: req.schoolId,
    });

    // Compute totalMaxMarks from distribution (or fallback to legacy maxMarks)
    const computeTotalFromDist = (dist) =>
      Array.isArray(dist) && dist.length > 0
        ? dist.reduce((sum, d) => sum + (Number(d.maxMarks) || 0), 0)
        : null;

    const defaultMax  = maxMarks  || 100;
    const defaultPass = passingMarks || 33;
    let totalConfigs  = 0;

    for (const cid of uniqueClassIds) {
      // Resolve marks distribution for this class
      const classDistribution =
        classWiseDistribution?.[cid] ||   // class-specific override
        defaultDistribution ||             // global default distribution
        null;

      // Compute the theory/total max from distribution
      const distTotal = computeTotalFromDist(classDistribution);
      const effectiveMax  = distTotal ?? defaultMax;

      // Legacy field: maxMarks = total if no distribution, else theory component max
      const theoryEntry = classDistribution?.find(d => d.type === 'theory');
      const legacyMax   = theoryEntry ? Number(theoryEntry.maxMarks) : effectiveMax;
      const legacyPr    = classDistribution?.find(d => d.type === 'practical')?.maxMarks || 0;
      const legacyPj    = classDistribution?.find(d => d.type === 'project')?.maxMarks   || 0;

      const mappings = await ClassSubjectMap.find({ classId: cid, session, schoolId: req.schoolId });
      for (const mapping of mappings) {
        try {
          await ExamSubjectConfig.create({
            examId:    exam._id,
            classId:   cid,
            subjectId: mapping.subjectId,
            maxMarks:  legacyMax,
            passingMarks: defaultPass,
            practicalMaxMarks: legacyPr,
            projectMaxMarks:   legacyPj,
            marksDistribution: classDistribution || [],
            schoolId:  req.schoolId,
          });
          totalConfigs++;
        } catch (err) {
          if (err.code !== 11000) throw err; // skip duplicates
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Exam created with ${uniqueClassIds.length} class(es) and ${totalConfigs} subject config(s)`,
      data: exam
    });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const School = require('../../src/modules/tenancy').School;
        const school = await School.findById(req.schoolId).select('name').lean();
        const schoolName = school?.name || 'School';

        // Notify all students about the upcoming exam
        const studentsInClasses = await StudentProfile.find({
          schoolId:  req.schoolId,
          classId:   { $in: uniqueClassIds },
          status:    'active',
        }).select('userId').lean();

        const studentUserIds = studentsInClasses.map(s => s.userId).filter(Boolean);
        if (studentUserIds.length > 0) {
          const { notifyMultipleUsers } = require('../../src/modules/notifications').notificationService;
          const fromDate = exam.startDate
            ? new Date(exam.startDate).toLocaleDateString('en-IN') : '';
          await notifyMultipleUsers(studentUserIds, {
            schoolId: req.schoolId,
            type:     'exam',
            title:    `Exam Scheduled — ${exam.name}`,
            message:  `${exam.name} has been scheduled${fromDate ? ` from ${fromDate}` : ''}. Please prepare accordingly.`,
            link:     '/student/marks',
            metadata: { examId: exam._id, examName: exam.name, startDate: exam.startDate },
          });
        }

        // Queue marks-entry deadline reminders for assigned teachers (2 days before endDate)
        if (exam.endDate) {
          const reminderDate = new Date(exam.endDate);
          reminderDate.setDate(reminderDate.getDate() - 2); // 2 days before

          // Find all teachers assigned to subjects for these classes
          const assignments = await TeacherSubjectAssignment.find({
            schoolId:  req.schoolId,
            classId:   { $in: uniqueClassIds },
            session:   exam.session,
          }).populate('teacherId', '_id firstName lastName email').lean();

          await Promise.allSettled(assignments.map(async (tsa) => {
            const teacher = tsa.teacherId;
            if (!teacher?.email) return;

            // Find subject name for this assignment
            const subjectDoc = await SubjectMaster
              .findById(tsa.subjectId).select('name').lean();
            const subjectName = subjectDoc?.name || 'your subject';

            await scheduleMarksDeadlineReminder({
              schoolId:      String(req.schoolId),
              teacherUserId: String(teacher._id),
              teacherEmail:  teacher.email,
              teacherName:   `${teacher.firstName} ${teacher.lastName}`,
              examName:      exam.name,
              subjectName,
              daysLeft:      2,
              schoolName,
              delayUntil:    reminderDate,
            });
          }));
        }
      } catch (notifErr) {
        logger.warn('[Notif] Exam created notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllExams = async (req, res) => {
  try {
    const { session, classId, excludeCompleted } = req.query;
    if (!session) {
      return res.status(400).json({ success: false, message: 'session is required' });
    }
    const filter = { schoolId: req.schoolId, session };
    // classId is optional — when provided, filter to exams that include that class
    if (classId) filter.classIds = classId;
    // excludeCompleted: when true, filter out exams with evaluationStatus = 'completed'
    // This is used by OASES Upload Queue to only show exams that can still be evaluated
    if (excludeCompleted === 'true') {
      filter.evaluationStatus = { $ne: 'completed' };
    }
    const exams = await Exam.find(filter)
      .populate('session', 'name')
      .populate('classIds', 'name numericOrder')
      .populate('createdBy', 'firstName lastName')
      .populate('templateId', 'name templateType isDefault')
      .sort({ startDate: 1, createdAt: 1, name: 1 });
    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, schoolId: req.schoolId })
      .populate('session', 'name')
      .populate('classIds', 'name numericOrder')
      .populate('createdBy', 'firstName lastName')
      .populate('templateId', 'name templateType isDefault');
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const existingExam = await Exam.findOne({ _id: req.params.id, schoolId: req.schoolId }).select('_id evaluationLocked');
    if (!existingExam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (existingExam.evaluationLocked) {
      return res.status(400).json({ success: false, message: 'Exam is locked after evaluation' });
    }

    const allowed = { name: req.body.name, type: req.body.type, description: req.body.description, startDate: req.body.startDate, endDate: req.body.endDate, status: req.body.status };
    Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      allowed,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.status(200).json({ success: true, message: 'Exam updated', data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, schoolId: req.schoolId });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    // SECURITY: scope cascade deletes to current school (FIX 11C)
    await Promise.all([
      ExamSubjectConfig.deleteMany({ examId: exam._id, schoolId: req.schoolId }),
      Marks.deleteMany({ examId: exam._id, schoolId: req.schoolId }),
      MarksAuditLog.deleteMany({ examId: exam._id, schoolId: req.schoolId })
    ]);
    res.status(200).json({ success: true, message: 'Exam and all related data deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.startEvaluation = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.evaluationStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Evaluation is already completed' });
    }

    exam.evaluationStatus = 'in_progress';
    await exam.save();

    res.status(200).json({ success: true, message: 'Evaluation started', data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.completeEvaluation = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    exam.evaluationStatus = 'completed';
    exam.evaluationLocked = true;
    await exam.save();

    res.status(200).json({ success: true, message: 'Evaluation completed and locked', data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// EXAM SUBJECT CONFIG
// ========================

exports.addExamSubject = async (req, res) => {
  try {
    const { examId, classId, subjectId, maxMarks, passingMarks, examDate } = req.body;
    const config = await ExamSubjectConfig.create({ examId, classId, subjectId, maxMarks, passingMarks, examDate, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Subject added to exam', data: config });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This subject is already configured for this class in this exam' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExamSubjects = async (req, res) => {
  try {
    const filter = { examId: req.params.examId, schoolId: req.schoolId };
    if (req.query.classId) filter.classId = req.query.classId;
    const configs = await ExamSubjectConfig.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name numericOrder')
      .populate('examId', 'name type');
    res.status(200).json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExamSubject = async (req, res) => {
  try {
    const { maxMarks, passingMarks, examDate, marksDistribution } = req.body;

    // Build the update object
    const update = { maxMarks, passingMarks, examDate };

    // If a distribution array is provided, derive legacy fields from it too
    if (Array.isArray(marksDistribution)) {
      update.marksDistribution = marksDistribution;
      // Keep legacy fields in sync
      const theoryEntry = marksDistribution.find(d => d.type === 'theory');
      const practEntry  = marksDistribution.find(d => d.type === 'practical');
      const projEntry   = marksDistribution.find(d => d.type === 'project');
      if (theoryEntry) update.maxMarks          = Number(theoryEntry.maxMarks);
      if (practEntry)  update.practicalMaxMarks = Number(practEntry.maxMarks);
      if (projEntry)   update.projectMaxMarks   = Number(projEntry.maxMarks);
      // Also set maxMarks to total if no explicit theory component
      if (!theoryEntry && marksDistribution.length > 0) {
        update.maxMarks = marksDistribution.reduce((s, d) => s + (Number(d.maxMarks) || 0), 0);
      }
    }

    // Remove undefined keys
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

    const config = await ExamSubjectConfig.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      update,
      { new: true, runValidators: true }
    );
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });
    res.status(200).json({ success: true, message: 'Config updated', data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeExamSubject = async (req, res) => {
  try {
    const config = await ExamSubjectConfig.findOneAndDelete({ _id: req.params.id, schoolId: req.schoolId });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });
    res.status(200).json({ success: true, message: 'Subject removed from exam' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// MARKS AUDIT LOG
// ========================

exports.getMarksAuditLog = async (req, res, next) => {
  try {
    // SECURITY: Always scope to current school
    const filter = { schoolId: req.schoolId };
    if (req.query.session) filter.session = req.query.session;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.uploadedBy) filter.uploadedBy = req.query.uploadedBy;
    if (req.query.examId) filter.examId = req.query.examId;

    const logs = await MarksAuditLog.find(filter)
      .populate('examId', 'name type')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('subjectId', 'name code')
      .populate('uploadedBy', 'firstName lastName')
      .populate('session', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return next(error);
  }
};

// ========================
// TEACHER LEAVE MANAGEMENT (Admin approves teacher leaves)
// ========================

exports.getTeacherLeaves = async (req, res) => {
  try {
    const filter = { role: 'teacher', schoolId: req.schoolId };
    if (req.query.status) filter.status = req.query.status;

    const leaves = await Leave.find(filter)
      .populate('appliedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    // FIX 11D: Removed console.log('leaves', leaves) — leaks PII to server logs
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveTeacherLeave = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }
    const leave = await Leave.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      { status, approvedBy: req.user._id },
      { new: true }
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.status(200).json({ success: true, message: `Leave ${status}`, data: leave });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
        const School = require('../../src/modules/tenancy').School;
        const school = await School.findById(req.schoolId).select('name').lean();
        const schoolName = school?.name || 'School';

        const teacherUser = await User.findById(leave.appliedBy)
          .select('firstName lastName email').lean();
        if (!teacherUser) return;

        const teacherName  = `${teacherUser.firstName} ${teacherUser.lastName}`;
        const approverName = `${req.user.firstName} ${req.user.lastName}`;
        const isApproved   = leave.status === 'approved';
        const fromDate     = new Date(leave.startDate).toLocaleDateString('en-IN');
        const toDate       = new Date(leave.endDate).toLocaleDateString('en-IN');

        // In-app to teacher
        await createInAppNotification({
          userId:          teacherUser._id,
          schoolId:        req.schoolId,
          type:            'leave',
          title:           `Leave ${isApproved ? 'Approved' : 'Rejected'}`,
          message:         `Your leave request (${fromDate} to ${toDate}) has been ${leave.status} by ${approverName}.`,
          link:            '/teacher/my-leaves',
          triggeredBy:     req.user._id,
          triggeredByName: approverName,
          metadata:        { status: leave.status, fromDate, toDate, approverName },
        });

        // Email to teacher
        const { leaveDecisionTemplate } = require('../../src/modules/notifications').emailTemplates;
        const { subject, html } = leaveDecisionTemplate({
          applicantName:  teacherName,
          leaveType:      leave.leaveType || 'Leave',
          fromDate,
          toDate,
          status:         leave.status.toUpperCase(),
          reason:         leave.approvalRemarks || '',
          approvedByName: approverName,
          schoolName,
          loginUrl,
        });
        await sendEmailNotification({ to: teacherUser.email, subject, html });
      } catch (notifErr) {
        logger.warn('[Notif] Teacher leave decision notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// DASHBOARD ANALYTICS
// ========================

exports.getDashboardStats = async (req, res) => {
  try {
    const sid = req.schoolId;
    const activeSession = await AcademicSession.findOne({ isActive: true, schoolId: sid });

    const [totalStudents, totalTeachers, totalClasses, totalSubjects] = await Promise.all([
      StudentProfile.countDocuments(activeSession ? { session: activeSession._id, status: 'active', schoolId: sid } : { status: 'active', schoolId: sid }),
      TeacherProfile.countDocuments({ status: 'active', schoolId: sid }),
      ClassModel.countDocuments(activeSession ? { session: activeSession._id, schoolId: sid } : { schoolId: sid }),
      SubjectMaster.countDocuments({ schoolId: sid })
    ]);

    const recentStudents = await StudentProfile.find({ schoolId: sid, isDeleted: { $ne: true } })
      .populate('userId', 'firstName lastName email')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const pendingLeaves = await Leave.countDocuments({ role: 'teacher', status: 'pending', schoolId: sid });

    res.status(200).json({
      success: true,
      data: { totalStudents, totalTeachers, totalClasses, totalSubjects, pendingLeaves, activeSession: activeSession ? activeSession.name : 'None', recentStudents }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Dashboard Analytics (charts) ──────────────────────────────────────────────
// GET /api/v1/admin/dashboard/analytics
// Returns: admissionTrend, attendanceTrend, feesCollection — all school-scoped
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const sid         = req.schoolId;
    const Attendance  = require('../../src/modules/attendance/models/attendance');
    const { FeeReceipt } = require('../../src/modules/fees');
    const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAY_NAMES    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const now          = new Date();

    // ─── Build 6-month window ─────────────────────────────────────────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const months6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTH_LABELS[d.getMonth()] };
    });

    // ─── 1. Admission Trend ───────────────────────────────────────────────
    const admRaw = await StudentProfile.aggregate([
      { $match: { schoolId: sid, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort:  { '_id.year': 1, '_id.month': 1 } },
    ]);
    const admMap = {};
    admRaw.forEach(a => { admMap[`${a._id.year}-${a._id.month}`] = a.count; });
    const admissionTrend = months6.map(m => ({
      month: m.label,
      Admissions: admMap[`${m.year}-${m.month}`] || 0,
    }));

    // ─── 2. Attendance Trend — last 7 days ───────────────────────────────
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const attDocs = await Attendance.find({ schoolId: sid, date: { $gte: sevenDaysAgo } })
      .select('date records').lean();

    const dayMap = {};
    attDocs.forEach(doc => {
      const key = new Date(doc.date).toISOString().slice(0, 10);
      if (!dayMap[key]) dayMap[key] = { present: 0, absent: 0, late: 0, total: 0 };
      doc.records.forEach(r => {
        dayMap[key].total++;
        if (r.status === 'present')      dayMap[key].present++;
        else if (r.status === 'absent')  dayMap[key].absent++;
        else if (r.status === 'late')    dayMap[key].late++;
      });
    });

    const attendanceTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const key  = d.toISOString().slice(0, 10);
      const slot = dayMap[key] || { present: 0, absent: 0, late: 0, total: 0 };
      return {
        day:        DAY_NAMES[d.getDay()],
        date:       key,
        Present:    slot.total > 0 ? Math.round(((slot.present + slot.late) / slot.total) * 100) : 0,
        Absent:     slot.total > 0 ? Math.round((slot.absent  / slot.total) * 100) : 0,
        total:      slot.total,
        hasData:    slot.total > 0,
      };
    });

    // ─── 3. Fees Collection — last 6 months ──────────────────────────────
    const feesRaw = await FeeReceipt.aggregate([
      { $match: { schoolId: sid, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, collected: { $sum: '$amount' } } },
      { $sort:  { '_id.year': 1, '_id.month': 1 } },
    ]);
    const feesMap = {};
    feesRaw.forEach(f => { feesMap[`${f._id.year}-${f._id.month}`] = f.collected; });
    const feesCollection = months6.map(m => ({
      month:     m.label,
      Collected: feesMap[`${m.year}-${m.month}`] || 0,
    }));

    // ─── 4. Staff Snapshot — biometric today (FacultyAttendance) ─────────
    const FacultyAttendance = require('../../src/modules/attendance/models/FacultyAttendance');
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86400000);
    const todayStaff = await FacultyAttendance.find({ schoolId: sid, date: { $gte: todayStart, $lt: todayEnd } })
      .select('status').lean();
    const staffSnapshot = {
      presentToday:  todayStaff.filter(r => r.status === 'present' || r.status === 'late').length,
      absentToday:   todayStaff.filter(r => r.status === 'absent').length,
      lateToday:     todayStaff.filter(r => r.status === 'late').length,
      halfDayToday:  todayStaff.filter(r => r.status === 'half_day').length,
      onLeaveToday:  todayStaff.filter(r => r.status === 'on_leave').length,
      totalRecorded: todayStaff.length,
      pendingLeaves: await Leave.countDocuments({ role: 'teacher', status: 'pending', schoolId: sid }),
    };

    // ─── 5. Fees Snapshot ────────────────────────────────────────────────
    const StudentFee = require('../../src/modules/fees').StudentFee;
    const [recentPayments, defaultersCount, classWisePending] = await Promise.all([
      FeeReceipt.find({ schoolId: sid }).sort({ createdAt: -1 }).limit(5)
        .populate({ path: 'studentId', select: 'firstName lastName classId', populate: { path: 'classId', select: 'name' } })
        .select('amount paymentMode studentId createdAt').lean(),
      StudentFee.countDocuments({ schoolId: sid, status: { $in: ['pending', 'partial'] }, totalDue: { $gt: 0 } }),
      StudentFee.aggregate([
        { $match: { schoolId: sid, status: { $in: ['pending', 'partial'] }, totalDue: { $gt: 0 } } },
        { $lookup: { from: 'studentprofiles', localField: 'studentId', foreignField: '_id', as: 'stu' } },
        { $unwind: { path: '$stu', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$stu.classId', count: { $sum: 1 }, totalDue: { $sum: '$totalDue' } } },
        { $lookup: { from: 'classmodels', localField: '_id', foreignField: '_id', as: 'cls' } },
        { $unwind: { path: '$cls', preserveNullAndEmptyArrays: true } },
        { $project: { className: { $ifNull: ['$cls.name', 'Unknown'] }, count: 1, totalDue: 1 } },
        { $sort: { totalDue: -1 } }, { $limit: 5 },
      ]),
    ]);
    const feesSnapshot = { recentPayments, defaultersCount, classWisePending };

    // ─── 6. Recent Activity Timeline ─────────────────────────────────────
    const [recStudents, recTeachers, recFees, recMarks] = await Promise.all([
      StudentProfile.find({ schoolId: sid }).sort({ createdAt: -1 }).limit(3).select('firstName lastName createdAt').lean(),
      TeacherProfile.find({ schoolId: sid }).sort({ createdAt: -1 }).limit(3).select('firstName lastName createdAt').lean(),
      FeeReceipt.find({ schoolId: sid }).sort({ createdAt: -1 }).limit(3)
        .populate({ path: 'studentId', select: 'firstName lastName' }).select('amount studentId createdAt').lean(),
      MarksAuditLog.find({ schoolId: sid }).sort({ createdAt: -1 }).limit(3)
        .populate('examId', 'name').populate('uploadedBy', 'firstName lastName').select('examId uploadedBy createdAt').lean(),
    ]);
    const recentActivity = [
      ...recStudents.map(s => ({ type: 'student_added',  label: `${s.firstName} ${s.lastName} enrolled`,                                             createdAt: s.createdAt })),
      ...recTeachers.map(t => ({ type: 'teacher_added',  label: `${t.firstName} ${t.lastName} added as teacher`,                                     createdAt: t.createdAt })),
      ...recFees.map(f     => ({ type: 'fee_paid',       label: `₹${(f.amount||0).toLocaleString()} received from ${f.studentId?.firstName||'student'}`, createdAt: f.createdAt })),
      ...recMarks.map(m    => ({ type: 'marks_updated',  label: `Marks updated for ${m.examId?.name||'exam'}`,                                       createdAt: m.createdAt })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    res.json({ success: true, data: { admissionTrend, attendanceTrend, feesCollection, staffSnapshot, feesSnapshot, recentActivity } });
  } catch (err) {
    console.error('[getDashboardAnalytics]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================
// KNOWLEDGE CENTER (ADMIN)
// ========================
const Knowledgecenter = require('../../src/modules/communication').Knowledgecenter;

exports.getKnowledgeCenterMaterials = async (req, res, next) => {
  try {
    // SECURITY: always scope to this school's materials
    const filter = { schoolId: req.schoolId };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.teacherId) filter.teacherid = req.query.teacherId;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const materials = await Knowledgecenter.find(filter)
      .populate('teacherid', 'firstName lastName')
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ createdAt: -1 });

    const enriched = materials.map(m => ({
      ...m.toObject(),
      subjectDisplay: m.customSubjectName || m.subjectId?.name || 'Other',
      viewCount: m.views?.length || 0,
    }));

    res.status(200).json({ success: true, data: enriched, total: enriched.length });
  } catch (error) {
    return next(error);
  }
};


// ========================
// ADMIN: STUDENT DIRECTORY
// ========================
const Attendance = require('../../src/modules/attendance/models/attendance');
const { Assignment } = require('../../src/modules/academics');

exports.getAdminStudents = async (req, res, next) => {
  try {
    // BUG-03/06 FIX: Include isDeleted guard + move search to DB to prevent memory spikes
    const filter = { status: 'active', schoolId: req.schoolId, isDeleted: { $ne: true } };
    if (req.query.classId)  filter.classId  = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.session)  filter.session   = req.query.session;

    // Push search into the DB query — do NOT load all students into memory first
    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { firstName:       regex },
        { lastName:        regex },
        { rollNo:          regex },
        { admissionNumber: regex },
      ];
    }

    const students = await StudentProfile.find(filter)
      .populate('classId',   'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session',   'name')
      .sort({ rollNo: 1 });

    res.status(200).json({ success: true, data: students, total: students.length });
  } catch (err) {
    return next(err);
  }
};

exports.getAdminStudentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    // BUG-12 FIX: Exclude deleted students from detail view
    const student = await StudentProfile.findOne({ _id: id, schoolId: req.schoolId, isDeleted: { $ne: true } })
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name isActive')
      .populate('userId', 'email')
      .lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Attendance summary — scoped to school (FIX 11A)
    // Guard: sectionId may be null for students without section assignment
    const attFilter = {
      classId:  student.classId?._id,
      schoolId: req.schoolId,
      session:  student.session?._id,
    };
    if (student.sectionId?._id) attFilter.sectionId = student.sectionId._id;

    const attendanceRecords = await Attendance.find(attFilter);
    let present = 0, absent = 0, late = 0, leave = 0;
    attendanceRecords.forEach(record => {
      const myRec = record.records.find(r => r.studentId?.toString() === student._id.toString());
      if (myRec) {
        if (myRec.status === 'present') present++;
        else if (myRec.status === 'absent') absent++;
        else if (myRec.status === 'late') late++;
        else if (myRec.status === 'leave') leave++;
      }
    });
    const total = present + absent + late + leave;
    const percentage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;

    // Assignment counts — scoped to school (FIX 11A)
    // Guard: sectionId may be null
    const assignFilter = {
      classId:  student.classId?._id,
      schoolId: req.schoolId,
    };
    if (student.sectionId?._id) assignFilter.sectionId = student.sectionId._id;

    const assignments = await Assignment.find(assignFilter)
      .select('title subjectId dueDate createdAt');

    // Leave history — scoped to school (FIX 11A)
    const leaves = await Leave.find({
      appliedBy: student.userId,
      role: 'student',
      schoolId: req.schoolId
    }).sort({ createdAt: -1 }).limit(10);

    let addressData = {};
    if (student.address && typeof student.address === 'object') {
      // Legacy: address stored as nested object
      addressData = {
        line1: student.address.addressLine1 || student.address.address || '',
        line2: student.address.addressLine2 || '',
        city: student.address.city || student.city || '',
        state: student.address.state || student.state || '',
        pincode: student.address.pincode || student.pincode || '',
      };
    } else {
      // New: flat string + separate fields
      addressData = {
        line1: student.address || '',
        line2: student.addressLine2 || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || '',
      };
    }


    res.status(200).json({
      success: true,
      data: {
        profile: student,
        attendance: { total, present, absent, late, leave, percentage },
        assignmentCount: assignments.length,
        assignments,
        recentLeaves: leaves,
        addressData,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================
// ADMIN: TEACHER DIRECTORY
// ========================
exports.getAdminTeachers = async (req, res) => {
  try {
    // BUG-07 FIX: Move search to DB query — do NOT load all teachers into memory
    const filter = { schoolId: req.schoolId };
    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { firstName:  regex },
        { lastName:   regex },
        { employeeId: regex },
        { teacherId:  regex },
      ];
    }

    const teachers = await TeacherProfile.find(filter)
      .populate('userId', 'email')
      .sort({ firstName: 1 });

    res.status(200).json({ success: true, data: teachers, total: teachers.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAdminTeacherDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await TeacherProfile.findOne({ _id: id, schoolId: req.schoolId })
      .populate('userId', 'email');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const [assignments, classTeacher, createdAssignments] = await Promise.all([
      TeacherSubjectAssignment.find({ teacherId: teacher.userId, schoolId: req.schoolId })
        .populate('subjectId', 'name code')
        .populate('classId', 'name numericOrder')
        .populate('sectionId', 'name')
        .populate('session', 'name isActive'),
      ClassTeacherAssignment.find({ teacherId: teacher.userId, schoolId: req.schoolId })
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .populate('session', 'name'),
      // SECURITY: scope createdAssignments to current school (FIX 11B)
      Assignment.find({ teacherid: teacher.userId, schoolId: req.schoolId })
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .populate('subjectId', 'name')
        .sort({ createdAt: -1 })
    ]);

    const assignmentsByClass = {};
    createdAssignments.forEach(a => {
      const key = a.classId?._id?.toString();
      if (!key) return;
      if (!assignmentsByClass[key]) assignmentsByClass[key] = { className: a.classId.name, count: 0, items: [] };
      assignmentsByClass[key].count++;
      assignmentsByClass[key].items.push(a);
    });

    const examFilter = {
      createdBy: teacher.userId,
      schoolId: req.schoolId,
    };
    if (req.query.session) examFilter.session = req.query.session;
    if (req.query.classId) examFilter.classIds = req.query.classId;

    const exams = await Exam.find(examFilter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { profile: teacher, subjectAssignments: assignments, classTeacherOf: classTeacher, assignmentsByClass: Object.values(assignmentsByClass), recentAssignments: createdAssignments.slice(0, 10), tests: exams }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// ========================
// UPDATE TEACHER ASSIGNMENT
// ========================
exports.updateTeacherAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, subjectId } = req.body;
    const updated = await TeacherSubjectAssignment.findOneAndUpdate(
      { _id: id, schoolId: req.schoolId },
      { ...(teacherId && { teacherId }), ...(subjectId && { subjectId }) },
      { new: true }
    )
      .populate('teacherId', 'firstName lastName')
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .populate('sectionId', 'name');
    if (!updated) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(200).json({ success: true, message: 'Assignment updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================
// UPDATE CLASS TEACHER
// ========================
exports.updateClassTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const updated = await ClassTeacherAssignment.findOneAndUpdate(
      { _id: id, schoolId: req.schoolId },
      { teacherId },
      { new: true }
    )
      .populate('teacherId', 'firstName lastName')
      .populate('classId', 'name')
      .populate('sectionId', 'name');
    if (!updated) return res.status(404).json({ success: false, message: 'Class teacher assignment not found' });
    res.status(200).json({ success: true, message: 'Class teacher updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================
// DASHBOARD DETAIL VIEWS (card click-through)
// ========================

exports.getAllStudentsAdmin = async (req, res) => {
  try {
    // BUG-03 FIX: Always exclude soft-deleted students from admin listing
    const students = await StudentProfile.find({ schoolId: req.schoolId, isDeleted: { $ne: true } })
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name')
      .sort({ firstName: 1 });
    res.status(200).json({ success: true, data: students, total: students.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllTeachersAdmin = async (req, res) => {
  try {
    const teachers = await TeacherProfile.find({ schoolId: req.schoolId })
      .populate('userId', 'email')
      .sort({ firstName: 1 });
    res.status(200).json({ success: true, data: teachers, total: teachers.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllSubjectsAdmin = async (req, res) => {
  try {
    const subjects = await SubjectMaster.find({ schoolId: req.schoolId }).sort({ name: 1 });
    res.status(200).json({ success: true, data: subjects, total: subjects.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Template Linking ───────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/exam/:id/template
 * Body: { templateId: ObjectId | null }
 *
 * Links (or clears) a report template for a specific exam.
 * After this change, the teacher upload form will use this template's fields.
 */
const ReportTemplate = require('../../src/modules/reportcards').ReportTemplate;
const mongoose = require('mongoose');

exports.linkTemplateToExam = async (req, res) => {
  try {
    const { id: examId } = req.params;
    const { templateId }  = req.body;        // null = unlink
    const schoolId        = req.schoolId;

    // Validate template belongs to this school (if setting one)
    if (templateId) {
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({ success: false, message: 'Invalid templateId' });
      }
      const tpl = await ReportTemplate.findOne({ _id: templateId, schoolId }).select('_id name').lean();
      if (!tpl) {
        return res.status(404).json({ success: false, message: 'Template not found or does not belong to this school' });
      }
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: examId, schoolId },
      { $set: { templateId: templateId || null } },
      { new: true }
    ).select('name templateId').populate('templateId', 'name');

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    logger.info(`[Admin] Exam "${exam.name}" template linked → ${templateId || 'null'}`, { schoolId });
    res.status(200).json({
      success: true,
      message: templateId ? `Template linked to exam` : 'Template unlinked from exam',
      data: exam,
    });
  } catch (err) {
    logger.error('[Admin] linkTemplateToExam error', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/report-templates
 * Returns all active report templates for this school.
 * Used by the ExamManager template-link dropdown.
 */
exports.listReportTemplates = async (req, res) => {
  try {
    const templates = await ReportTemplate
      .find({ schoolId: req.schoolId, isActive: true })
      .select('name templateType isDefault createdAt')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: templates, total: templates.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
