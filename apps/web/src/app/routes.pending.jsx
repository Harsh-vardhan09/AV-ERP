// Routes whose pages still live in src/components rather than in a module. A
// module cannot own a route to a page it does not contain, so they stay here
// until those files are migrated — then each block moves into the module named
// in its comment.
import { page } from '@shared/lib/lazyRoute';
import { ROLES, STUDENT_TEACHER } from '@shared/constants/roles';

const TEACHER = [ROLES.TEACHER];
const STUDENT = [ROLES.STUDENT];

// Inside DashboardLayout, under the role branches.
export const pendingAppRoutes = [
  // -> academics
  { path: 'student/assignments', lazy: page(() => import('../components/students/assignments/Assignmentpage')), handle: { roles: STUDENT, module: 'assignments' } },
  // -> communication
  { path: 'student/notices', lazy: page(() => import('../components/students/news/Allnoticepage')), handle: { roles: STUDENT, module: 'communication' } },
  { path: 'student/complaints', lazy: page(() => import('../components/students/Complain-Box/complainForm')), handle: { roles: STUDENT, module: 'communication' } },
];

// Protected but rendered WITHOUT DashboardLayout, exactly as before.
export const pendingLegacyRoutes = [
  { path: '/home', lazy: page(() => import('./layouts/LegacyHome')), handle: { roles: STUDENT_TEACHER } },
  { path: '/chatapp', lazy: page(() => import('../components/Chat/ChatApp')), handle: { roles: STUDENT_TEACHER } },
  { path: '/application', lazy: page(() => import('../components/students/Leave/Application')), handle: { roles: STUDENT_TEACHER } },
  { path: '/showleaves/:filename', lazy: page(() => import('../components/admin/Leave/PDFViewer')), handle: { roles: STUDENT_TEACHER } },
  { path: '/noticeapprove', lazy: page(() => import('../components/students/news/Noticeapprove')), handle: { roles: STUDENT_TEACHER } },
  { path: '/fullnotice/:id', lazy: page(() => import('../components/students/news/Noticeopen')), handle: { roles: STUDENT_TEACHER } },
  { path: '/addnotice', lazy: page(() => import('../components/students/news/Notice')), handle: { roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN] } },
  { path: '/box', lazy: page(() => import('../components/students/news/Noticebox')), handle: { roles: STUDENT_TEACHER } },
  { path: '/complaintbox', lazy: page(() => import('../components/students/Complain-Box/complainBox')), handle: { roles: STUDENT_TEACHER } },
  { path: '/complaintform', lazy: page(() => import('../components/students/Complain-Box/complainForm')), handle: { roles: STUDENT_TEACHER } },
  { path: '/next/:id', lazy: page(() => import('../components/students/Complain-Box/complainNext')), handle: { roles: STUDENT_TEACHER } },
  { path: '/request', lazy: page(() => import('../components/students/Complain-Box/request')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quiz', lazy: page(() => import('../components/admin/kahoot/kahootTeam')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizwinner', lazy: page(() => import('../components/admin/kahoot/kahootwinners')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizscore', lazy: page(() => import('../components/admin/kahoot/kahootScore')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizquestion', lazy: page(() => import('../components/admin/kahoot/kahootQueeze')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizmember', lazy: page(() => import('../components/admin/kahoot/kahootWaiting')), handle: { roles: STUDENT_TEACHER } },

  { path: '/createtimetable', lazy: page(() => import('../components/admin/adminTt')), handle: { roles: TEACHER } },
  { path: '/takeattendance', lazy: page(() => import('../components/admin/attendance/TakeAttendance')), handle: { roles: TEACHER } },
  { path: '/leavesection', lazy: page(() => import('../components/admin/Leave/LeavesSection')), handle: { roles: TEACHER } },

  { path: '/attendance', lazy: page(() => import('../components/students/attendance/index')), handle: { roles: STUDENT } },
  { path: '/assignment', lazy: page(() => import('../components/students/assignments/Assignmentpage')), handle: { roles: STUDENT } },
  { path: '/assignment/:subject', lazy: page(() => import('../components/students/assignments/AssignmentsDetails')), handle: { roles: STUDENT } },
  { path: '/assignment/:subject/:assignmentid', lazy: page(() => import('../components/students/assignments/SubmissionPage')), handle: { roles: STUDENT } },
];
