// status holds only issued|returned. 'overdue' is derived on read from dueDate,
// so it can never go stale in the database
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

  // Denormalized so the dashboard avoids a join to StudentProfile
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

bookIssueSchema.index({ schoolId: 1, status: 1 });

bookIssueSchema.index({ schoolId: 1, studentId: 1 });

bookIssueSchema.index({ schoolId: 1, bookId: 1 });

bookIssueSchema.index({ schoolId: 1, dueDate: 1, status: 1 });

// Blocks a second active issue of one book to one student; partial filter still
// allows any number of returned rows for the same pair
bookIssueSchema.index(
  { schoolId: 1, studentId: 1, bookId: 1, status: 1 },
  {
    name: 'unique_active_issue',
    partialFilterExpression: { status: 'issued' },
    unique: true,
  }
);

bookIssueSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('BookIssue', bookIssueSchema);
