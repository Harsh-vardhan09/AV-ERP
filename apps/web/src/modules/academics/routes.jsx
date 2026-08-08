import { page } from '@shared/lib/lazyRoute';
import { ROLES, STUDENT_TEACHER } from '@shared/constants/roles';

const ADMIN = [ROLES.ADMIN, ROLES.ADMISSION];

export const academicsRoutes = [
  { path: 'admin/sessions', lazy: page(() => import('./pages/SessionManager')), handle: { roles: ADMIN } },
  { path: 'admin/classes', lazy: page(() => import('./pages/ClassManager')), handle: { roles: ADMIN } },
  { path: 'admin/subjects', lazy: page(() => import('./pages/SubjectManager')), handle: { roles: ADMIN } },
  { path: 'admin/teacher-assignment', lazy: page(() => import('./pages/TeacherAssignmentPage')), handle: { roles: ADMIN } },
  { path: 'admin/class-list', lazy: page(() => import('./pages/AdminClassDirectory')), handle: { roles: ADMIN } },
  { path: 'admin/subject-list', lazy: page(() => import('./pages/AdminSubjectDirectory')), handle: { roles: ADMIN } },

  { path: 'teacher/assignments', lazy: page(() => import('./pages/TeacherAssignments')), handle: { roles: [ROLES.TEACHER] } },
];

// /timetable has always rendered without DashboardLayout — kept in the bare
// shell so the page looks the same as before it moved into this module.
export const academicsLegacyRoutes = [
  { path: '/timetable', lazy: page(() => import('./pages/timetable')), handle: { roles: STUDENT_TEACHER } },
];
