const TeacherProfile = require('../models/TeacherProfile');
const { User } = require('../../src/modules/identity');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');

// ─── helpers ──────────────────────────────────────────────────────────────────

const paginate = (page, limit, total) => ({
  total,
  page:       Number(page),
  limit:      Number(limit),
  totalPages: Math.ceil(total / Number(limit)),
});

// Build class-section labels for a teacher from their subject assignments
const buildAssignmentLabels = (assignments) => {
  const seen = new Set();
  const labels = [];
  for (const a of assignments) {
    const cls = a.classId?.name || '';
    const sec = a.sectionId?.name || '';
    const key = `${cls}-${sec}`;
    if (!seen.has(key) && (cls || sec)) {
      seen.add(key);
      labels.push({ label: key, classId: a.classId?._id, sectionId: a.sectionId?._id });
    }
  }
  return labels;
};

// ── GET /api/v1/teacher-management/all ────────────────────────────────────────
// Paginated, searchable list of active (non-deleted) teachers + their
// class-section assignments.
exports.getAllTeachersEnhanced = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const schoolId = req.schoolId;

    const filter = { schoolId, isDeleted: { $ne: true } };
    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { firstName:  regex },
        { lastName:   regex },
        { employeeId: regex },
        { teacherId:  regex },
        { phone:      regex },
        { department: regex },
        { designation: regex },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await TeacherProfile.countDocuments(filter);

    const teachers = await TeacherProfile.find(filter)
      .populate('userId', 'firstName lastName email phone isActive username')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Fetch assignments for all returned teachers in one query.
    // TeacherSubjectAssignment.teacherId refs User._id (not TeacherProfile._id)
    const userIds = teachers.map(t => t.userId?._id).filter(Boolean);

    const assignments = await TeacherSubjectAssignment.find({
      teacherId: { $in: userIds },
      schoolId,
    })
      .populate('classId',   'name')
      .populate('sectionId', 'name')
      .lean();

    // Map userId → assignments
    const assignmentMap = {};
    assignments.forEach(a => {
      const key = String(a.teacherId);
      if (!assignmentMap[key]) assignmentMap[key] = [];
      assignmentMap[key].push(a);
    });

    const enriched = teachers.map(t => ({
      ...t,
      assignedClasses: buildAssignmentLabels(
        assignmentMap[String(t.userId?._id)] || []
      ),
    }));

    res.json({
      success: true,
      data: { teachers: enriched, pagination: paginate(page, limit, total) },
    });
  } catch (err) {
    console.error('[TeacherMgmt] getAllTeachersEnhanced:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/teacher-management/deleted ────────────────────────────────────
exports.getDeletedTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const schoolId = req.schoolId;

    const filter = { schoolId, isDeleted: true };

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { firstName:  regex },
        { lastName:   regex },
        { employeeId: regex },
        { teacherId:  regex },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await TeacherProfile.countDocuments(filter);

    const teachers = await TeacherProfile.find(filter)
      .populate('userId',    'firstName lastName email phone isActive username')
      .populate('deletedBy', 'firstName lastName')
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Fetch assignments (they still exist for the deleted teachers)
    const userIds = teachers.map(t => t.userId?._id).filter(Boolean);
    const assignments = await TeacherSubjectAssignment.find({
      teacherId: { $in: userIds }, schoolId,
    })
      .populate('classId',   'name')
      .populate('sectionId', 'name')
      .lean();

    const assignmentMap = {};
    assignments.forEach(a => {
      const key = String(a.teacherId);
      if (!assignmentMap[key]) assignmentMap[key] = [];
      assignmentMap[key].push(a);
    });

    const enriched = teachers.map(t => ({
      ...t,
      assignedClasses: buildAssignmentLabels(
        assignmentMap[String(t.userId?._id)] || []
      ),
    }));

    res.json({
      success: true,
      data: { teachers: enriched, pagination: paginate(page, limit, total) },
    });
  } catch (err) {
    console.error('[TeacherMgmt] getDeletedTeachers:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/v1/teacher-management/:id/soft-delete ─────────────────────────
exports.softDeleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;
    const schoolId = req.schoolId;

    const profile = await TeacherProfile.findOne({ _id: id, schoolId });
    if (!profile) return res.status(404).json({ success: false, message: 'Teacher not found' });

    profile.isDeleted    = true;
    profile.deletedAt    = new Date();
    profile.deletedBy    = req.userId;
    profile.deleteReason = reason;
    profile.status       = 'inactive';
    await profile.save();

    // Deactivate the login account
    await User.findByIdAndUpdate(profile.userId, { isActive: false });

    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('[TeacherMgmt] softDeleteTeacher:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/v1/teacher-management/:id/restore ─────────────────────────────
exports.restoreTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const profile = await TeacherProfile.findOne({ _id: id, schoolId });
    if (!profile) return res.status(404).json({ success: false, message: 'Teacher not found' });

    profile.isDeleted    = false;
    profile.deletedAt    = undefined;
    profile.deletedBy    = undefined;
    profile.deleteReason = undefined;
    profile.status       = 'inactive'; // restored as inactive; admin can activate manually
    await profile.save();

    // NOTE: keep user account inactive — admin activates explicitly
    res.json({ success: true, message: 'Teacher restored. Status set to inactive — activate manually.' });
  } catch (err) {
    console.error('[TeacherMgmt] restoreTeacher:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/v1/teacher-management/:id/toggle-status ───────────────────────
exports.toggleTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const schoolId = req.schoolId;

    const profile = await TeacherProfile.findOne({ _id: id, schoolId });
    if (!profile) return res.status(404).json({ success: false, message: 'Teacher not found' });

    profile.status = isActive ? 'active' : 'inactive';
    await profile.save();

    await User.findByIdAndUpdate(profile.userId, { isActive });

    res.json({
      success: true,
      message: `Teacher ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    console.error('[TeacherMgmt] toggleTeacherStatus:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
