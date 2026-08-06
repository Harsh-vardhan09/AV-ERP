// Roles are transcribed from the route file as-is. Nothing reads this map yet —
// the routes still call authorizeRoles directly with the arrays below
const LIBRARIAN_AND_ADMIN = ['librarian', 'admin'];
const ADMIN_ONLY          = ['admin'];
const STUDENT_ONLY        = ['student'];

const permissions = {
  'library.dashboard.view':      LIBRARIAN_AND_ADMIN,

  'library.books.list':          LIBRARIAN_AND_ADMIN,
  'library.books.search':        LIBRARIAN_AND_ADMIN,
  'library.books.view':          LIBRARIAN_AND_ADMIN,
  'library.books.create':        LIBRARIAN_AND_ADMIN,
  'library.books.update':        LIBRARIAN_AND_ADMIN,
  'library.books.delete':        LIBRARIAN_AND_ADMIN,

  'library.students.search':     LIBRARIAN_AND_ADMIN,

  'library.issues.create':       LIBRARIAN_AND_ADMIN,
  'library.issues.list':         LIBRARIAN_AND_ADMIN,
  'library.issues.viewByStudent':LIBRARIAN_AND_ADMIN,
  'library.issues.return':       LIBRARIAN_AND_ADMIN,

  'library.reminders.viewOwn':   STUDENT_ONLY,

  'library.librarians.create':           ADMIN_ONLY,
  'library.librarians.list':             ADMIN_ONLY,
  'library.librarians.update':           ADMIN_ONLY,
  'library.librarians.toggleStatus':     ADMIN_ONLY,
  'library.librarians.resendCredentials':ADMIN_ONLY,
};

module.exports = permissions;
module.exports.LIBRARIAN_AND_ADMIN = LIBRARIAN_AND_ADMIN;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
module.exports.STUDENT_ONLY = STUDENT_ONLY;
