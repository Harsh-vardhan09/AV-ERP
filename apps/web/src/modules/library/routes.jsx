import { page, redirect } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const MODULE = 'library';

// /admin/library is admin-only — the /admin branch also admits `admission`,
// but the library branch never did.
const ADMIN = [ROLES.ADMIN];
const LIBRARIAN = [ROLES.LIBRARIAN];

const shelfRoutes = (prefix, roles) => [
  { path: prefix, lazy: redirect('dashboard'), handle: { roles, module: MODULE } },
  { path: `${prefix}/dashboard`, lazy: page(() => import('./pages/LibraryDashboard')), handle: { roles, module: MODULE } },
  { path: `${prefix}/books`, lazy: page(() => import('./pages/ManageBooks')), handle: { roles, module: MODULE } },
  { path: `${prefix}/issue`, lazy: page(() => import('./pages/IssueBook')), handle: { roles, module: MODULE } },
  { path: `${prefix}/return`, lazy: page(() => import('./pages/ReturnBook')), handle: { roles, module: MODULE } },
  { path: `${prefix}/issued`, lazy: page(() => import('./pages/IssuedBooks')), handle: { roles, module: MODULE } },
  { path: `${prefix}/overdue`, lazy: page(() => import('./pages/OverdueBooks')), handle: { roles, module: MODULE } },
];

export const libraryRoutes = [
  ...shelfRoutes('admin/library', ADMIN),
  // Librarian management is admin-only; the librarian branch never had it.
  { path: 'admin/library/librarians', lazy: page(() => import('./pages/ManageLibrarians')), handle: { roles: ADMIN, module: MODULE } },

  ...shelfRoutes('librarian', LIBRARIAN),

  { path: 'student/library', lazy: page(() => import('./pages/StudentLibrary')), handle: { roles: [ROLES.STUDENT], module: MODULE } },
];
