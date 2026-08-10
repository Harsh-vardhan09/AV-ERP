import { page } from '@shared/lib/lazyRoute';
import { ROLES, STUDENT_TEACHER } from '@shared/constants/roles';

const MODULE = 'communication';
const TEACHER = [ROLES.TEACHER];
const STUDENT = [ROLES.STUDENT];

export const communicationRoutes = [
  {
    path: 'admin/knowledge-center',
    lazy: page(() => import('./pages/AdminKnowledgeCenter')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION], module: MODULE },
  },

  { path: 'admin/notices/new', lazy: page(() => import('./pages/news/Notice')), handle: { roles: [ROLES.ADMIN], module: MODULE } },
  { path: 'admin/notices', lazy: page(() => import('./pages/news/Allnoticepage')), handle: { roles: [ROLES.ADMIN], module: MODULE } },

  { path: 'teacher/materials', lazy: page(() => import('./pages/TeacherKnowledgeCenter')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/leave', lazy: page(() => import('./pages/TeacherLeave')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/student-leaves', lazy: page(() => import('./pages/StudentLeaveApproval')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/notices/new', lazy: page(() => import('./pages/news/Notice')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/notices', lazy: page(() => import('./pages/news/Allnoticepage')), handle: { roles: TEACHER, module: MODULE } },

  { path: 'student/materials', lazy: page(() => import('./pages/Knowledgecenter')), handle: { roles: STUDENT, module: MODULE } },
  { path: 'student/leave', lazy: page(() => import('./pages/StudentLeave')), handle: { roles: STUDENT, module: MODULE } },
  { path: 'student/notices', lazy: page(() => import('./pages/news/Allnoticepage')), handle: { roles: STUDENT, module: MODULE } },
  { path: 'student/complaints', lazy: page(() => import('./pages/Complain-Box/complainForm')), handle: { roles: STUDENT, module: MODULE } },
];

// Paths that have always rendered outside DashboardLayout — composed into the
// bare protected shell so they look exactly as they did before.
export const communicationLegacyRoutes = [
  { path: '/knowlegecenter', lazy: page(() => import('./pages/Knowledgecenter')), handle: { roles: STUDENT, module: MODULE } },

  { path: '/chatapp', lazy: page(() => import('./pages/Chat/ChatApp')), handle: { roles: STUDENT_TEACHER } },
  { path: '/application', lazy: page(() => import('./pages/Application')), handle: { roles: STUDENT_TEACHER } },
  { path: '/showleaves/:filename', lazy: page(() => import('./pages/PDFViewer')), handle: { roles: STUDENT_TEACHER } },
  { path: '/leavesection', lazy: page(() => import('./pages/LeavesSection')), handle: { roles: TEACHER } },

  // mock page — superseded by admin/notices
  // { path: '/noticeapprove', lazy: page(() => import('./pages/news/Noticeapprove')), handle: { roles: STUDENT_TEACHER } },
  // mock page — superseded by admin/notices
  { path: '/fullnotice/:id', lazy: page(() => import('./pages/news/Noticeopen')), handle: { roles: [ROLES.ADMIN, ...STUDENT_TEACHER], module: MODULE } },
  { path: '/box', lazy: page(() => import('./pages/news/NoticeboxLegacy')), handle: { roles: STUDENT_TEACHER, module: MODULE } },
  { path: '/box/:id', lazy: page(() => import('./pages/news/NoticeboxLegacy')), handle: { roles: STUDENT_TEACHER, module: MODULE } },
  // mock page — superseded by admin/notices
  // { path: '/addnotice', lazy: page(() => import('./pages/news/Notice')), handle: { roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN] } },
  // mock page — superseded by admin/notices
  // { path: '/box', lazy: page(() => import('./pages/news/Noticebox')), handle: { roles: STUDENT_TEACHER } },

  { path: '/complaintbox', lazy: page(() => import('./pages/Complain-Box/complainBox')), handle: { roles: STUDENT_TEACHER } },
  { path: '/complaintform', lazy: page(() => import('./pages/Complain-Box/complainForm')), handle: { roles: STUDENT_TEACHER } },
  { path: '/next/:id', lazy: page(() => import('./pages/Complain-Box/complainNext')), handle: { roles: STUDENT_TEACHER } },
  { path: '/request', lazy: page(() => import('./pages/Complain-Box/request')), handle: { roles: STUDENT_TEACHER } },
];
