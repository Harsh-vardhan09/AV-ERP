/**
 * Library Controller
 * ──────────────────
 * Thin HTTP adapter over libraryService.
 * Pattern: validate request → call service → return response.
 * Error propagation uses the existing errorMiddleware.
 */
const libraryService = require('../services/libraryService');
const { uploadImageToCloud, deleteFromCloud } = require('../config/cloudnary');
const logger = require('../utils/logger');
const { User }    = require('../models/user');
const School      = require('../models/School');
const bcryptjs    = require('bcryptjs');
const { generateTempPassword } = require('../utils/generatePassword');
const { sendStaffCredentials } = require('../utils/emailService');

// ─── Helper: strip sensitive fields ─────────────────────────────────────────
const safeUser = (u) => {
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpired;
  delete obj.varificationToken;
  delete obj.varificationTokenExpired;
  return obj;
};


// ─── Helper: parse service error to HTTP status ──────────────────────────────
const serviceError = (res, err) => {
  const status = err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message });
};

// ============================================================
// DASHBOARD
// ============================================================

exports.getDashboard = async (req, res) => {
  try {
    const data = await libraryService.getDashboardStats(req.schoolId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error('[Library] getDashboard error:', err);
    return serviceError(res, err);
  }
};

// ============================================================
// BOOKS
// ============================================================

exports.createBook = async (req, res) => {
  try {
    const { title, author, isbn, category, rackNumber, quantity, description, status } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Book title is required' });
    }
    if (!author?.trim()) {
      return res.status(400).json({ success: false, message: 'Author name is required' });
    }
    if (quantity === undefined || quantity === '') {
      return res.status(400).json({ success: false, message: 'Quantity is required' });
    }

    let coverImage = { url: null, publicId: null };

    // Handle optional cover image upload
    if (req.file) {
      const result = await uploadImageToCloud(req.file.buffer, {
        folder: `erp/${req.schoolId}/library/covers`,
        resource_type: 'image',
      });
      if (result) {
        coverImage = { url: result.secure_url, publicId: result.public_id };
      }
    }

    const book = await libraryService.createBook(
      { title, author, isbn, category, rackNumber, quantity, description, status, coverImage },
      req.schoolId,
      req.user._id
    );

    return res.status(201).json({ success: true, message: 'Book added successfully', data: book });
  } catch (err) {
    logger.error('[Library] createBook error:', err);
    return serviceError(res, err);
  }
};

exports.listBooks = async (req, res) => {
  try {
    const { search, category, status, available, page, limit } = req.query;
    const result = await libraryService.listBooks(
      req.schoolId,
      { search, category, status, available },
      { page, limit }
    );
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('[Library] listBooks error:', err);
    return serviceError(res, err);
  }
};

exports.getBook = async (req, res) => {
  try {
    const book = await libraryService.getBook(req.params.id, req.schoolId);
    return res.status(200).json({ success: true, data: book });
  } catch (err) {
    logger.error('[Library] getBook error:', err);
    return serviceError(res, err);
  }
};

exports.updateBook = async (req, res) => {
  try {
    const {
      title, author, isbn, category, rackNumber,
      quantity, description, status,
    } = req.body;

    const data = { title, author, isbn, category, rackNumber, quantity, description, status };

    // Handle optional cover image replacement
    if (req.file) {
      // Fetch old publicId to clean up Cloudinary
      const { getBook } = require('../services/libraryService');
      const oldBook = await libraryService.getBook(req.params.id, req.schoolId);
      if (oldBook?.coverImage?.publicId) {
        await deleteFromCloud(oldBook.coverImage.publicId);
      }

      const result = await uploadImageToCloud(req.file.buffer, {
        folder: `erp/${req.schoolId}/library/covers`,
        resource_type: 'image',
      });
      if (result) {
        data.coverImage = { url: result.secure_url, publicId: result.public_id };
      }
    }

    const book = await libraryService.updateBook(req.params.id, data, req.schoolId, req.user._id);
    return res.status(200).json({ success: true, message: 'Book updated successfully', data: book });
  } catch (err) {
    logger.error('[Library] updateBook error:', err);
    return serviceError(res, err);
  }
};

exports.deleteBook = async (req, res) => {
  try {
    await libraryService.softDeleteBook(req.params.id, req.schoolId, req.user._id);
    return res.status(200).json({ success: true, message: 'Book removed from library' });
  } catch (err) {
    logger.error('[Library] deleteBook error:', err);
    return serviceError(res, err);
  }
};

exports.searchBooks = async (req, res) => {
  try {
    const { q } = req.query;
    const books = await libraryService.searchBooks(req.schoolId, q);
    return res.status(200).json({ success: true, data: books });
  } catch (err) {
    logger.error('[Library] searchBooks error:', err);
    return serviceError(res, err);
  }
};

// ============================================================
// STUDENT SEARCH
// ============================================================

exports.searchStudents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }
    const students = await libraryService.searchStudents(q, req.schoolId);
    return res.status(200).json({ success: true, data: students });
  } catch (err) {
    logger.error('[Library] searchStudents error:', err);
    return serviceError(res, err);
  }
};

// ============================================================
// BOOK ISSUE / RETURN
// ============================================================

exports.issueBook = async (req, res) => {
  try {
    const { studentId, bookId, issueDate, dueDate, remarks } = req.body;

    if (!studentId || !bookId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'studentId, bookId, and dueDate are required',
      });
    }

    const issue = await libraryService.issueBook(
      { studentId, bookId, issueDate, dueDate, remarks },
      req.schoolId,
      req.user._id
    );

    return res.status(201).json({ success: true, message: 'Book issued successfully', data: issue });
  } catch (err) {
    logger.error('[Library] issueBook error:', err);
    return serviceError(res, err);
  }
};

exports.returnBook = async (req, res) => {
  try {
    const issue = await libraryService.returnBook(
      req.params.id,
      req.schoolId,
      req.user._id
    );
    return res.status(200).json({ success: true, message: 'Book returned successfully', data: issue });
  } catch (err) {
    logger.error('[Library] returnBook error:', err);
    return serviceError(res, err);
  }
};

exports.listIssues = async (req, res) => {
  try {
    const { status, studentId, bookId, search, dateFrom, dateTo, page, limit } = req.query;
    const result = await libraryService.listIssues(
      req.schoolId,
      { status, studentId, bookId, search, dateFrom, dateTo },
      { page, limit }
    );
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('[Library] listIssues error:', err);
    return serviceError(res, err);
  }
};

exports.getStudentIssues = async (req, res) => {
  try {
    const { studentId } = req.params;
    const includeReturned = req.query.includeReturned === 'true';
    const issues = await libraryService.getStudentIssues(studentId, req.schoolId, includeReturned);
    return res.status(200).json({ success: true, data: issues });
  } catch (err) {
    logger.error('[Library] getStudentIssues error:', err);
    return serviceError(res, err);
  }
};

// ============================================================
// STUDENT REMINDER (student role only)
// ============================================================

exports.getStudentReminders = async (req, res) => {
  try {
    // req.user._id is the User document; we need the StudentProfile._id
    const StudentProfile = require('../models/StudentProfile');
    const profile = await StudentProfile.findOne({
      userId: req.user._id,
      schoolId: req.schoolId,
    }).select('_id').lean();

    if (!profile) {
      return res.status(200).json({ hasReminder: false, items: [] });
    }

    const result = await libraryService.getStudentReminders(profile._id, req.schoolId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('[Library] getStudentReminders error:', err);
    return serviceError(res, err);
  }
};

// ============================================================
// LIBRARIAN ACCOUNT MANAGEMENT (admin only, school-scoped)
// ============================================================

// POST /api/v1/library/librarians — create a librarian account
exports.createLibrarian = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const schoolId  = req.schoolId;
    const createdBy = req.user._id;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ success: false, message: 'firstName, lastName, and email are required' });
    }

    // Email uniqueness within school
    const existing = await User.findOne({ email: email.toLowerCase().trim(), schoolId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists in this school' });
    }

    const tempPassword   = generateTempPassword();
    const hashedPassword = await bcryptjs.hash(tempPassword, 12);

    const libUser = await User.create({
      firstName:         firstName.trim(),
      lastName:          lastName.trim(),
      email:             email.toLowerCase().trim(),
      phone:             phone?.trim() || undefined,
      password:          hashedPassword,
      role:              'librarian',
      schoolId,
      isActive:          true,
      isVerified:        true,
      mustChangePassword: true,
      createdBy,
    });

    // Attempt credentials email — non-blocking failure
    let emailSent = false;
    try {
      const school = await School.findById(schoolId).select('name code').lean();
      await sendStaffCredentials({
        to:           libUser.email,
        staffName:    `${firstName} ${lastName}`,
        role:         'librarian',
        schoolName:   school?.name || '',
        schoolCode:   school?.code || '',
        tempPassword,
        loginUrl:     process.env.CLIENT_URL || 'https://campus.unifiedcampus.com',
      });
      emailSent = true;
    } catch (emailErr) {
      logger.error('[Library] createLibrarian email failed:', { userId: libUser._id, error: emailErr.message });
    }

    logger.info('[Library] Librarian created', { userId: libUser._id, schoolId, createdBy, emailSent });

    return res.status(201).json({
      success: true,
      message: emailSent
        ? `Librarian account created. Credentials sent to ${libUser.email}`
        : `Librarian account created. Email delivery failed — credentials: ${libUser.email} / ${tempPassword}`,
      data: {
        user: safeUser(libUser),
        tempPassword: emailSent ? undefined : tempPassword, // expose only when email failed
        emailSent,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists in this school' });
    }
    logger.error('[Library] createLibrarian error:', err);
    return serviceError(res, err);
  }
};

// GET /api/v1/library/librarians — list librarians for this school
exports.listLibrarians = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const filter = { schoolId: req.schoolId, role: 'librarian' };

    if (isActive === 'true')  filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    if (search?.trim()) {
      filter.$or = [
        { firstName: { $regex: search.trim(), $options: 'i' } },
        { lastName:  { $regex: search.trim(), $options: 'i' } },
        { email:     { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const librarians = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpired -varificationToken -varificationTokenExpired')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: { librarians, total: librarians.length } });
  } catch (err) {
    logger.error('[Library] listLibrarians error:', err);
    return serviceError(res, err);
  }
};

// PUT /api/v1/library/librarians/:id — update name/phone
exports.updateLibrarian = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const lib = await User.findOne({ _id: req.params.id, schoolId: req.schoolId, role: 'librarian' });
    if (!lib) return res.status(404).json({ success: false, message: 'Librarian not found' });

    if (firstName) lib.firstName = firstName.trim();
    if (lastName)  lib.lastName  = lastName.trim();
    if (phone !== undefined) lib.phone = phone;

    await lib.save();
    return res.status(200).json({ success: true, message: 'Librarian updated', data: { user: safeUser(lib) } });
  } catch (err) {
    logger.error('[Library] updateLibrarian error:', err);
    return serviceError(res, err);
  }
};

// PATCH /api/v1/library/librarians/:id/status — activate / deactivate
exports.toggleLibrarianStatus = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be "activate" or "deactivate"' });
    }

    const lib = await User.findOne({ _id: req.params.id, schoolId: req.schoolId, role: 'librarian' });
    if (!lib) return res.status(404).json({ success: false, message: 'Librarian not found' });

    lib.isActive = (action === 'activate');
    await lib.save();

    return res.status(200).json({
      success: true,
      message: `Librarian ${action}d successfully`,
      data: { _id: lib._id, isActive: lib.isActive },
    });
  } catch (err) {
    logger.error('[Library] toggleLibrarianStatus error:', err);
    return serviceError(res, err);
  }
};

// POST /api/v1/library/librarians/:id/resend-credentials
exports.resendLibrarianCredentials = async (req, res) => {
  try {
    const lib = await User.findOne({ _id: req.params.id, schoolId: req.schoolId, role: 'librarian' });
    if (!lib) return res.status(404).json({ success: false, message: 'Librarian not found' });

    const tempPassword   = generateTempPassword();
    const hashedPassword = await bcryptjs.hash(tempPassword, 12);
    lib.password          = hashedPassword;
    lib.mustChangePassword = true;
    await lib.save();

    const school = await School.findById(req.schoolId).select('name code').lean();
    await sendStaffCredentials({
      to:         lib.email,
      staffName:  `${lib.firstName} ${lib.lastName}`,
      role:       'librarian',
      schoolName: school?.name || '',
      schoolCode: school?.code || '',
      tempPassword,
      loginUrl:   process.env.CLIENT_URL || 'https://campus.unifiedcampus.com',
    });

    logger.info('[Library] Librarian credentials resent', { userId: lib._id, schoolId: req.schoolId });

    return res.status(200).json({
      success: true,
      message: `New credentials sent to ${lib.email}. They must change password on next login.`,
    });
  } catch (err) {
    logger.error('[Library] resendLibrarianCredentials error:', err);
    return serviceError(res, err);
  }
};
