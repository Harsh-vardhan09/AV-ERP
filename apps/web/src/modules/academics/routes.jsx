import { page } from '@shared/lib/lazyRoute';
import { ROLES, STUDENT_TEACHER } from '@shared/constants/roles';

const ADMIN = [ROLES.ADMIN, ROLES.ADMISSION];
const TEACHER = [ROLES.TEACHER];
const STUDENT = [ROLES.STUDENT];

export const academicsRoutes = [
  { path: 'admin/sessions', lazy: page(() => import('./pages/SessionManager')), handle: { roles: ADMIN } },
  { path: 'admin/classes', lazy: page(() => import('./pages/ClassManager')), handle: { roles: ADMIN } },
  { path: 'admin/subjects', lazy: page(() => import('./pages/SubjectManager')), handle: { roles: ADMIN } },
  { path: 'admin/teacher-assignment', lazy: page(() => import('./pages/TeacherAssignmentPage')), handle: { roles: ADMIN } },
  { path: 'admin/class-list', lazy: page(() => import('./pages/AdminClassDirectory')), handle: { roles: ADMIN } },
  { path: 'admin/subject-list', lazy: page(() => import('./pages/AdminSubjectDirectory')), handle: { roles: ADMIN } },

  { path: 'teacher/assignments', lazy: page(() => import('./pages/TeacherAssignments')), handle: { roles: TEACHER, module: 'assignments' } },
  { path: 'student/assignments', lazy: page(() => import('./pages/assignments/Assignmentpage')), handle: { roles: STUDENT, module: 'assignments' } },
];

// Paths that have always rendered outside DashboardLayout. Kept in the bare
// shell so they look exactly as they did before moving into this module.
export const academicsLegacyRoutes = [
  { path: '/timetable', lazy: page(() => import('./pages/timetable')), handle: { roles: STUDENT_TEACHER } },
  { path: '/createtimetable', lazy: page(() => import('./pages/adminTt')), handle: { roles: TEACHER } },
  { path: '/assignment', lazy: page(() => import('./pages/assignments/Assignmentpage')), handle: { roles: STUDENT, module: 'assignments' } },
  { path: '/assignment/:subject', lazy: page(() => import('./pages/assignments/AssignmentsDetails')), handle: { roles: STUDENT, module: 'assignments' } },
  { path: '/assignment/:subject/:assignmentid', lazy: page(() => import('./pages/assignments/SubmissionPage')), handle: { roles: STUDENT, module: 'assignments' } },
];
