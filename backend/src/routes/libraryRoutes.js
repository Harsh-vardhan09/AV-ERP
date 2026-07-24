/**
 * Library Routes
 * ──────────────
 * All routes are mounted at /api/v1/library (see backend/index.js).
 * Auth chain: varifyToken → authorize(roles) → controller.
 * No modifications to any other route file.
 */
const express = require('express');
const router  = express.Router();

const { varifyToken }    = require('../middlewares/varifyToken');
const { authorizeRoles } = require('../middlewares/authorizeRoles');

const validateObjectId = require('../middlewares/validateObjectId');
const { uploadMemory } = require('../middlewares/multer');

const ctrl = require('../controller/libraryController');

// ── Convenience alias ─────────────────────────────────────────────────────────
const authorize = (...roles) => authorizeRoles(...roles);

// ── Roles ─────────────────────────────────────────────────────────────────────
const LIBRARIAN_AND_ADMIN = ['librarian', 'admin'];
const STUDENT_ONLY        = ['student'];


// ── Apply JWT auth to all library routes ─────────────────────────────────────
router.use(varifyToken);

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// GET /api/v1/library/dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard', authorize(...LIBRARIAN_AND_ADMIN), ctrl.getDashboard);

// ─────────────────────────────────────────────────────────────────────────────
// BOOK MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// Search books (must come before /:id to avoid route conflict)
router.get('/books/search', authorize(...LIBRARIAN_AND_ADMIN), ctrl.searchBooks);

// List all books
router.get('/books', authorize(...LIBRARIAN_AND_ADMIN), ctrl.listBooks);

// Get single book
router.get('/books/:id', authorize(...LIBRARIAN_AND_ADMIN), validateObjectId('id'), ctrl.getBook);

// Create book (with optional cover image upload)
router.post(
  '/books',
  authorize(...LIBRARIAN_AND_ADMIN),
  uploadMemory.single('coverImage'),
  ctrl.createBook
);

// Update book
router.put(
  '/books/:id',
  authorize(...LIBRARIAN_AND_ADMIN),
  validateObjectId('id'),
  uploadMemory.single('coverImage'),
  ctrl.updateBook
);

// Soft delete book
router.delete(
  '/books/:id',
  authorize(...LIBRARIAN_AND_ADMIN),
  validateObjectId('id'),
  ctrl.deleteBook
);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT SEARCH
// GET /api/v1/library/students/search?q=john
// ─────────────────────────────────────────────────────────────────────────────
router.get('/students/search', authorize(...LIBRARIAN_AND_ADMIN), ctrl.searchStudents);

// ─────────────────────────────────────────────────────────────────────────────
// BOOK ISSUE & RETURN
// ─────────────────────────────────────────────────────────────────────────────

// Issue a book
router.post('/issues', authorize(...LIBRARIAN_AND_ADMIN), ctrl.issueBook);

// List all issues (with filters: status, studentId, dateFrom, dateTo)
router.get('/issues', authorize(...LIBRARIAN_AND_ADMIN), ctrl.listIssues);

// Get issues for a specific student
router.get(
  '/issues/student/:studentId',
  authorize(...LIBRARIAN_AND_ADMIN),
  validateObjectId('studentId'),
  ctrl.getStudentIssues
);

// Return a book
router.put(
  '/issues/:id/return',
  authorize(...LIBRARIAN_AND_ADMIN),
  validateObjectId('id'),
  ctrl.returnBook
);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT SELF-SERVICE — reminder only (student role)
// GET /api/v1/library/reminders/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reminders/me', authorize(...STUDENT_ONLY), ctrl.getStudentReminders);

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARIAN ACCOUNT MANAGEMENT — admin only
// All operations are strictly scoped to req.schoolId (set by varifyToken).
// ─────────────────────────────────────────────────────────────────────────────

// Create librarian account with auto-generated credentials
router.post('/librarians', authorize('admin'), ctrl.createLibrarian);

// List all librarians for this school
router.get('/librarians', authorize('admin'), ctrl.listLibrarians);

// Update librarian name / phone
router.put('/librarians/:id', authorize('admin'), validateObjectId('id'), ctrl.updateLibrarian);

// Activate or deactivate a librarian
router.patch('/librarians/:id/status', authorize('admin'), validateObjectId('id'), ctrl.toggleLibrarianStatus);

// Regenerate temp password and resend credentials email
router.post('/librarians/:id/resend-credentials', authorize('admin'), validateObjectId('id'), ctrl.resendLibrarianCredentials);

module.exports = router;
