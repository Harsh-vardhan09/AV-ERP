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
