/**
 * staffController.js
 * CRUD for school staff (admission, accounts roles) created by school admin.
 * Fully scoped to req.schoolId — zero cross-tenant data leakage.
 */

const { User } = require('../../../modules/identity');
const School    = require('../../../modules/tenancy').School;
const bcryptjs  = require('bcryptjs');
const logger    = require('../../../core/logging/logger.js');
const { generateTempPassword } = require('../../../modules/identity').generatePassword;
const { sendStaffCredentials } = require('../../../modules/notifications').emailService;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — strip sensitive fields before returning a user object
// ─────────────────────────────────────────────────────────────────────────────
const safeUser = (u) => {
  const obj = u.toObject ? u.toObject() : u;
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpired;
  delete obj.varificationToken;
  delete obj.varificationTokenExpired;
  return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/staff
// Admin creates a new admission or accounts staff member for their school.
// ─────────────────────────────────────────────────────────────────────────────
exports.createStaffMember = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, phone } = req.body;
    const schoolId  = req.schoolId;
    const createdBy = req.user._id;

    // ── Validation ───────────────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, and role are required',
      });
    }

    // ── Role restriction for school admins ───────────────────────────────────
    // Admin can only create: admission, accounts, librarian
    // Teachers / Students go through admission routes
    // Another admin cannot be created by school admin (privilege escalation)
    const ADMIN_CREATABLE_ROLES = ['admission', 'accounts', 'librarian', 'exam_controller'];
    if (!ADMIN_CREATABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Admin can only create staff with roles: ${ADMIN_CREATABLE_ROLES.join(', ')}. ` +
          `Teachers: POST /api/v1/admission/teacher/register | Students: POST /api/v1/admission/student/register`,
      });
    }

    // ── Email uniqueness within this school ──────────────────────────────────
    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
      schoolId,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists in this school',
      });
    }

    // ── Generate temp password ───────────────────────────────────────────────
    const tempPassword   = generateTempPassword();
    const hashedPassword = await bcryptjs.hash(tempPassword, 12);

    // ── Create user ──────────────────────────────────────────────────────────
    const staffUser = await User.create({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.toLowerCase().trim(),
      phone:     phone?.trim() || undefined,
      password:  hashedPassword,
      role,
      schoolId,
      isActive:          true,
      isVerified:        true,   // admin-created → pre-verified
      mustChangePassword: true,  // force change on first login
      createdBy,
    });

    // ── Fetch school for email ────────────────────────────────────────────────
    const school = await School.findById(schoolId).select('name code');
    if (!school) {
      logger.warn('createStaffMember: school not found for schoolId', { schoolId });
    }

    // ── Send credentials email (non-blocking failure) ────────────────────────
    let emailSent = false;
    let emailError = null;
    try {
      const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
      await sendStaffCredentials({
        to:           staffUser.email,
        staffName:    `${firstName} ${lastName}`,
        role,
        schoolName:   school?.name || 'School ERP',
        schoolCode:   school?.code || schoolId.toString(),
        tempPassword,
        loginUrl,
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message;
      logger.error('Failed to send staff credentials email', {
        userId:  staffUser._id,
        email:   staffUser.email,
        error:   err.message,
        code:    err.code,
      });
    }

    logger.info('Staff member created', {
      createdUserId: staffUser._id,
      role,
      schoolId,
      createdBy,
      emailSent,
    });

    return res.status(201).json({
      success: true,
      emailSent,
      message: emailSent
        ? `${role.charAt(0).toUpperCase() + role.slice(1)} account created. Credentials sent to ${staffUser.email}.`
        : `${role.charAt(0).toUpperCase() + role.slice(1)} account created. Email delivery failed (${emailError}) — share this password manually: ${tempPassword}`,
      data: {
        user: {
          _id:               staffUser._id,
          firstName:         staffUser.firstName,
          lastName:          staffUser.lastName,
          email:             staffUser.email,
          role:              staffUser.role,
          isActive:          staffUser.isActive,
          mustChangePassword: staffUser.mustChangePassword,
          createdAt:         staffUser.createdAt,
        },
        emailSent,
        ...(emailSent ? {} : { tempPassword }),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists in this school',
      });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/staff
// Admin fetches all staff for their school (admission + accounts, excludes students/teachers).
// Query params: role, isActive, search
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllStaffMembers = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;
    const { role, isActive, search } = req.query;

    const filter = {
      schoolId,
      role: { $in: ['admin', 'admission', 'accounts', 'librarian', 'exam_controller'] }, // excludes student + teacher
    };

    // Specific role filter (overrides the $in array)
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Active status filter
    if (isActive === 'true')  filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    // Search by name or email
    if (search && search.trim()) {
      filter.$or = [
        { firstName: { $regex: search.trim(), $options: 'i' } },
        { lastName:  { $regex: search.trim(), $options: 'i' } },
        { email:     { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const staff = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpired -varificationToken -varificationTokenExpired')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        staff,
        total: staff.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/staff/:id
// Admin can update first name, last name, phone.
// Role and email are immutable after creation.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateStaffMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;
    const { firstName, lastName, phone } = req.body;

    const staffUser = await User.findOne({ _id: id, schoolId });
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (firstName) staffUser.firstName = firstName.trim();
    if (lastName)  staffUser.lastName  = lastName.trim();
    if (phone !== undefined) staffUser.phone = phone;

    await staffUser.save();

    return res.status(200).json({
      success: true,
      message: 'Staff member updated successfully',
      data: { user: safeUser(staffUser) },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/staff/:id/status
// Toggle staff active / inactive status.
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const schoolId = req.schoolId;

    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be "activate" or "deactivate"',
      });
    }

    const staffUser = await User.findOne({ _id: id, schoolId });
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Prevent deactivating own account
    if (staffUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    // Prevent school admin from deactivating another admin
    if (staffUser.role === 'admin' && req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin cannot deactivate another admin account',
      });
    }

    staffUser.isActive = (action === 'activate');
    await staffUser.save();

    return res.status(200).json({
      success: true,
      message: `Staff member ${action}d successfully`,
      data: {
        _id:      staffUser._id,
        isActive: staffUser.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/staff/:id/resend-credentials
// Generates a new temp password and re-sends credentials email.
// ─────────────────────────────────────────────────────────────────────────────
exports.resendCredentials = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const staffUser = await User.findOne({ _id: id, schoolId });
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (staffUser.role === 'student') {
      return res.status(400).json({
        success: false,
        message: 'Cannot resend credentials for student accounts',
      });
    }

    // Generate new temp password
    const tempPassword   = generateTempPassword();
    const hashedPassword = await bcryptjs.hash(tempPassword, 12);

    staffUser.password           = hashedPassword;
    staffUser.mustChangePassword = true; // force change again
    await staffUser.save();

    const school = await School.findById(schoolId).select('name code');
    if (!school) {
      logger.warn('resendCredentials: school not found for schoolId', { schoolId });
    }

    let emailSent = false;
    try {
      await sendStaffCredentials({
        to:         staffUser.email,
        staffName:  `${staffUser.firstName} ${staffUser.lastName}`,
        role:       staffUser.role,
        schoolName: school.name,
        schoolCode: school.code,
        tempPassword,
        loginUrl:   process.env.CLIENT_URL || 'https://campus.unifiedcampus.com',
      });
      emailSent = true;
    } catch (emailErr) {
      logger.error('resendCredentials: Email delivery failed', {
        userId: staffUser._id,
        email:  staffUser.email,
        error:  emailErr.message,
      });
    }

    logger.info('Staff credentials resent', {
      userId:    staffUser._id,
      email:     staffUser.email,
      schoolId,
      sentBy:   req.user._id,
      emailSent,
    });

    return res.status(200).json({
      success: true,
      message: emailSent
        ? `New credentials sent to ${staffUser.email}. They must change password on next login.`
        : `Email delivery failed — share credentials manually: Login: ${staffUser.email} | Temp Password: ${tempPassword}`,
      data: { emailSent, tempPassword: emailSent ? undefined : tempPassword },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/staff/:id
// Permanently delete a staff account (admission, accounts, librarian,
// exam_controller).
// Guards:
//   • Target must belong to this school (schoolId-scoped)
//   • Admin cannot delete another admin (privilege escalation)
//   • Admin cannot delete their own account
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteStaffMember = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const schoolId = req.schoolId;

    const staffUser = await User.findOne({ _id: id, schoolId });
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Block self-deletion
    if (staffUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Block admin-on-admin deletion (privilege escalation guard)
    if (staffUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be deleted from this panel',
      });
    }

    const deletedName  = `${staffUser.firstName} ${staffUser.lastName}`;
    const deletedEmail = staffUser.email;
    const deletedRole  = staffUser.role;

    await User.deleteOne({ _id: id, schoolId });

    logger.info('Staff member permanently deleted', {
      deletedUserId: id,
      deletedEmail,
      deletedRole,
      schoolId,
      deletedBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: `${deletedName} (${deletedEmail}) has been permanently deleted.`,
      data: { deletedId: id, deletedEmail, deletedRole },
    });
  } catch (error) {
    next(error);
  }
};
