const express = require('express');
const router  = express.Router();

const { varifyToken }    = require('../../../core/security/authenticate');
const { authorizeRoles } = require('../../../core/security/authorizeRoles');
const validateObjectId   = require('../../../core/http/validateObjectId');
const { uploadMemory }   = require('../../../core/http/upload.disk');

const ctrl = require('../controllers/libraryController');
const { LIBRARIAN_AND_ADMIN, ADMIN_ONLY, STUDENT_ONLY } = require('../permissions');

router.use(varifyToken);

router.get('/dashboard', authorizeRoles(...LIBRARIAN_AND_ADMIN), ctrl.getDashboard);

// Must precede /books/:id, or 'search' is parsed as an id
router.get('/books/search', authorizeRoles(...LIBRARIAN_AND_ADMIN), ctrl.searchBooks);

router.get('/books', authorizeRoles(...LIBRARIAN_AND_ADMIN), ctrl.listBooks);

router.get('/books/:id', authorizeRoles(...LIBRARIAN_AND_ADMIN), validateObjectId('id'), ctrl.getBook);

router.post(
  '/books',
  authorizeRoles(...LIBRARIAN_AND_ADMIN),
  uploadMemory.single('coverImage'),
  ctrl.createBook
);

router.put(
  '/books/:id',
  authorizeRoles(...LIBRARIAN_AND_ADMIN),
  validateObjectId('id'),
  uploadMemory.single('coverImage'),
  ctrl.updateBook
);

router.delete(
  '/books/:id',
  authorizeRoles(...LIBRARIAN_AND_ADMIN),
  validateObjectId('id'),
  ctrl.deleteBook
);

router.get('/students/search', authorizeRoles(...LIBRARIAN_AND_ADMIN), ctrl.searchStudents);

router.post('/issues', authorizeRoles(...LIBRARIAN_AND_ADMIN), ctrl.issueBook);

router.get('/issues', authorizeRoles(...LIBRARIAN_AND_ADMIN), ctrl.listIssues);

router.get(
  '/issues/student/:studentId',
  authorizeRoles(...LIBRARIAN_AND_ADMIN),
  validateObjectId('studentId'),
  ctrl.getStudentIssues
);

router.put(
  '/issues/:id/return',
  authorizeRoles(...LIBRARIAN_AND_ADMIN),
  validateObjectId('id'),
  ctrl.returnBook
);

router.get('/reminders/me', authorizeRoles(...STUDENT_ONLY), ctrl.getStudentReminders);

// Librarian accounts — every operation is scoped to req.schoolId, set by varifyToken
router.post('/librarians', authorizeRoles(...ADMIN_ONLY), ctrl.createLibrarian);

router.get('/librarians', authorizeRoles(...ADMIN_ONLY), ctrl.listLibrarians);

router.put('/librarians/:id', authorizeRoles(...ADMIN_ONLY), validateObjectId('id'), ctrl.updateLibrarian);

router.patch('/librarians/:id/status', authorizeRoles(...ADMIN_ONLY), validateObjectId('id'), ctrl.toggleLibrarianStatus);

router.post('/librarians/:id/resend-credentials', authorizeRoles(...ADMIN_ONLY), validateObjectId('id'), ctrl.resendLibrarianCredentials);

module.exports = router;
