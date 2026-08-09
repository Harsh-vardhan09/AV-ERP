import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

export const dashboardRoutes = [
  {
    path: 'admin/dashboard',
    lazy: page(() => import('./pages/AdminDashboard')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION] },
  },
  { path: 'teacher/dashboard', lazy: page(() => import('./pages/TeacherDashboard')), handle: { roles: [ROLES.TEACHER] } },
  { path: 'student/dashboard', lazy: page(() => import('./pages/StudentDashboard')), handle: { roles: [ROLES.STUDENT] } },
];
