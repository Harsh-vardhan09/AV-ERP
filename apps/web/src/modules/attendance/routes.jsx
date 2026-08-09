import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

export const attendanceRoutes = [
  {
    path: 'admin/biometric/attendance',
    lazy: page(() => import('./pages/FacultyAttendance')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION], module: 'biometric' },
  },
  { path: 'teacher/attendance', lazy: page(() => import('./pages/TakeAttendance')), handle: { roles: [ROLES.TEACHER] } },
  { path: 'student/attendance', lazy: page(() => import('./pages/StudentAttendance')), handle: { roles: [ROLES.STUDENT] } },
];

// Paths that have always rendered outside DashboardLayout. TakeAttendanceLegacy
// is a second, older take-attendance screen — not the same file as
// pages/TakeAttendance, which serves /teacher/attendance.
export const attendanceLegacyRoutes = [
  { path: '/takeattendance', lazy: page(() => import('./pages/TakeAttendanceLegacy')), handle: { roles: [ROLES.TEACHER] } },
  { path: '/attendance', lazy: page(() => import('./pages/student-attendance/index')), handle: { roles: [ROLES.STUDENT] } },
];
