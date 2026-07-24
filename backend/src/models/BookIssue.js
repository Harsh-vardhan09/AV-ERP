/**
 * BookIssue Model
 * ───────────────
 * Tracks every book issue transaction (issued → returned).
 * Overdue status is computed server-side on every query — never
 * stored as overdue in DB (avoids stale state). The field `status`
 * stores only `issued` | `returned`; controllers compute `overdue`
 * dynamically from dueDate vs. current date.
 */
const mongoose = require('mongoose');

const bookIssueSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required'],
    index: true,
  },

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile',
    required: [true, 'Student ID is required'],
  },

  // Denormalized for fast dashboard queries (avoids join to StudentProfile)
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassModel',
    default: null,
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SectionModel',
    default: null,
  },

  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LibraryBook',
    required: [true, 'Book ID is required'],
  },

  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Issued-by user is required'],
  },

  issueDate: {
    type: Date,
    required: [true, 'Issue date is required'],
    default: Date.now,
  },

  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },

  returnDate: {
    type: Date,
    default: null,
  },

  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // `issued` | `returned`
  // `overdue` is computed dynamically: status==='issued' && dueDate < now
  status: {
    type: String,
    enum: ['issued', 'returned'],
    default: 'issued',
  },

  remarks: {
    type: String,
    trim: true,
    default: '',
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Active issues by school
bookIssueSchema.index({ schoolId: 1, status: 1 });

// Student's issued books
bookIssueSchema.index({ schoolId: 1, studentId: 1 });

// Issues for a specific book
bookIssueSchema.index({ schoolId: 1, bookId: 1 });

// Overdue detection (find issued books past dueDate)
bookIssueSchema.index({ schoolId: 1, dueDate: 1, status: 1 });

// CRITICAL: Prevent duplicate active issue of same book to same student
// (unique sparse so multiple returned issues for same combo are allowed)
bookIssueSchema.index(
  { schoolId: 1, studentId: 1, bookId: 1, status: 1 },
  {
    name: 'unique_active_issue',
    partialFilterExpression: { status: 'issued' },
    unique: true,
  }
);

// Dashboard recent-issues sort
bookIssueSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('BookIssue', bookIssueSchema);
