/**
 * Library Service Layer
 * ─────────────────────
 * All business logic for the library module lives here.
 * Controllers are thin wrappers that call these methods.
 *
 * Key safety principles:
 *  - Every query is scoped with { schoolId } — multi-tenant isolation
 *  - Book issue and return use MongoDB sessions (atomic transactions)
 *  - Overdue is computed dynamically (never stored as stale state)
 *  - availableQuantity is only mutated inside transactions
 */
const mongoose = require('mongoose');
const LibraryBook = require('../models/LibraryBook');
const BookIssue   = require('../models/BookIssue');
const StudentProfile = require('../models/StudentProfile');
const logger = require('../utils/logger');

// ─── Helper: compute effective status (adds overdue layer) ───────────────────
const effectiveStatus = (issue) => {
  if (issue.status === 'returned') return 'returned';
  if (new Date(issue.dueDate) < new Date()) return 'overdue';
  return 'issued';
};

// ─── Helper: enrich issue array with computed status ────────────────────────
const enrichIssues = (issues) =>
  issues.map((i) => ({ ...i, effectiveStatus: effectiveStatus(i) }));

// ============================================================
// DASHBOARD
// ============================================================
exports.getDashboardStats = async (schoolId) => {
  const now = new Date();

  const [totalBooks, totalIssued, overdue, recentIssued, recentReturned] =
    await Promise.all([
      // Total books (not deleted)
      LibraryBook.aggregate([
        { $match: { schoolId, isDeleted: false, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$quantity' }, available: { $sum: '$availableQuantity' } } },
      ]),

      // Total currently issued
      BookIssue.countDocuments({ schoolId, status: 'issued' }),

      // Overdue: issued but dueDate in the past
      BookIssue.countDocuments({ schoolId, status: 'issued', dueDate: { $lt: now } }),

      // Recently issued (last 10)
      BookIssue.find({ schoolId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('bookId', 'title author isbn')
        .populate({
          path: 'studentId',
          select: 'firstName lastName admissionNumber rollNo classId sectionId',
          populate: [
            { path: 'classId', select: 'name' },
            { path: 'sectionId', select: 'name' },
          ],
        })
        .lean(),

      // Recently returned (last 10)
      BookIssue.find({ schoolId, status: 'returned' })
        .sort({ returnDate: -1 })
        .limit(10)
        .populate('bookId', 'title author isbn')
        .populate({
          path: 'studentId',
          select: 'firstName lastName admissionNumber rollNo classId sectionId',
          populate: [
            { path: 'classId', select: 'name' },
            { path: 'sectionId', select: 'name' },
          ],
        })
        .lean(),
    ]);

  const bookAgg = totalBooks[0] || { total: 0, available: 0 };

  return {
    totalBooks: bookAgg.total,
    availableBooks: bookAgg.available,
    totalIssued,
    overdueCount: overdue,
    recentIssued: enrichIssues(recentIssued),
    recentReturned,
  };
};

// ============================================================
// BOOK CRUD
// ============================================================

exports.createBook = async (data, schoolId, userId) => {
  const {
    title, author, isbn, category, rackNumber,
    quantity, description, status, coverImage,
  } = data;

  // Validate quantity
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 0) {
    const err = new Error('Quantity must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }

  // ISBN uniqueness check per school (friendly error before DB throws 11000)
  if (isbn && isbn.trim()) {
    const exists = await LibraryBook.findOne({
      isbn: isbn.trim(),
      schoolId,
      isDeleted: false,
    });
    if (exists) {
      const err = new Error(`ISBN "${isbn.trim()}" already exists in this school's library.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const book = await LibraryBook.create({
    schoolId,
    title: title.trim(),
    author: author.trim(),
    isbn: isbn?.trim() || undefined,
    category: category?.trim() || 'General',
    rackNumber: rackNumber?.trim() || '',
    quantity: qty,
    availableQuantity: qty,   // initially all available
    description: description?.trim() || '',
    coverImage: coverImage || { url: null, publicId: null },
    status: status || 'active',
    createdBy: userId,
    updatedBy: userId,
  });

  return book;
};

exports.listBooks = async (schoolId, filters = {}, pagination = {}) => {
  const { search, category, status = 'active', available } = filters;
  const { page = 1, limit = 20 } = pagination;

  const query = { schoolId, isDeleted: false };

  if (status !== 'all') query.status = status;
  if (category) query.category = category;
  if (available === 'true') query.availableQuantity = { $gt: 0 };

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [
      { title: regex },
      { author: regex },
      { isbn: regex },
      { category: regex },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [books, total] = await Promise.all([
    LibraryBook.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    LibraryBook.countDocuments(query),
  ]);

  return {
    books,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.getBook = async (bookId, schoolId) => {
  const book = await LibraryBook.findOne({
    _id: bookId,
    schoolId,
    isDeleted: false,
  })
    .populate('createdBy', 'firstName lastName')
    .lean();

  if (!book) {
    const err = new Error('Book not found');
    err.statusCode = 404;
    throw err;
  }
  return book;
};

exports.updateBook = async (bookId, data, schoolId, userId) => {
  const book = await LibraryBook.findOne({ _id: bookId, schoolId, isDeleted: false });
  if (!book) {
    const err = new Error('Book not found');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    'title', 'author', 'isbn', 'category', 'rackNumber',
    'description', 'status',
  ];

  allowedFields.forEach((key) => {
    if (data[key] !== undefined) book[key] = data[key];
  });

  // Quantity update: recalculate availableQuantity delta
  if (data.quantity !== undefined) {
    const newQty = parseInt(data.quantity, 10);
    if (isNaN(newQty) || newQty < 0) {
      const err = new Error('Quantity must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }
    const delta = newQty - book.quantity;
    const newAvailable = book.availableQuantity + delta;
    if (newAvailable < 0) {
      const err = new Error(
        `Cannot reduce quantity — ${book.quantity - book.availableQuantity} copies are currently issued.`
      );
      err.statusCode = 400;
      throw err;
    }
    book.quantity = newQty;
    book.availableQuantity = newAvailable;
  }

  // Cover image update (from controller after Cloudinary upload)
  if (data.coverImage) book.coverImage = data.coverImage;

  book.updatedBy = userId;
  await book.save();
  return book;
};

exports.softDeleteBook = async (bookId, schoolId, userId) => {
  const book = await LibraryBook.findOne({ _id: bookId, schoolId, isDeleted: false });
  if (!book) {
    const err = new Error('Book not found');
    err.statusCode = 404;
    throw err;
  }

  // Prevent deletion if there are active issues
  const activeIssues = await BookIssue.countDocuments({
    bookId,
    schoolId,
    status: 'issued',
  });
  if (activeIssues > 0) {
    const err = new Error(
      `Cannot delete book — ${activeIssues} copy(ies) are currently issued.`
    );
    err.statusCode = 400;
    throw err;
  }

  book.isDeleted = true;
  book.deletedAt = new Date();
  book.deletedBy = userId;
  book.status = 'inactive';
  await book.save();
  return { success: true };
};

exports.searchBooks = async (schoolId, query) => {
  if (!query || !query.trim()) return [];
  const regex = new RegExp(query.trim(), 'i');
  return LibraryBook.find({
    schoolId,
    isDeleted: false,
    status: 'active',
    $or: [{ title: regex }, { author: regex }, { isbn: regex }],
  })
    .select('title author isbn availableQuantity quantity rackNumber category coverImage')
    .limit(20)
    .lean();
};

// ============================================================
// STUDENT SEARCH
// ============================================================

exports.searchStudents = async (query, schoolId) => {
  if (!query || !query.trim() || query.trim().length < 2) return [];

  const q     = query.trim();
  const words = q.split(' ').filter(Boolean);
  const regex = new RegExp(q, 'i');

  const filter = {
    schoolId,
    isDeleted: false,
    status: 'active',
  };

  if (words.length > 1) {
    filter.$or = [
      {
        $and: [
          { firstName: new RegExp(words[0], 'i') },
          { lastName: new RegExp(words[1], 'i') },
        ],
      },
      { admissionNumber: regex },
      { rollNo: regex },
    ];
  } else {
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { admissionNumber: regex },
      { rollNo: regex },
    ];
  }

  const students = await StudentProfile.find(filter)
    .select('firstName middleName lastName admissionNumber rollNo classId sectionId')
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .limit(15)
    .lean();

  // Attach current issued books count
  const studentIds = students.map((s) => s._id);
  const issueCounts = await BookIssue.aggregate([
    { $match: { schoolId, studentId: { $in: studentIds }, status: 'issued' } },
    { $group: { _id: '$studentId', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  issueCounts.forEach(({ _id, count }) => { countMap[String(_id)] = count; });

  return students.map((s) => ({
    ...s,
    currentIssuedCount: countMap[String(s._id)] || 0,
  }));
};

// ============================================================
// BOOK ISSUE  — MongoDB transaction for atomicity
// ============================================================

exports.issueBook = async (data, schoolId, issuedBy) => {
  const { studentId, bookId, issueDate, dueDate, remarks } = data;

  if (!studentId || !bookId || !dueDate) {
    const err = new Error('studentId, bookId, and dueDate are required');
    err.statusCode = 400;
    throw err;
  }

  const due  = new Date(dueDate);
  const iss  = issueDate ? new Date(issueDate) : new Date();

  if (due <= iss) {
    const err = new Error('Due date must be after the issue date');
    err.statusCode = 400;
    throw err;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch and validate book (within transaction)
    const book = await LibraryBook.findOne({
      _id: bookId,
      schoolId,
      isDeleted: false,
      status: 'active',
    }).session(session);

    if (!book) {
      await session.abortTransaction();
      const err = new Error('Book not found or inactive');
      err.statusCode = 404;
      throw err;
    }

    if (book.availableQuantity <= 0) {
      await session.abortTransaction();
      const err = new Error('No copies of this book are currently available');
      err.statusCode = 400;
      throw err;
    }

    // 2. Verify student exists in school
    const student = await StudentProfile.findOne({
      _id: studentId,
      schoolId,
      isDeleted: false,
    }).session(session).select('classId sectionId');

    if (!student) {
      await session.abortTransaction();
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    // 3. Duplicate issue check
    const existingIssue = await BookIssue.findOne({
      schoolId,
      studentId,
      bookId,
      status: 'issued',
    }).session(session);

    if (existingIssue) {
      await session.abortTransaction();
      const err = new Error('This student already has an active issue for this book');
      err.statusCode = 409;
      throw err;
    }

    // 4. Decrement availableQuantity atomically
    await LibraryBook.updateOne(
      { _id: bookId, schoolId, availableQuantity: { $gt: 0 } },
      { $inc: { availableQuantity: -1 } },
      { session }
    );

    // 5. Create issue record
    const [issue] = await BookIssue.create(
      [
        {
          schoolId,
          studentId,
          classId: student.classId,
          sectionId: student.sectionId,
          bookId,
          issuedBy,
          issueDate: iss,
          dueDate: due,
          status: 'issued',
          remarks: remarks?.trim() || '',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    logger.info(`[Library] Book issued: book=${bookId} student=${studentId} by=${issuedBy}`);

    return issue;
  } catch (err) {
    // Abort only if session is still active (not already aborted above)
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ============================================================
// BOOK RETURN — MongoDB transaction for atomicity
// ============================================================

exports.returnBook = async (issueId, schoolId, returnedBy) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const issue = await BookIssue.findOne({
      _id: issueId,
      schoolId,
      status: 'issued',
    }).session(session);

    if (!issue) {
      await session.abortTransaction();
      const err = new Error('Issue record not found or already returned');
      err.statusCode = 404;
      throw err;
    }

    // Increment availableQuantity
    await LibraryBook.updateOne(
      { _id: issue.bookId, schoolId },
      { $inc: { availableQuantity: 1 } },
      { session }
    );

    // Update issue record
    issue.status     = 'returned';
    issue.returnDate = new Date();
    issue.returnedBy = returnedBy;
    await issue.save({ session });

    await session.commitTransaction();
    logger.info(`[Library] Book returned: issue=${issueId} by=${returnedBy}`);

    return issue;
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ============================================================
// LIST ISSUES
// ============================================================

exports.listIssues = async (schoolId, filters = {}, pagination = {}) => {
  const { status, studentId, bookId, search, dateFrom, dateTo } = filters;
  const { page = 1, limit = 20 } = pagination;
  const now = new Date();

  const query = { schoolId };

  // Status filter: 'overdue' is computed, not stored
  if (status === 'overdue') {
    query.status = 'issued';
    query.dueDate = { $lt: now };
  } else if (status === 'issued' || status === 'returned') {
    query.status = status;
  }

  if (studentId) query.studentId = studentId;
  if (bookId)    query.bookId    = bookId;

  if (dateFrom || dateTo) {
    query.issueDate = {};
    if (dateFrom) query.issueDate.$gte = new Date(dateFrom);
    if (dateTo)   query.issueDate.$lte = new Date(dateTo);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [issues, total] = await Promise.all([
    BookIssue.find(query)
      .populate('bookId', 'title author isbn coverImage')
      .populate({
        path: 'studentId',
        select: 'firstName middleName lastName admissionNumber rollNo classId sectionId',
        populate: [
          { path: 'classId',   select: 'name' },
          { path: 'sectionId', select: 'name' },
        ],
      })
      .populate('issuedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    BookIssue.countDocuments(query),
  ]);

  return {
    issues: enrichIssues(issues),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.getStudentIssues = async (studentId, schoolId, includeReturned = false) => {
  const query = { schoolId, studentId };
  if (!includeReturned) query.status = 'issued';

  const issues = await BookIssue.find(query)
    .populate('bookId', 'title author isbn coverImage rackNumber')
    .populate('issuedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .lean();

  return enrichIssues(issues);
};

// ============================================================
// STUDENT REMINDERS (lightweight — called on student login)
// ============================================================

exports.getStudentReminders = async (studentProfileId, schoolId) => {
  const now   = new Date();
  const soon  = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 48h window

  // Find active issues that are overdue or due within 2 days
  const issues = await BookIssue.find({
    schoolId,
    studentId: studentProfileId,
    status: 'issued',
    dueDate: { $lte: soon },   // dueDate <= now+2days (catches overdue + due soon)
  })
    .populate('bookId', 'title author')
    .lean();

  if (!issues.length) return { hasReminder: false, items: [] };

  const items = issues.map((i) => {
    let status = 'due_soon';
    if (i.dueDate < now) status = 'overdue';
    else if (i.dueDate.toDateString() === now.toDateString()) status = 'due_today';

    return {
      issueId:   String(i._id),
      bookTitle: i.bookId?.title || 'Unknown Book',
      author:    i.bookId?.author || '',
      dueDate:   i.dueDate,
      status,
    };
  });

  return { hasReminder: true, items };
};
