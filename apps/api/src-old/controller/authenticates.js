const { User } = require("../models/user.js");
const StudentProfile = require("../models/StudentProfile");
const School = require("../models/School");
const bcryptjs = require('bcryptjs');
const { genereteVarificationCode } = require("../features/genereteVarificationCode.js");
const { genereteTokenAndCookies } = require("../features/generateTokenAndCookies.js");
const crypto = require('crypto');
const logger = require('../../src/core/logging/logger.js');

/**
 * Signup — creates a minimal User account.
 * Profile (StudentProfile/TeacherProfile) is created separately by admission department.
 */
exports.signup = async (req, res, next) => {
  const { firstName, lastName, email, password, phone, role = 'student', schoolId } = req.body;

  try {
    // Multi-tenancy: schoolId is MANDATORY for all users
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'schoolId is required. Use the admin provisioning endpoint to create school users.'
      });
    }

    // Check if user already exists in THIS school (not globally)
    const existingUser = await User.findOne({ email: email?.toLowerCase().trim(), schoolId });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists in this school'
      });
    }

    const hashPassword = await bcryptjs.hash(password || '12345678', 10);
    const varificationToken = genereteVarificationCode();

    const user = new User({
      firstName,
      lastName,
      email: email?.toLowerCase().trim(),
      phone,
      password: hashPassword,
      role,
      schoolId,
      varificationToken,
      varificationTokenExpired: Date.now() + 24 * 60 * 60 * 1000
    });

    await user.save();
    const token = genereteTokenAndCookies(res, user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        isActive: user.isActive
      },
      token
    });
  } catch (error) {
    logger.error('Signup error', { error: error.message });
    return next(error);
  }
};

/**
 * Login — supports all roles. Requires schoolCode for data isolation.
 * Body: { email?, rollNo?, password, schoolCode }
 */
exports.login = async (req, res, next) => {
  const { email, rollNo, password, schoolCode, role } = req.body;
  const loginId = (email || rollNo || '').trim();

  try {
    // ── 1. Resolve school from code ──────────────────────────────────────────
    if (!schoolCode) {
      return res.status(400).json({ success: false, message: 'School code is required' });
    }
    const school = await School.findByCode(schoolCode);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found. Check your school code.' });
    }
    if (!school.isActive) {
      return res.status(403).json({ success: false, message: 'This school account is inactive. Contact the platform support.' });
    }

    // ── 2. Find user scoped to this school ───────────────────────────────────
    let user = null;
    let studentProfile = null;

    if (loginId.includes('@')) {
      user = await User.findOne({ email: loginId.toLowerCase().trim(), schoolId: school._id });
    } else if (loginId) {
      // Roll number login — find StudentProfile scoped to this school
      studentProfile = await StudentProfile.findOne({ rollNo: loginId, schoolId: school._id }).select('userId rollNo');
      if (studentProfile) {
        user = await User.findById(studentProfile.userId);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in this school' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact admin.' });
    }

    // ── 3. Verify password ───────────────────────────────────────────────────
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // ── ROLE VALIDATION ──────────────────────────────────────────────────────
    // role is sent from the frontend dropdown.
    // It MUST match the actual role stored in the DB.
    // Check is skipped when role is not sent (backward-compatible).
    if (role) {
      // Normalize: frontend sends 'Student', DB stores 'student'
      const normalizedRequested = role.toLowerCase().trim();
      const actualRole          = user.role.toLowerCase().trim();
      const allowedLoginRoles   = new Set(['admin', 'teacher', 'student', 'admission', 'accounts', 'librarian', 'exam_controller']);

      if (!allowedLoginRoles.has(normalizedRequested)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid login role selected.'
        });
      }

      if (normalizedRequested !== actualRole) {
        // Generic message — do NOT reveal what the actual role is
        return res.status(403).json({
          success: false,
          message: 'Invalid credentials for selected role. Please select the correct role.'
        });
      }
    }
    // ── END ROLE VALIDATION ──────────────────────────────────────────────────

    // ── 4. Update last login ─────────────────────────────────────────────────
    user.lastLogin = Date.now();
    await user.save();

    const token = genereteTokenAndCookies(res, user._id);

    if (!studentProfile && user.role === 'student') {
      studentProfile = await StudentProfile.findOne({ userId: user._id }).select('rollNo');
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone,
        schoolId: user.schoolId,
        oasesRole: user.oasesRole || null,   // ← OASES Sprint 1
        rollNo: studentProfile?.rollNo,
        mustChangePassword: user.mustChangePassword === true  // ← Staff onboarding flag
      },
      token
    });
  } catch (e) {
    logger.error('Login error', { error: e.message });
    return next(e);
  }
};

/**
 * Logout
 */
exports.logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    return res.status(200).json({
      success: true,
      message: "User logged out successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to logout"
    });
  }
};

/**
 * Verify email via OTP
 */
exports.varifyemail = async (req, res, next) => {
  const { otp } = req.body;
  try {
    const user = await User.findOne({
      varificationToken: otp,
      varificationTokenExpired: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid verification code"
      });
    }

    user.isVerified = true;
    user.varificationToken = undefined;
    user.varificationTokenExpired = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verification successful"
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Email verification error"
    });
  }
};

/**
 * Reset password — send email with reset link
 */
exports.resetPassword = async (req, res, next) => {
  const { email, schoolCode } = req.body;
  try {
    // ── Resolve school to prevent cross-tenant password resets ──────────────
    if (!schoolCode) {
      return res.status(400).json({ success: false, message: 'School code is required for password reset' });
    }
    const school = await School.findByCode(schoolCode);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Scope lookup to this school only
    const user = await User.findOne({ email: email?.toLowerCase().trim(), schoolId: school._id });
    if (!user) {
      // Return generic message to avoid email enumeration
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a reset link has been sent'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    // FIX 16: Hash before storing — plain token goes in email link, only hash in DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpired = Date.now() + 3600000;
    await user.save();

    // TODO: Send reset password email with resetToken (NOT hashedToken) in the link:
    //       /forgot-password/${resetToken}
    // The link contains the raw token; verification will hash it and compare to DB.
    logger.info('Password reset token generated', { userId: user._id });
    return res.status(200).json({
      success: true,
      message: 'If this email is registered, a reset link has been sent'
    });
  } catch (e) {
    logger.error('Reset password error', { error: e.message });
    return next(e);
  }
};

/**
 * Change password using reset token
 */
exports.changePassword = async (req, res, next) => {
  const { token } = req.params;
  const { password, password2 } = req.body;

  try {
    // FIX 16: Hash the submitted token so we can compare against the stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpired: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired reset password token"
      });
    }

    if (password !== password2) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const hashPassword = await bcryptjs.hash(password, 10);
    user.password = hashPassword;
    // FIX 16: Clear the token fields after successful password change
    user.resetPasswordToken = undefined;
    user.resetPasswordExpired = undefined;
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Server error: Unable to change password"
    });
  }
};

/**
 * Check auth — returns current user info
 */
exports.cheakauth = async (req, res, next) => {
  try {
    // Safe: req.user._id comes from our verified JWT — no cross-tenant risk
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User found', user });
  } catch (e) {
    return next(e);
  }
};

/**
 * Get all users (admin only — scoped to same school)
 */
exports.alluser = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;
    const filter = { schoolId: req.schoolId };  // ← data isolation
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter).select('-password');
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    return next(error);
  }
};

/**
 * Activate user account
 */
exports.activateUser = async (req, res, next) => {
  try {
    // SECURITY: scope by schoolId to prevent cross-tenant user activation
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      user
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Deactivate user account
 */
exports.deactivateUser = async (req, res, next) => {
  try {
    // SECURITY: scope by schoolId to prevent cross-tenant user deactivation
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      user
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Force first-login password change.
 * Called when mustChangePassword === true after login.
 * Route: POST /api/v1/user/change-first-password  (requires varifyToken)
 */
exports.changeFirstPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user._id;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'newPassword and confirmPassword are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Password strength: must contain uppercase, lowercase, and a digit
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasDigit) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, and a number'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent reusing the temporary password
    const isSame = await bcryptjs.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your temporary password'
      });
    }

    const hashed = await bcryptjs.hash(newPassword, 12);
    user.password           = hashed;
    user.mustChangePassword = false;  // clear the flag
    user.isVerified         = true;
    await user.save();

    // Send confirmation email (non-blocking)
    try {
      const school = await School.findById(user.schoolId).select('name');
      const { sendPasswordChangedNotification } = require('../utils/emailService');
      await sendPasswordChangedNotification({
        to:         user.email,
        userName:   `${user.firstName} ${user.lastName}`,
        schoolName: school?.name || 'Your School'
      });
    } catch (_emailErr) { /* non-blocking — do not fail the response */ }

    logger.info('First-login password changed', { userId: user._id });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. You can now use the portal.',
      data: { mustChangePassword: false }
    });
  } catch (error) {
    next(error);
  }
};
