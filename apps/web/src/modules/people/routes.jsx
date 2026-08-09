import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const ADMIN = [ROLES.ADMIN, ROLES.ADMISSION];

export const peopleRoutes = [
  { path: 'admin/students', lazy: page(() => import('./pages/AdminStudentDirectory')), handle: { roles: ADMIN } },
  { path: 'admin/students/all', lazy: page(() => import('./pages/AllStudents')), handle: { roles: ADMIN } },
  { path: 'admin/students/bulk-edit', lazy: page(() => import('./pages/StudentsBulkEdit')), handle: { roles: ADMIN } },
  { path: 'admin/students/deleted', lazy: page(() => import('./pages/DeletedStudents')), handle: { roles: ADMIN } },
  { path: 'admin/students/passed', lazy: page(() => import('./pages/PassedStudents')), handle: { roles: ADMIN } },
  { path: 'admin/students/dropped', lazy: page(() => import('./pages/DroppedStudents')), handle: { roles: ADMIN } },
  { path: 'admin/students/suspended', lazy: page(() => import('./pages/SuspendedStudents')), handle: { roles: ADMIN } },
  { path: 'admin/students/promotion', lazy: page(() => import('./pages/MigrationPromotion')), handle: { roles: ADMIN } },
  { path: 'admin/students/:id', lazy: page(() => import('./pages/AdminStudentDetail')), handle: { roles: ADMIN } },
  { path: 'admin/students/:id/edit', lazy: page(() => import('./pages/EditStudentPage')), handle: { roles: ADMIN } },

  { path: 'admin/teachers', lazy: page(() => import('./pages/AdminTeacherDirectory')), handle: { roles: ADMIN } },
  { path: 'admin/teachers/all', lazy: page(() => import('./pages/AllTeachers')), handle: { roles: ADMIN } },
  { path: 'admin/teachers/deleted', lazy: page(() => import('./pages/DeletedTeachers')), handle: { roles: ADMIN } },
  { path: 'admin/teachers/:id', lazy: page(() => import('./pages/AdminTeacherDetail')), handle: { roles: ADMIN } },
  { path: 'admin/teachers/:id/edit', lazy: page(() => import('./pages/EditTeacherPage')), handle: { roles: ADMIN } },

  { path: 'admin/staff', lazy: page(() => import('./pages/StaffManager')), handle: { roles: ADMIN } },
  // BEFORE: bound to UserManager, not TeacherLeaveManager. Preserved verbatim —
  // see docs/ROUTE-PARITY-WEB.md, this looks like a pre-existing wiring bug.
  { path: 'admin/teacher-leaves', lazy: page(() => import('./pages/UserManager')), handle: { roles: ADMIN } },

  { path: 'admin/id-cards/students', lazy: page(() => import('./pages/StudentIdCard')), handle: { roles: ADMIN } },
  { path: 'admin/id-cards/teachers', lazy: page(() => import('./pages/TeacherIdCard')), handle: { roles: ADMIN } },

  { path: 'teacher/my-students', lazy: page(() => import('./pages/TeacherMyStudents')), handle: { roles: [ROLES.TEACHER] } },
];
