const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');
const School = require('../models/School');
const { User } = require('../models/user');
const SchoolSettings = require('../models/SchoolSettings');
const { generateSuperAdminToken } = require('../utils/generateSuperAdminToken');
const { crossSiteCookie } = require('../utils/cookieOptions');
const logger = require('../utils/logger');
const { MODULES, DEFAULT_MODULES, MODULE_KEYS, isModuleEnabled } = require('../utils/moduleConstants');

// ─────────────────────────────────────────────────────────────────────────────
// AUTH FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/super-admin/auth/login
 * Public — no middleware
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find by email (schema stores lowercase, but be safe)
    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Super admin not found',
      });
    }

    if (!superAdmin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated. Please contact the platform owner.',
      });
    }

    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    // Update lastLogin
    superAdmin.lastLogin = new Date();
    await superAdmin.save();

    // Sets the httpOnly superAdminToken cookie AND returns the raw JWT.
    const token = generateSuperAdminToken(res, superAdmin._id);

    logger.info('[SuperAdmin] Login successful', { superAdminId: superAdmin._id, email: superAdmin.email });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      // Returned so the client can store it and send `Authorization: Bearer`.
      // The cookie alone is not enough in production: the frontend and API sit
      // on different sites, so the SameSite=None cookie is dropped by browsers
      // that block third-party cookies — which is exactly why every school-side
      // API slice already sends a Bearer token. verifySuperAdmin accepts either.
      token,
      superAdmin: {
        _id: superAdmin._id,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        email: superAdmin.email,
        isActive: superAdmin.isActive,
        lastLogin: superAdmin.lastLogin,
        permissions: superAdmin.permissions,
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] Login error', { error: error.message });
    next(error);
  }
};

/**
 * POST /api/super-admin/auth/logout
 * Public — clears the superAdminToken cookie
 */
exports.logout = async (req, res) => {
  res.clearCookie('superAdminToken', crossSiteCookie(req));

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * GET /api/super-admin/auth/check
 * Protected — runs after verifySuperAdmin middleware
 */
exports.checkAuth = async (req, res) => {
  const sa = req.superAdmin;
  return res.status(200).json({
    success: true,
    superAdmin: {
      _id: sa._id,
      firstName: sa.firstName,
      lastName: sa.lastName,
      email: sa.email,
      isActive: sa.isActive,
      lastLogin: sa.lastLogin,
      permissions: sa.permissions,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL MANAGEMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/super-admin/schools
 * Protected — paginated, searchable, filterable list of all schools
 */
exports.getAllSchools = async (req, res, next) => {
  try {
    const { search, status = 'all', page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Run schools query and count in parallel
    const [schools, total] = await Promise.all([
      School.find(filter)
        .populate('adminUserId', 'firstName lastName email')
        .populate('onboardedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      School.countDocuments(filter),
    ]);

    // Attach user count per school in parallel
    const schoolsWithCounts = await Promise.all(
      schools.map(async (school) => {
        const userCount = await User.countDocuments({ schoolId: school._id });
        return { ...school, userCount };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        schools: schoolsWithCounts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] getAllSchools error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/super-admin/schools/:id
 * Protected — single school detail with user stats
 */
exports.getSchoolById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(id)
      .populate('adminUserId', 'firstName lastName email')
      .populate('onboardedBy', 'firstName lastName email')
      .lean();

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Fetch user stats in parallel
    const [totalUsers, usersByRoleRaw] = await Promise.all([
      User.countDocuments({ schoolId: school._id }),
      User.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);

    // Convert aggregate result to a more readable object
    const usersByRole = usersByRoleRaw.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        school,
        stats: { totalUsers, usersByRole },
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] getSchoolById error', { error: error.message });
    next(error);
  }
};

/**
 * POST /api/super-admin/schools
 * Protected — create a new school with its admin user + default SchoolSettings
 */
exports.createSchool = async (req, res, next) => {
  try {
    const {
      name,
      code,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      address,
      phone,
      email,
    } = req.body;

    // Validate required fields
    if (!name || !code || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'name, code, adminFirstName, adminLastName, adminEmail, adminPassword are all required',
      });
    }

    const normalizedCode = code.toUpperCase().trim();

    // Check duplicate school code
    const existingSchool = await School.findOne({ code: normalizedCode });
    if (existingSchool) {
      return res.status(400).json({
        success: false,
        message: 'School with this code already exists',
      });
    }

    // Check duplicate admin email (across all schools)
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An admin with this email already exists',
      });
    }

    // Step 1: Create school (without adminUserId yet)
    const school = await School.create({
      name: name.trim(),
      code: normalizedCode,
      address: address ? address.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      email: email ? email.trim().toLowerCase() : undefined,
      onboardedBy: req.superAdmin._id,
    });

    // Step 2: Hash password and create admin user scoped to this school
    const hashed = await bcrypt.hash(adminPassword, 12);
    const adminUser = await User.create({
      firstName: adminFirstName.trim(),
      lastName: adminLastName.trim(),
      email: adminEmail.toLowerCase().trim(),
      password: hashed,
      role: 'admin',
      schoolId: school._id,
      isActive: true,
      isVerified: true,
      mustChangePassword: true,  // force change on first login
    });

    // Step 3: Link admin user back to school
    school.adminUserId = adminUser._id;
    await school.save();

    // Step 4: Create default SchoolSettings for this school (with default module flags)
    await SchoolSettings.create({
      schoolId: school._id,
      modules: { ...DEFAULT_MODULES },
      isOasesEnabled: DEFAULT_MODULES.oases,
    });

    logger.info('[SuperAdmin] School created', {
      schoolId: school._id,
      schoolCode: school.code,
      createdBy: req.superAdmin._id,
    });

    // Send admin credentials via email (non-blocking)
    try {
      const { sendAdminCredentials } = require('../utils/emailService');
      await sendAdminCredentials({
        to:           adminEmail.toLowerCase().trim(),
        adminName:    `${adminFirstName.trim()} ${adminLastName.trim()}`,
        schoolName:   name.trim(),
        schoolCode:   normalizedCode,
        tempPassword: adminPassword,  // plain text — only used here
        loginUrl:     process.env.CLIENT_URL || 'https://campus-nexus.nexisparkx.com',
      });
    } catch (emailErr) {
      logger.error('[SuperAdmin] createSchool: admin credential email failed', { error: emailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: `School "${name}" created successfully`,
      data: {
        school: { _id: school._id, name: school.name, code: school.code, isActive: school.isActive },
        admin: { _id: adminUser._id, email: adminUser.email },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'School code or email already exists',
      });
    }
    logger.error('[SuperAdmin] createSchool error', { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/super-admin/schools/:id/status
 * Protected — suspend or activate a school
 */
exports.toggleSchoolStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!['activate', 'suspend'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "activate" or "suspend"',
      });
    }

    if (action === 'suspend' && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when suspending a school',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (action === 'suspend') {
      school.isActive = false;
      school.suspendedAt = new Date();
      school.suspendReason = reason.trim();
    } else {
      school.isActive = true;
      school.suspendedAt = null;
      school.suspendReason = null;
    }

    await school.save();

    logger.info(`[SuperAdmin] School ${action}d`, {
      schoolId: school._id,
      schoolCode: school.code,
      action,
      performedBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `School "${school.name}" has been ${action}d`,
      data: {
        isActive: school.isActive,
        suspendedAt: school.suspendedAt,
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] toggleSchoolStatus error', { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/super-admin/schools/:id
 * Protected — update editable fields of a school (name, code, address, phone, email).
 */
exports.updateSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, address, phone, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // If code is being changed, validate format and uniqueness
    if (code !== undefined) {
      const normalizedCode = code.toUpperCase().trim();
      if (!/^[A-Z0-9]{3,12}$/.test(normalizedCode)) {
        return res.status(400).json({ success: false, message: 'School code must be 3–12 uppercase alphanumeric characters' });
      }
      if (normalizedCode !== school.code) {
        const existing = await School.findOne({ code: normalizedCode });
        if (existing) {
          return res.status(400).json({ success: false, message: 'A school with this code already exists' });
        }
      }
      school.code = normalizedCode;
    }

    if (name !== undefined)    school.name    = name.trim();
    if (address !== undefined) school.address = address.trim();
    if (phone !== undefined)   school.phone   = phone.trim();
    if (email !== undefined)   school.email   = email.trim().toLowerCase();

    await school.save();

    logger.info('[SuperAdmin] School updated', {
      schoolId: school._id,
      schoolCode: school.code,
      updatedBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `School "${school.name}" updated successfully`,
      data: {
        school: {
          _id: school._id,
          name: school.name,
          code: school.code,
          address: school.address,
          phone: school.phone,
          email: school.email,
          isActive: school.isActive,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'School code already exists' });
    }
    logger.error('[SuperAdmin] updateSchool error', { error: error.message });
    next(error);
  }
};

/**
 * DELETE /api/super-admin/schools/:id
 * Protected — permanently deletes a school, its settings, and all associated users.
 */
exports.deleteSchool = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Delete all users belonging to this school
    const deletedUsers = await User.deleteMany({ schoolId: id });

    // Delete school settings
    await SchoolSettings.deleteOne({ schoolId: id });

    // Delete the school itself
    await School.findByIdAndDelete(id);

    logger.info('[SuperAdmin] School permanently deleted', {
      schoolId: id,
      schoolCode: school.code,
      schoolName: school.name,
      usersDeleted: deletedUsers.deletedCount,
      deletedBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `School "${school.name}" and all its data have been permanently deleted`,
      data: { schoolId: id, usersDeleted: deletedUsers.deletedCount },
    });
  } catch (error) {
    logger.error('[SuperAdmin] deleteSchool error', { error: error.message });
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE MANAGEMENT FUNCTIONS (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/super-admin/schools/:id/modules
 * Returns all 8 module definitions merged with this school's current enabled state.
 */
exports.getSchoolModules = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(id).select('name code isActive');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Upsert: create with defaults if settings don't exist yet
    let settings = await SchoolSettings.findOne({ schoolId: id });
    if (!settings) {
      settings = await SchoolSettings.create({
        schoolId: id,
        modules: { ...DEFAULT_MODULES },
        isOasesEnabled: DEFAULT_MODULES.oases,
      });
    }

    // Build response: each module definition + its current enabled value
    const moduleStatus = {};
    MODULE_KEYS.forEach((key) => {
      const schoolVal = settings.modules?.[key];
      let enabled;
      // Special backward-compat: if modules.oases is missing, read isOasesEnabled
      if (key === 'oases' && typeof schoolVal === 'undefined') {
        enabled = settings.isOasesEnabled ?? false;
      } else {
        enabled = typeof schoolVal !== 'undefined' ? schoolVal : MODULES[key].defaultEnabled;
      }
      moduleStatus[key] = { ...MODULES[key], enabled };
    });

    return res.status(200).json({
      success: true,
      data: {
        school: { _id: school._id, name: school.name, code: school.code, isActive: school.isActive },
        modules: moduleStatus,
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] getSchoolModules error', { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/super-admin/schools/:id/modules
 * Toggle a single module on or off.
 * Body: { moduleKey: string, enabled: boolean }
 */
exports.updateSchoolModule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { moduleKey, enabled } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }
    if (!moduleKey || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'moduleKey (string) and enabled (boolean) are required' });
    }
    if (!MODULE_KEYS.includes(moduleKey)) {
      return res.status(400).json({ success: false, message: `Invalid module key. Valid keys: ${MODULE_KEYS.join(', ')}` });
    }
    if (moduleKey === 'core' && enabled === false) {
      return res.status(400).json({ success: false, message: 'Core module cannot be disabled' });
    }
    if (!MODULES[moduleKey].canDisable && enabled === false) {
      return res.status(400).json({ success: false, message: `Module "${MODULES[moduleKey].label}" cannot be disabled` });
    }

    const school = await School.findById(id).select('name code');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const updateField = `modules.${moduleKey}`;
    await SchoolSettings.findOneAndUpdate(
      { schoolId: id },
      {
        $set: {
          [updateField]: enabled,
          // Keep isOasesEnabled in sync when toggling oases module
          ...(moduleKey === 'oases' ? { isOasesEnabled: enabled } : {}),
        },
      },
      { new: true, upsert: true }
    );

    logger.info('[SuperAdmin] Module toggled', {
      schoolId: id, schoolCode: school.code, moduleKey, enabled,
      toggledBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `${MODULES[moduleKey].label} has been ${enabled ? 'enabled' : 'disabled'} for ${school.name}`,
      data: { moduleKey, enabled, schoolId: id },
    });
  } catch (error) {
    logger.error('[SuperAdmin] updateSchoolModule error', { error: error.message });
    next(error);
  }
};

/**
 * PUT /api/super-admin/schools/:id/modules/bulk
 * Update multiple modules atomically.
 * Body: { modules: { fee_management: true, biometric: false, ... } }
 */
exports.bulkUpdateSchoolModules = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modules } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }
    if (!modules || typeof modules !== 'object' || Array.isArray(modules)) {
      return res.status(400).json({ success: false, message: 'modules object is required' });
    }

    const school = await School.findById(id).select('name code');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const updateObj = {};
    const errors = [];

    Object.entries(modules).forEach(([key, value]) => {
      if (!MODULE_KEYS.includes(key))           { errors.push(`Unknown module: ${key}`); return; }
      if (typeof value !== 'boolean')            { errors.push(`Value for ${key} must be boolean`); return; }
      if (key === 'core' && value === false)     { errors.push('Core module cannot be disabled'); return; }
      if (!MODULES[key].canDisable && !value)    { errors.push(`Module "${MODULES[key].label}" cannot be disabled`); return; }
      updateObj[`modules.${key}`] = value;
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors });
    }

    // Sync isOasesEnabled if oases is being updated
    if (typeof modules.oases === 'boolean') {
      updateObj.isOasesEnabled = modules.oases;
    }

    await SchoolSettings.findOneAndUpdate(
      { schoolId: id },
      { $set: updateObj },
      { upsert: true }
    );

    logger.info('[SuperAdmin] Bulk module update', {
      schoolId: id, schoolCode: school.code, modules, updatedBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `Modules updated for ${school.name}`,
      data: { schoolId: id, updatedModules: modules },
    });
  } catch (error) {
    logger.error('[SuperAdmin] bulkUpdateSchoolModules error', { error: error.message });
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STAFF MANAGEMENT (Super Admin — can manage staff of any school)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/super-admin/schools/:id/staff
 * Returns all admin / admission / accounts users for a specific school.
 */
exports.getSchoolStaff = async (req, res, next) => {
  try {
    const { id: schoolId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(schoolId).select('name code');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const staff = await User.find({
      schoolId,
      role: { $in: ['admin', 'admission', 'accounts'] },
    })
      .select('-password -resetPasswordToken -resetPasswordExpired -varificationToken -varificationTokenExpired')
      .populate('createdBy', 'firstName lastName email')
      .sort({ role: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        school: { _id: school._id, name: school.name, code: school.code },
        staff,
        total: staff.length,
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] getSchoolStaff error', { error: error.message });
    next(error);
  }
};

/**
 * POST /api/super-admin/schools/:id/staff
 * Super admin creates admin / admission / accounts user for any school.
 */
exports.createStaffForSchool = async (req, res, next) => {
  try {
    const { id: schoolId } = req.params;
    const { firstName, lastName, email, role, phone } = req.body;

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    // Super admin can create: admin, admission, accounts
    // NOT teacher or student (those go through school-specific admission flows)
    const SA_CREATABLE_ROLES = ['admin', 'admission', 'accounts'];
    if (!SA_CREATABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Super admin can create users with roles: ${SA_CREATABLE_ROLES.join(', ')}. ` +
          `Teachers and students are created through the school admission process.`,
      });
    }

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, and email are required',
      });
    }

    const school = await School.findById(schoolId).select('name code');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim(), schoolId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists in this school',
      });
    }

    const { generateTempPassword } = require('../utils/generatePassword');
    const { sendAdminCredentials, sendStaffCredentials } = require('../utils/emailService');

    const tempPassword = generateTempPassword();
    const hashed       = await bcrypt.hash(tempPassword, 12);

    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.toLowerCase().trim(),
      phone:     phone?.trim() || undefined,
      password:  hashed,
      role,
      schoolId,
      isActive:           true,
      isVerified:         true,
      mustChangePassword: true,
      createdBy:          null, // super admin has no User doc
    });

    // Send appropriate credentials email (non-blocking)
    try {
      const loginUrl = process.env.CLIENT_URL || 'https://campus-nexus.nexisparkx.com';
      if (role === 'admin') {
        await sendAdminCredentials({
          to:           newUser.email,
          adminName:    `${firstName.trim()} ${lastName.trim()}`,
          schoolName:   school.name,
          schoolCode:   school.code,
          tempPassword,
          loginUrl,
        });
      } else {
        await sendStaffCredentials({
          to:           newUser.email,
          staffName:    `${firstName.trim()} ${lastName.trim()}`,
          role,
          schoolName:   school.name,
          schoolCode:   school.code,
          tempPassword,
          loginUrl,
        });
      }
    } catch (emailErr) {
      logger.error('[SuperAdmin] createStaffForSchool: email failed', {
        userId: newUser._id,
        error:  emailErr.message,
      });
    }

    logger.info('[SuperAdmin] Staff created for school', {
      newUserId: newUser._id,
      role,
      schoolId,
      createdBy: req.superAdmin._id,
    });

    return res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created for ${school.name}. Credentials sent to ${email}.`,
      data: {
        user: {
          _id:               newUser._id,
          firstName:         newUser.firstName,
          lastName:          newUser.lastName,
          email:             newUser.email,
          role:              newUser.role,
          schoolId:          newUser.schoolId,
          mustChangePassword: true,
          createdAt:         newUser.createdAt,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists in this school',
      });
    }
    logger.error('[SuperAdmin] createStaffForSchool error', { error: error.message });
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORT TEMPLATE MANAGEMENT (Super Admin — cross-school)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/super-admin/schools/:id/templates
 * Super admin uploads an HTML/CSS report template for a specific school.
 * Uses verifySuperAdmin (not varifyToken) so req.user/req.schoolId are absent.
 * schoolId comes from req.params.id.
 */
exports.uploadTemplateForSchool = async (req, res, next) => {
  try {
    const ReportTemplate = require('../models/ReportTemplate');
    const TemplateFieldExtractor = require('../services/templateFieldExtractor');

    const { id: schoolId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(schoolId).select('name code isActive');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    if (!school.isActive) {
      return res.status(403).json({ success: false, message: 'Cannot upload template for a suspended school' });
    }

    const {
      name,
      description,
      htmlContent,
      cssContent,
      templateType = 'annual',
      applicableExams,
      isDefault = false,
      config,
      // ── Class-group targeting (new) ────────────────────────────────
      classGroupName    = '',
      classRangeFrom    = null,
      classRangeTo      = null,
      applicableClassIds = [],
      // ── Lifecycle status ────────────────────────────────────────
      templateStatus    = 'published',
    } = req.body;

    if (!name || !htmlContent) {
      return res.status(400).json({ success: false, message: 'name and htmlContent are required' });
    }

    // Extract dynamic fields + run advisory schema validation
    const extraction  = TemplateFieldExtractor.extractFields(htmlContent);
    const classified  = TemplateFieldExtractor.extractAndClassify(htmlContent);
    const validation  = TemplateFieldExtractor.validateAgainstSchema(htmlContent);

    // If this template is set as default, unset any existing default of same type for this school
    if (isDefault) {
      await ReportTemplate.updateMany(
        { schoolId, templateType, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = await ReportTemplate.create({
      name: name.trim(),
      description: description || '',
      htmlContent,
      cssContent: cssContent || '',
      extractedFields: extraction.fields,
      // ── NEW: store classified schema for teacher form generation ──────────
      templateSchema: classified,
      templateType,
      applicableExams: applicableExams || [],
      isDefault,
      config: config || {},
      // ── Class-group targeting ─────────────────────────────────────────────
      classGroupName,
      classRangeFrom:     classRangeFrom     != null ? Number(classRangeFrom)     : null,
      classRangeTo:       classRangeTo       != null ? Number(classRangeTo)       : null,
      applicableClassIds: Array.isArray(applicableClassIds) ? applicableClassIds : [],
      // ── Lifecycle status ──────────────────────────────────────────────────
      templateStatus,
      createdBySuperAdmin: req.superAdmin._id,
      schoolId,
    });

    logger.info('[SuperAdmin] Template uploaded for school', {
      schoolId, schoolCode: school.code,
      templateId: template._id, templateName: template.name,
      uploadedBy: req.superAdmin._id,
      extractedFieldCount: extraction.fields?.length || 0,
      marksFields: classified.marksFields,
    });

    return res.status(201).json({
      success: true,
      message: `Template "${name}" uploaded for ${school.name}`,
      data: {
        templateId: template._id,
        name: template.name,
        templateType: template.templateType,
        templateStatus: template.templateStatus,
        isDefault: template.isDefault,
        classGroupName: template.classGroupName,
        classRangeFrom: template.classRangeFrom,
        classRangeTo:   template.classRangeTo,
        extractedFields: extraction.fields,
        // ── NEW: classified schema for frontend awareness ──
        templateSchema: {
          fields:      classified.fields,
          marksFields: classified.marksFields,
          metaFields:  classified.metaFields,
        },
        summary: extraction.summary,
        fieldTypes: {
          simple:  extraction.simple,
          objects: extraction.objects,
          arrays:  extraction.arrays,
        },
        // Advisory validation — upload is NEVER blocked
        validation: {
          status:        validation.status,
          unknownFields: validation.unknownFields,
          warnings:      validation.warnings,
        },
        school: { _id: school._id, name: school.name, code: school.code },
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] uploadTemplateForSchool error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/super-admin/schools/:id/templates
 * Lists all report templates for a specific school.
 */
exports.getSchoolTemplates = async (req, res, next) => {
  try {
    const ReportTemplate = require('../models/ReportTemplate');

    const { id: schoolId } = req.params;
    const { templateType, isActive, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(schoolId).select('name code');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const query = { schoolId };
    if (templateType) query.templateType = templateType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [templates, total] = await Promise.all([
      ReportTemplate.find(query)
        .select('name description templateType isDefault isActive usageCount lastUsedAt createdAt extractedFields classGroupName classRangeFrom classRangeTo applicableClassIds templateStatus createdBySuperAdmin')
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReportTemplate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        school: { _id: school._id, name: school.name, code: school.code },
        templates,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] getSchoolTemplates error', { error: error.message });
    next(error);
  }
};

/**
 * DELETE /api/super-admin/schools/:id/templates/:templateId
 * Super admin deletes a report template from a school.
 */
exports.deleteSchoolTemplate = async (req, res, next) => {
  try {
    const ReportTemplate = require('../models/ReportTemplate');

    const { id: schoolId, templateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid school or template ID' });
    }

    const template = await ReportTemplate.findOne({ _id: templateId, schoolId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found for this school' });
    }

    await ReportTemplate.findByIdAndDelete(templateId);

    logger.info('[SuperAdmin] Template deleted', {
      schoolId, templateId, templateName: template.name,
      deletedBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `Template "${template.name}" deleted successfully`,
    });
  } catch (error) {
    logger.error('[SuperAdmin] deleteSchoolTemplate error', { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/super-admin/schools/:id/templates/:templateId
 * Super admin updates a template’s lifecycle status, class-group targeting,
 * or default flag — WITHOUT requiring a full re-upload.
 */
exports.updateSchoolTemplate = async (req, res, next) => {
  try {
    const ReportTemplate = require('../models/ReportTemplate');

    const { id: schoolId, templateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid school or template ID' });
    }

    const template = await ReportTemplate.findOne({ _id: templateId, schoolId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found for this school' });
    }

    const UPDATABLE = [
      'templateStatus', 'isDefault', 'isActive',
      'classGroupName', 'classRangeFrom', 'classRangeTo', 'applicableClassIds',
      'name', 'description',
    ];

    UPDATABLE.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'classRangeFrom' || field === 'classRangeTo') {
          template[field] = req.body[field] != null ? Number(req.body[field]) : null;
        } else {
          template[field] = req.body[field];
        }
      }
    });

    // If marking as default, clear other defaults for same type + class range
    if (req.body.isDefault === true) {
      await ReportTemplate.updateMany(
        {
          _id:          { $ne: templateId },
          schoolId,
          templateType: template.templateType,
          isDefault:    true,
          classRangeFrom: template.classRangeFrom,
          classRangeTo:   template.classRangeTo,
        },
        { $set: { isDefault: false } }
      );
    }

    await template.save();

    logger.info('[SuperAdmin] Template updated', {
      schoolId, templateId, templateName: template.name,
      updatedFields: Object.keys(req.body),
      updatedBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `Template "${template.name}" updated successfully`,
      data: {
        _id:            template._id,
        name:           template.name,
        templateStatus: template.templateStatus,
        isDefault:      template.isDefault,
        isActive:       template.isActive,
        classGroupName: template.classGroupName,
        classRangeFrom: template.classRangeFrom,
        classRangeTo:   template.classRangeTo,
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] updateSchoolTemplate error', { error: error.message });
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSION FORM TEMPLATE MANAGEMENT (Super Admin — cross-school)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/super-admin/schools/:id/admission-templates
 * Super admin uploads an HTML/CSS admission form template for a specific school.
 */
exports.uploadAdmissionTemplateForSchool = async (req, res, next) => {
  try {
    const AdmissionTemplate      = require('../models/AdmissionTemplate');
    const TemplateFieldExtractor = require('../services/templateFieldExtractor');

    const { id: schoolId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(schoolId).select('name code isActive');
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    if (!school.isActive) return res.status(403).json({ success: false, message: 'Cannot upload template for a suspended school' });

    const {
      name,
      description = '',
      htmlContent,
      cssContent   = '',
      isDefault    = false,
      templateStatus = 'published',
      config         = {},
    } = req.body;

    if (!name || !htmlContent) {
      return res.status(400).json({ success: false, message: 'name and htmlContent are required' });
    }

    // Extract fields from HTML placeholders
    const extraction = TemplateFieldExtractor.extractFields(htmlContent);

    // Unset existing default for this school if needed
    if (isDefault) {
      await AdmissionTemplate.updateMany({ schoolId, isDefault: true }, { $set: { isDefault: false } });
    }

    const template = await AdmissionTemplate.create({
      name: name.trim(),
      description,
      htmlContent,
      cssContent,
      extractedFields: extraction.fields || [],
      isDefault,
      templateStatus,
      config,
      createdBySuperAdmin: req.superAdmin._id,
      schoolId,
    });

    logger.info('[SuperAdmin] Admission template uploaded for school', {
      schoolId, schoolCode: school.code,
      templateId: template._id, templateName: template.name,
      uploadedBy: req.superAdmin._id,
      fieldCount: extraction.fields?.length || 0,
    });

    // ── Sync activeTemplateId when template is uploaded as default ────────────
    if (isDefault) {
      const AdmissionFormSettings = require('../models/AdmissionFormSettings');
      await AdmissionFormSettings.findOneAndUpdate(
        { schoolId },
        { $set: { activeTemplateId: template._id } },
        { upsert: true }
      );
    }

    return res.status(201).json({
      success: true,
      message: `Admission template "${name}" uploaded for ${school.name}`,
      data: {
        templateId:      template._id,
        name:            template.name,
        templateStatus:  template.templateStatus,
        isDefault:       template.isDefault,
        extractedFields: extraction.fields,
        summary:         extraction.summary,
        school: { _id: school._id, name: school.name, code: school.code },
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] uploadAdmissionTemplateForSchool error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/super-admin/schools/:id/admission-templates
 * Lists all admission templates for a specific school.
 */
exports.getSchoolAdmissionTemplates = async (req, res, next) => {
  try {
    const AdmissionTemplate = require('../models/AdmissionTemplate');

    const { id: schoolId } = req.params;
    const { isActive, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    const school = await School.findById(schoolId).select('name code');
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    const query = { schoolId, isDeleted: { $ne: true } };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [templates, total] = await Promise.all([
      AdmissionTemplate.find(query)
        .select('name description isDefault isActive usageCount lastUsedAt createdAt extractedFields templateStatus createdBySuperAdmin config')
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AdmissionTemplate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        school: { _id: school._id, name: school.name, code: school.code },
        templates,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] getSchoolAdmissionTemplates error', { error: error.message });
    next(error);
  }
};

/**
 * DELETE /api/super-admin/schools/:id/admission-templates/:templateId
 */
exports.deleteSchoolAdmissionTemplate = async (req, res, next) => {
  try {
    const AdmissionTemplate = require('../models/AdmissionTemplate');

    const { id: schoolId, templateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid school or template ID' });
    }

    const template = await AdmissionTemplate.findOne({ _id: templateId, schoolId });
    if (!template) return res.status(404).json({ success: false, message: 'Admission template not found for this school' });

    // Soft-delete
    template.isDeleted = true;
    template.isActive  = false;
    await template.save();

    logger.info('[SuperAdmin] Admission template deleted', {
      schoolId, templateId, templateName: template.name,
      deletedBy: req.superAdmin._id,
    });

    return res.status(200).json({ success: true, message: `Admission template "${template.name}" deleted successfully` });
  } catch (error) {
    logger.error('[SuperAdmin] deleteSchoolAdmissionTemplate error', { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/super-admin/schools/:id/admission-templates/:templateId
 * Update status, isDefault, isActive — no re-upload needed.
 */
exports.updateSchoolAdmissionTemplate = async (req, res, next) => {
  try {
    const AdmissionTemplate = require('../models/AdmissionTemplate');

    const { id: schoolId, templateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid school or template ID' });
    }

    const template = await AdmissionTemplate.findOne({ _id: templateId, schoolId });
    if (!template) return res.status(404).json({ success: false, message: 'Admission template not found for this school' });

    const UPDATABLE = ['templateStatus', 'isDefault', 'isActive', 'name', 'description'];
    UPDATABLE.forEach((field) => { if (req.body[field] !== undefined) template[field] = req.body[field]; });

    if (req.body.isDefault === true) {
      await AdmissionTemplate.updateMany(
        { _id: { $ne: templateId }, schoolId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    await template.save();

    // ── Sync activeTemplateId in AdmissionFormSettings ────────────────────────
    // When a template is marked default by Super Admin, persist to the
    // AdmissionFormSettings so the PDF generation pipeline resolves it automatically.
    if (req.body.isDefault === true) {
      const AdmissionFormSettings = require('../models/AdmissionFormSettings');
      await AdmissionFormSettings.findOneAndUpdate(
        { schoolId },
        { $set: { activeTemplateId: templateId } },
        { upsert: true }
      );
    }

    logger.info('[SuperAdmin] Admission template updated', {
      schoolId, templateId, templateName: template.name,
      updatedFields: Object.keys(req.body), updatedBy: req.superAdmin._id,
    });

    return res.status(200).json({
      success: true,
      message: `Admission template "${template.name}" updated successfully`,
      data: { _id: template._id, name: template.name, templateStatus: template.templateStatus, isDefault: template.isDefault, isActive: template.isActive },
    });
  } catch (error) {
    logger.error('[SuperAdmin] updateSchoolAdmissionTemplate error', { error: error.message });
    next(error);
  }
};


exports.getTemplateFields = async (req, res, next) => {
  try {
    const ReportTemplate      = require('../models/ReportTemplate');
    const ExamSubjectConfig   = require('../models/ExamSubjectConfig');
    const Exam                = require('../models/Exam');
    const TemplateFieldExtractor = require('../services/templateFieldExtractor');

    const { templateId } = req.params;
    const { examId, classId } = req.query;
    const schoolId = req.schoolId;   // set by varifyToken middleware

    // ── Resolve the template ─────────────────────────────────────────────────
    let template = null;
    if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
      template = await ReportTemplate.findOne({ _id: templateId, schoolId, isActive: true })
        .select('name templateSchema htmlContent').lean();
    }
    if (!template) {
      template = await ReportTemplate.findOne({ schoolId, isActive: true, isDefault: true })
        .select('name templateSchema htmlContent').lean();
    }
    if (!template) {
      return res.status(404).json({ success: false, message: 'No active template found for this school' });
    }

    // ── Ensure templateSchema is populated (re-extract if old template) ──────
    let schema = template.templateSchema;
    if (!schema || !schema.fields || schema.fields.length === 0) {
      schema = TemplateFieldExtractor.extractAndClassify(template.htmlContent);
    }

    // ── Fetch max marks from ExamSubjectConfig (FULLY DYNAMIC — no hardcoded types) ──
    let maxMarksMap = {};  // subjectSlug → { componentType → maxMarks }
    if (examId && classId && mongoose.Types.ObjectId.isValid(examId) && mongoose.Types.ObjectId.isValid(classId)) {
      const configs = await ExamSubjectConfig.find({ examId, classId, schoolId })
        .populate('subjectId', 'name').lean();
      configs.forEach(cfg => {
        const subName = (cfg.subjectId?.name || '').toLowerCase().replace(/[\s\-]/g, '_');
        const compMap = {};
        if (Array.isArray(cfg.marksDistribution) && cfg.marksDistribution.length > 0) {
          cfg.marksDistribution.forEach(d => { compMap[d.type] = d.maxMarks; });
        }
        // Fallback: if marksDistribution is empty, store maxMarks under 'total'
        if (Object.keys(compMap).length === 0 && cfg.maxMarks) {
          compMap['total'] = cfg.maxMarks;
        }
        maxMarksMap[subName] = compMap;
      });
    }

    // ── Group marks fields by subject ────────────────────────────────────────
    const subjectMap = {};
    const otherFields = [];

    (schema.fields || []).forEach(field => {
      if (field.category === 'marks' && field.subject) {
        if (!subjectMap[field.subject]) {
          subjectMap[field.subject] = {
            slug: field.subject,
            name: field.subject.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            fields: [],
          };
        }
        const subMaxMap = maxMarksMap[field.subject] || {};
        subjectMap[field.subject].fields.push({
          key:      field.name,
          label:    field.component
            ? field.component.charAt(0).toUpperCase() + field.component.slice(1) + ' Marks'
            : field.label,
          component: field.component,
          maxMarks:  subMaxMap[field.component] || subMaxMap['theory'] || 0,
        });
      } else if (!['meta', 'derived'].includes(field.category) && !field.isLoop) {
        otherFields.push({
          key:   field.name,
          label: field.label,
          category: field.category,
        });
      }
    });

    const subjects = Object.values(subjectMap);

    return res.status(200).json({
      success: true,
      data: {
        templateId: template._id,
        templateName: template.name,
        subjects,
        otherFields,
        allMarksFields: schema.marksFields || [],
      },
    });
  } catch (error) {
    logger.error('[SuperAdmin] getTemplateFields error', { error: error.message });
    next(error);
  }
};
