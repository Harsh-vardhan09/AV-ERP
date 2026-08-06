const libraryService = require('../services/libraryService');
const { uploadImageToCloud, deleteFromCloud } = require('../../../core/config/storage');
const logger = require('../../../core/logging/logger');
const bcryptjs = require('bcryptjs');
// TEMP: User/StudentProfile move to modules/people; School and the mail
// utils follow when their modules exist
const { User } = require('../../identity');
const School = require('../../tenancy').School;
const StudentProfile = require('../../../../src-old/models/StudentProfile');
const { generateTempPassword } = require('../../identity').generatePassword;
const { sendStaffCredentials } = require('../../notifications').emailService;

const safeUser = (u) => {
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpired;
  delete obj.varificationToken;
  delete obj.varificationTokenExpired;
  return obj;
};

// Logs, then maps a service error onto its HTTP status. Every catch below routes through it
const fail = (res, err, action) => {
  logger.error(`[Library] ${action} error:`, err);
  return res.status(err.statusCode || 500).json({ success: false, message: err.message });
};

const uploadCover = async (file, schoolId) => {
  const result = await uploadImageToCloud(file.buffer, {
    folder: `erp/${schoolId}/library/covers`,
    resource_type: 'image',
  });
  return result ? { url: result.secure_url, publicId: result.public_id } : null;
};

// Librarians are Users pinned to a school and role — never look one up unscoped
const findLibrarian = (id, schoolId) =>
  User.findOne({ _id: id, schoolId, role: 'librarian' });

const sendCredentials = ({ user, tempPassword, school }) =>
  sendStaffCredentials({
    to:         user.email,
    staffName:  `${user.firstName} ${user.lastName}`,
    role:       'librarian',
    schoolName: school?.name || '',
    schoolCode: school?.code || '',
    tempPassword,
    loginUrl:   process.env.CLIENT_URL || 'https://campus.unifiedcampus.com',
  });

exports.getDashboard = async (req, res) => {
  try {
    const data = await libraryService.getDashboardStats(req.schoolId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return fail(res, err, 'getDashboard');
  }
};

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
    if (req.file) {
      coverImage = (await uploadCover(req.file, req.schoolId)) || coverImage;
    }

    const book = await libraryService.createBook(
      { title, author, isbn, category, rackNumber, quantity, description, status, coverImage },
      req.schoolId,
      req.user._id
    );

    return res.status(201).json({ success: true, message: 'Book added successfully', data: book });
  } catch (err) {
    return fail(res, err, 'createBook');
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
    return fail(res, err, 'listBooks');
  }
};

exports.getBook = async (req, res) => {
  try {
    const book = await libraryService.getBook(req.params.id, req.schoolId);
    return res.status(200).json({ success: true, data: book });
  } catch (err) {
    return fail(res, err, 'getBook');
  }
};

exports.updateBook = async (req, res) => {
  try {
    const {
      title, author, isbn, category, rackNumber,
      quantity, description, status,
    } = req.body;

    const data = { title, author, isbn, category, rackNumber, quantity, description, status };

    if (req.file) {
      // Drop the previous Cloudinary asset before replacing the reference
      const oldBook = await libraryService.getBook(req.params.id, req.schoolId);
      if (oldBook?.coverImage?.publicId) {
        await deleteFromCloud(oldBook.coverImage.publicId);
      }
      const coverImage = await uploadCover(req.file, req.schoolId);
      if (coverImage) data.coverImage = coverImage;
    }

    const book = await libraryService.updateBook(req.params.id, data, req.schoolId, req.user._id);
    return res.status(200).json({ success: true, message: 'Book updated successfully', data: book });
  } catch (err) {
    return fail(res, err, 'updateBook');
  }
};

exports.deleteBook = async (req, res) => {
  try {
    await libraryService.softDeleteBook(req.params.id, req.schoolId, req.user._id);
    return res.status(200).json({ success: true, message: 'Book removed from library' });
  } catch (err) {
    return fail(res, err, 'deleteBook');
  }
};

exports.searchBooks = async (req, res) => {
  try {
    const books = await libraryService.searchBooks(req.schoolId, req.query.q);
    return res.status(200).json({ success: true, data: books });
  } catch (err) {
    return fail(res, err, 'searchBooks');
  }
};

exports.searchStudents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }
    const students = await libraryService.searchStudents(q, req.schoolId);
    return res.status(200).json({ success: true, data: students });
  } catch (err) {
    return fail(res, err, 'searchStudents');
  }
};

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
    return fail(res, err, 'issueBook');
  }
};

exports.returnBook = async (req, res) => {
  try {
    const issue = await libraryService.returnBook(req.params.id, req.schoolId, req.user._id);
    return res.status(200).json({ success: true, message: 'Book returned successfully', data: issue });
  } catch (err) {
    return fail(res, err, 'returnBook');
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
    return fail(res, err, 'listIssues');
  }
};

exports.getStudentIssues = async (req, res) => {
  try {
    const includeReturned = req.query.includeReturned === 'true';
    const issues = await libraryService.getStudentIssues(req.params.studentId, req.schoolId, includeReturned);
    return res.status(200).json({ success: true, data: issues });
  } catch (err) {
    return fail(res, err, 'getStudentIssues');
  }
};

exports.getStudentReminders = async (req, res) => {
  try {
    // req.user._id is the User; reminders are keyed by StudentProfile._id
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
    return fail(res, err, 'getStudentReminders');
  }
};

exports.createLibrarian = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const schoolId  = req.schoolId;
    const createdBy = req.user._id;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ success: false, message: 'firstName, lastName, and email are required' });
    }

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

    // A failed credentials email must not undo the account that was just created
    let emailSent = false;
    try {
      const school = await School.findById(schoolId).select('name code').lean();
      await sendCredentials({ user: libUser, tempPassword, school });
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
        tempPassword: emailSent ? undefined : tempPassword, // only surfaced when the email failed
        emailSent,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists in this school' });
    }
    return fail(res, err, 'createLibrarian');
  }
};

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
    return fail(res, err, 'listLibrarians');
  }
};

exports.updateLibrarian = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const lib = await findLibrarian(req.params.id, req.schoolId);
    if (!lib) return res.status(404).json({ success: false, message: 'Librarian not found' });

    if (firstName) lib.firstName = firstName.trim();
    if (lastName)  lib.lastName  = lastName.trim();
    if (phone !== undefined) lib.phone = phone;

    await lib.save();
    return res.status(200).json({ success: true, message: 'Librarian updated', data: { user: safeUser(lib) } });
  } catch (err) {
    return fail(res, err, 'updateLibrarian');
  }
};

exports.toggleLibrarianStatus = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be "activate" or "deactivate"' });
    }

    const lib = await findLibrarian(req.params.id, req.schoolId);
    if (!lib) return res.status(404).json({ success: false, message: 'Librarian not found' });

    lib.isActive = (action === 'activate');
    await lib.save();

    return res.status(200).json({
      success: true,
      message: `Librarian ${action}d successfully`,
      data: { _id: lib._id, isActive: lib.isActive },
    });
  } catch (err) {
    return fail(res, err, 'toggleLibrarianStatus');
  }
};

exports.resendLibrarianCredentials = async (req, res) => {
  try {
    const lib = await findLibrarian(req.params.id, req.schoolId);
    if (!lib) return res.status(404).json({ success: false, message: 'Librarian not found' });

    const tempPassword = generateTempPassword();
    lib.password = await bcryptjs.hash(tempPassword, 12);
    lib.mustChangePassword = true;
    await lib.save();

    const school = await School.findById(req.schoolId).select('name code').lean();
    await sendCredentials({ user: lib, tempPassword, school });

    logger.info('[Library] Librarian credentials resent', { userId: lib._id, schoolId: req.schoolId });

    return res.status(200).json({
      success: true,
      message: `New credentials sent to ${lib.email}. They must change password on next login.`,
    });
  } catch (err) {
    return fail(res, err, 'resendLibrarianCredentials');
  }
};
