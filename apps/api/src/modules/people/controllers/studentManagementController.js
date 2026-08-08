const StudentProfile = require('../../../modules/people/models/StudentProfile');
const { User } = require('../../../modules/identity');
const { ClassModel } = require('../../academics');
const { SectionModel } = require('../../academics');
const { AcademicSession } = require('../../academics');
const mongoose = require('mongoose');
const logger = require('../../../core/logging/logger.js');

// ─── 1. getAllStudentsEnhanced ────────────────────────────────────────────────
exports.getAllStudentsEnhanced = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      classId,
      sectionId,
      gender,
      category,
      session,
      sortBy = 'firstName',
      sortOrder = 'asc',
    } = req.query;

    const filter = {
      schoolId: req.schoolId,
      status: { $in: ['active', 'inactive'] },
      isDeleted: { $ne: true },
    };

    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (gender) filter.gender = gender;
    if (category) filter.category = category;
    if (session) filter.session = session;

    if (search) {
      filter.$or = [
        { rollNo: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { 'parentDetails.father.name': { $regex: search, $options: 'i' } },
        { 'parentDetails.father.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [profiles, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate('userId', 'firstName lastName email phone isActive')
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    const enriched = profiles.map((p) => ({
      ...p,
      fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      email: p.userId?.email || '',
      phone: p.userId?.phone || p.phone || '',
      isActive: p.userId?.isActive !== undefined ? p.userId.isActive : true,
      className: p.classId?.name || '',
      sectionName: p.sectionId?.name || '',
      parentName: p.parentDetails?.father?.name || '',
      parentPhone: p.parentDetails?.father?.phone || '',
    }));

    return res.status(200).json({
      success: true,
      data: {
        students: enriched,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. bulkEditStudents ─────────────────────────────────────────────────────
exports.bulkEditStudents = async (req, res, next) => {
  try {
    const { studentProfileIds, updates } = req.body;

    if (!studentProfileIds || !Array.isArray(studentProfileIds) || studentProfileIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'studentProfileIds array is required' });
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'updates object is required' });
    }

    const ALLOWED_BULK_FIELDS = [
      'classId',
      'sectionId',
      'gender',
      'parentName',
      'parentPhone',
      'parentEmail',
    ];
    const sanitizedUpdates = {};
    for (const [key, val] of Object.entries(updates)) {
      if (ALLOWED_BULK_FIELDS.includes(key) && val !== undefined) {
        sanitizedUpdates[key] = val;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: `Only these fields can be bulk edited: ${ALLOWED_BULK_FIELDS.join(', ')}`,
      });
    }

    sanitizedUpdates.lastBulkEditAt = new Date();
    sanitizedUpdates.lastBulkEditBy = req.user._id;

    const count = await StudentProfile.countDocuments({
      _id: { $in: studentProfileIds },
      schoolId: req.schoolId,
      isDeleted: { $ne: true },
    });

    if (count !== studentProfileIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some student IDs are invalid or belong to another school',
      });
    }

    if (sanitizedUpdates.classId) {
      const cls = await ClassModel.findOne({
        _id: sanitizedUpdates.classId,
        schoolId: req.schoolId,
      });
      if (!cls) {
        return res.status(400).json({ success: false, message: 'Invalid classId for this school' });
      }
    }

    const result = await StudentProfile.updateMany(
      { _id: { $in: studentProfileIds }, schoolId: req.schoolId, isDeleted: { $ne: true } },
      { $set: sanitizedUpdates }
    );

    logger.info('Bulk student edit', {
      schoolId: req.schoolId,
      updatedBy: req.user._id,
      count: result.modifiedCount,
      fields: Object.keys(sanitizedUpdates),
    });

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} student(s) updated successfully`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. softDeleteStudent ────────────────────────────────────────────────────
exports.softDeleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student profile ID' });
    }

    const profile = await StudentProfile.findOne({
      _id: id,
      schoolId: req.schoolId,
      isDeleted: false,
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    profile.isDeleted = true;
    profile.status = 'deleted';
    profile.deletedAt = new Date();
    profile.deletedBy = req.user._id;
    profile.deleteReason = reason || null;

    if (profile.userId) {
      await User.findByIdAndUpdate(profile.userId, { isActive: false });
    }

    await profile.save();

    logger.info('Student soft deleted', {
      profileId: id,
      schoolId: req.schoolId,
      deletedBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully. Can be restored later.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. restoreDeletedStudent ─────────────────────────────────────────────────
exports.restoreDeletedStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const profile = await StudentProfile.findOne({
      _id: id,
      schoolId: req.schoolId,
      isDeleted: true,
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Deleted student not found' });
    }

    profile.isDeleted = false;
    profile.status = 'active';
    profile.deletedAt = null;
    profile.deletedBy = null;
    profile.deleteReason = null;

    if (profile.userId) {
      await User.findByIdAndUpdate(profile.userId, { isActive: true });
    }

    await profile.save();

    return res.status(200).json({ success: true, message: 'Student restored successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── 5. getDeletedStudents ────────────────────────────────────────────────────
exports.getDeletedStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const filter = { schoolId: req.schoolId, isDeleted: true, status: 'deleted' };

    if (search) {
      filter.$or = [
        { rollNo: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [profiles, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .populate('deletedBy', 'firstName lastName')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    const enriched = profiles.map((p) => ({
      ...p,
      fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      className: p.classId?.name || '',
      sectionName: p.sectionId?.name || '',
      deletedByName: p.deletedBy ? `${p.deletedBy.firstName} ${p.deletedBy.lastName}` : '',
    }));

    return res.status(200).json({
      success: true,
      data: {
        students: enriched,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 6. markStudentPassed ─────────────────────────────────────────────────────
exports.markStudentPassed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { passedOutYear, passedOutClass } = req.body;

    if (!passedOutYear) {
      return res
        .status(400)
        .json({ success: false, message: 'passedOutYear is required (e.g. "2024-25")' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const profile = await StudentProfile.findOne({
      _id: id,
      schoolId: req.schoolId,
      isDeleted: false,
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    profile.status = 'passed';
    profile.passedOutYear = passedOutYear;
    profile.passedOutClass = passedOutClass || null;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: `Student marked as passed out (${passedOutYear})`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 7. getPassedStudents ─────────────────────────────────────────────────────
exports.getPassedStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, passedOutYear } = req.query;

    const filter = { schoolId: req.schoolId, status: 'passed', isDeleted: { $ne: true } };
    if (passedOutYear) filter.passedOutYear = passedOutYear;
    if (search) {
      filter.$or = [
        { rollNo: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { passedOutClass: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [profiles, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ passedOutYear: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    const years = await StudentProfile.distinct('passedOutYear', {
      schoolId: req.schoolId,
      status: 'passed',
    });

    const enriched = profiles.map((p) => ({
      ...p,
      fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      parentPhone: p.parentDetails?.father?.phone || '',
    }));

    return res.status(200).json({
      success: true,
      data: {
        students: enriched,
        availableYears: years.filter(Boolean).sort().reverse(),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 8. markStudentDropped ────────────────────────────────────────────────────
exports.markStudentDropped = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dropReason, droppedDate } = req.body;

    if (!dropReason) {
      return res.status(400).json({ success: false, message: 'dropReason is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const profile = await StudentProfile.findOne({
      _id: id,
      schoolId: req.schoolId,
      isDeleted: false,
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    profile.status = 'dropped';
    profile.dropReason = dropReason;
    profile.droppedDate = droppedDate ? new Date(droppedDate) : new Date();

    if (profile.userId) {
      await User.findByIdAndUpdate(profile.userId, { isActive: false });
    }

    await profile.save();

    return res.status(200).json({ success: true, message: 'Student marked as dropped' });
  } catch (error) {
    next(error);
  }
};

// ─── 9. getDroppedStudents ────────────────────────────────────────────────────
exports.getDroppedStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const filter = { schoolId: req.schoolId, status: 'dropped', isDeleted: { $ne: true } };
    if (search) {
      filter.$or = [
        { rollNo: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [profiles, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('classId', 'name')
        .sort({ droppedDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    const enriched = profiles.map((p) => ({
      ...p,
      fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      className: p.classId?.name || '',
      parentPhone: p.parentDetails?.father?.phone || '',
    }));

    return res.status(200).json({
      success: true,
      data: {
        students: enriched,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 10. suspendStudent ───────────────────────────────────────────────────────
exports.suspendStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { suspensionReason, suspendedFrom, suspendedUntil } = req.body;

    if (!suspensionReason) {
      return res.status(400).json({ success: false, message: 'suspensionReason is required' });
    }
    if (!suspendedUntil) {
      return res.status(400).json({ success: false, message: 'suspendedUntil date is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const profile = await StudentProfile.findOne({
      _id: id,
      schoolId: req.schoolId,
      isDeleted: false,
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    profile.status = 'suspended';
    profile.suspensionReason = suspensionReason;
    profile.suspendedFrom = suspendedFrom ? new Date(suspendedFrom) : new Date();
    profile.suspendedUntil = new Date(suspendedUntil);
    await profile.save();

    return res.status(200).json({
      success: true,
      message: `Student suspended until ${new Date(suspendedUntil).toLocaleDateString('en-IN')}`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 11. unsuspendStudent ─────────────────────────────────────────────────────
exports.unsuspendStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const profile = await StudentProfile.findOne({
      _id: id,
      schoolId: req.schoolId,
      status: 'suspended',
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Suspended student not found' });
    }

    profile.status = 'active';
    profile.suspensionReason = null;
    profile.suspendedFrom = null;
    profile.suspendedUntil = null;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Student suspension lifted. Student is now active.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 12. getSuspendedStudents ─────────────────────────────────────────────────
exports.getSuspendedStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const filter = { schoolId: req.schoolId, status: 'suspended', isDeleted: { $ne: true } };
    if (search) {
      filter.$or = [
        { rollNo: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [profiles, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .sort({ suspendedFrom: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    const now = new Date();
    const enriched = profiles.map((p) => ({
      ...p,
      fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      className: p.classId?.name || '',
      sectionName: p.sectionId?.name || '',
      isCurrentlySuspended: p.suspendedUntil ? new Date(p.suspendedUntil) > now : false,
    }));

    return res.status(200).json({
      success: true,
      data: {
        students: enriched,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 13. getPromotionPreview ──────────────────────────────────────────────────
exports.getPromotionPreview = async (req, res, next) => {
  try {
    const { fromClassId, fromSectionId } = req.query;

    if (!fromClassId) {
      return res.status(400).json({ success: false, message: 'fromClassId is required' });
    }

    const filter = {
      schoolId: req.schoolId,
      classId: fromClassId,
      status: { $in: ['active', 'inactive'] },
      isDeleted: { $ne: true },
    };
    if (fromSectionId) filter.sectionId = fromSectionId;

    const students = await StudentProfile.find(filter)
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .select('_id rollNo firstName lastName classId sectionId admissionNumber')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        students: students.map((s) => ({
          _id: s._id,
          rollNo: s.rollNo,
          admissionNo: s.admissionNumber,
          fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
          className: s.classId?.name || '',
          sectionName: s.sectionId?.name || '',
        })),
        total: students.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 14. promoteStudents ──────────────────────────────────────────────────────
exports.promoteStudents = async (req, res, next) => {
  try {
    const { studentProfileIds, toClassId, toSectionId, toSessionId, fromSessionId } = req.body;

    if (!studentProfileIds || !Array.isArray(studentProfileIds) || studentProfileIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'studentProfileIds array is required' });
    }
    if (!toClassId || !toSessionId) {
      return res
        .status(400)
        .json({ success: false, message: 'toClassId and toSessionId are required' });
    }

    const targetClass = await ClassModel.findOne({ _id: toClassId, schoolId: req.schoolId });
    if (!targetClass) {
      return res
        .status(400)
        .json({ success: false, message: 'Target class not found in this school' });
    }

    if (toSectionId) {
      const targetSection = await SectionModel.findOne({
        _id: toSectionId,
        schoolId: req.schoolId,
      });
      if (!targetSection) {
        return res
          .status(400)
          .json({ success: false, message: 'Target section not found in this school' });
      }
    }

    const targetSession = await AcademicSession.findOne({
      _id: toSessionId,
      schoolId: req.schoolId,
    });
    if (!targetSession) {
      return res
        .status(400)
        .json({ success: false, message: 'Target session not found in this school' });
    }

    const currentProfiles = await StudentProfile.find({
      _id: { $in: studentProfileIds },
      schoolId: req.schoolId,
      isDeleted: { $ne: true },
      status: { $in: ['active', 'inactive'] },
    })
      .select('_id classId sectionId')
      .lean();

    if (currentProfiles.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No valid active students found to promote' });
    }

    // BUG-05 FIX: Use per-student promotedFrom data, NOT currentProfiles[0] for all.
    // updateMany would overwrite every student with the same (wrong) promotedFrom.
    // Instead, update each student individually so their own prior class/section is preserved.
    const now = new Date();
    let modifiedCount = 0;
    await Promise.all(
      currentProfiles.map(async (profile) => {
        const result = await StudentProfile.updateOne(
          { _id: profile._id, schoolId: req.schoolId },
          {
            $set: {
              classId: toClassId,
              sectionId: toSectionId || null,
              session: toSessionId,
              'promotedFrom.classId': profile.classId || null,
              'promotedFrom.sectionId': profile.sectionId || null,
              'promotedFrom.sessionId': fromSessionId || null,
              'promotedFrom.promotedAt': now,
              'promotedFrom.promotedBy': req.user._id,
              status: 'active',
            },
          }
        );
        if (result.modifiedCount > 0) modifiedCount++;
      })
    );

    logger.info('Students promoted', {
      schoolId: req.schoolId,
      promotedBy: req.user._id,
      count: modifiedCount,
      toClassId,
      toSectionId,
      toSessionId,
    });

    return res.status(200).json({
      success: true,
      message: `${modifiedCount} student(s) promoted to ${targetClass.name}`,
      data: {
        promotedCount: modifiedCount,
        targetClass: targetClass.name,
        targetSession: targetSession.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 14. exportStudents ───────────────────────────────────────────────────────
exports.exportStudents = async (req, res, next) => {
  try {
    const { classId, sectionId, gender, category } = req.query;

    const filter = {
      schoolId: req.schoolId,
      status: { $in: ['active', 'inactive'] },
      isDeleted: { $ne: true },
    };

    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (gender) filter.gender = gender;
    if (category) filter.category = category;

    const profiles = await StudentProfile.find(filter)
      .populate('userId', 'email')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const enriched = profiles.map((p, idx) => ({
      serial: idx + 1,
      admissionNumber: p.admissionNumber || '',
      rollNo: p.rollNo || '',
      scholarNo: p.scholarNo || '',
      fullName: `${p.firstName || ''} ${p.middleName || ''} ${p.lastName || ''}`
        .replace(/\s+/g, ' ')
        .trim(),
      gender: p.gender || '',
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-IN') : '',
      bloodGroup: p.bloodGroup || '',
      category: p.category || '',
      religion: p.religion || '',
      className: p.classId?.name || '',
      sectionName: p.sectionId?.name || '',
      email: p.userId?.email || '',
      phone: p.phone || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      pincode: p.pincode || '',
      fatherName: p.parentDetails?.father?.name || '',
      fatherPhone: p.parentDetails?.father?.phone || '',
      fatherEmail: p.parentDetails?.father?.email || '',
      fatherOccupation: p.parentDetails?.father?.occupation || '',
      motherName: p.parentDetails?.mother?.name || '',
      motherPhone: p.parentDetails?.mother?.phone || '',
      status: p.status || '',
      admissionDate: p.admissionDate ? new Date(p.admissionDate).toLocaleDateString('en-IN') : '',
      createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '',
    }));

    logger.info('Student export', {
      schoolId: req.schoolId,
      exportedBy: req.user._id,
      total: enriched.length,
    });

    return res.status(200).json({
      success: true,
      data: { students: enriched, total: enriched.length },
    });
  } catch (error) {
    next(error);
  }
};
