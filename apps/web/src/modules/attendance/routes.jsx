import { page, redirect } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

export const attendanceRoutes = [
  {
    path: 'admin/biometric/attendance',
    lazy: page(() => import('./pages/FacultyAttendance')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION], module: 'biometric' },
  },
  // Sections nobody is assigned to mark — a class going unmarked must be visible
  {
    path: 'admin/attendance/unassigned',
    lazy: page(() => import('./pages/UnassignedSections')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION] },
  },

  // Daily marking, by the class teacher. Replaces the per-period screen.
  {
    path: 'teacher/attendance',
    lazy: page(() => import('./pages/MarkDailyAttendance')),
    handle: { roles: [ROLES.TEACHER] },
  },

  {
    path: 'student/attendance',
    lazy: page(() => import('./pages/MyAttendance')),
    handle: { roles: [ROLES.STUDENT] },
  },
];

// Paths that have always rendered outside DashboardLayout. Both per-period
// screens are retired: attendance is now one record per student per day, so a
// subject-scoped marking screen has nothing to write.
export const attendanceLegacyRoutes = [
  { path: '/takeattendance', lazy: redirect('/teacher/attendance'), handle: { roles: [ROLES.TEACHER] } },
  { path: '/attendance', lazy: redirect('/student/attendance'), handle: { roles: [ROLES.STUDENT] } },
];
