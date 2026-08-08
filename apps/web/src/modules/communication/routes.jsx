import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const MODULE = 'communication';
const TEACHER = [ROLES.TEACHER];
const STUDENT = [ROLES.STUDENT];

export const communicationRoutes = [
  {
    path: 'admin/knowledge-center',
    lazy: page(() => import('./pages/AdminKnowledgeCenter')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION], module: MODULE },
  },

  { path: 'teacher/materials', lazy: page(() => import('./pages/TeacherKnowledgeCenter')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/leave', lazy: page(() => import('./pages/TeacherLeave')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/student-leaves', lazy: page(() => import('./pages/StudentLeaveApproval')), handle: { roles: TEACHER, module: MODULE } },

  { path: 'student/materials', lazy: page(() => import('./pages/Knowledgecenter')), handle: { roles: STUDENT, module: MODULE } },
  { path: 'student/leave', lazy: page(() => import('./pages/StudentLeave')), handle: { roles: STUDENT, module: MODULE } },
];

// Legacy path, no DashboardLayout — composed into the bare protected shell.
export const communicationLegacyRoutes = [
  { path: '/knowlegecenter', lazy: page(() => import('./pages/Knowledgecenter')), handle: { roles: STUDENT, module: MODULE } },
];
