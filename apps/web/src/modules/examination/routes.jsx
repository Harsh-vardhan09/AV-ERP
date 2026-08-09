import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const ADMIN = [ROLES.ADMIN, ROLES.ADMISSION];
const TEACHER = [ROLES.TEACHER];
const EC = [ROLES.EXAM_CONTROLLER];

export const examinationRoutes = [
  { path: 'admin/exams', lazy: page(() => import('./pages/ExamManager')), handle: { roles: ADMIN } },
  { path: 'admin/marks-audit-log', lazy: page(() => import('./pages/MarksAuditLog')), handle: { roles: ADMIN } },

  { path: 'teacher/marks', lazy: page(() => import('./pages/UploadMarks')), handle: { roles: TEACHER } },
  { path: 'teacher/tests', lazy: page(() => import('./pages/TeacherTestCreate')), handle: { roles: TEACHER } },
  { path: 'teacher/co-scholastic', lazy: page(() => import('./pages/CoScholasticMarks')), handle: { roles: TEACHER } },

  { path: 'student/marks', lazy: page(() => import('./pages/StudentMarks')), handle: { roles: [ROLES.STUDENT] } },

  { path: 'exam-controller/dashboard', lazy: page(() => import('./pages/ECDashboard')), handle: { roles: EC } },
  { path: 'exam-controller/marks', lazy: page(() => import('./pages/ECMarksManagement')), handle: { roles: EC } },
  { path: 'exam-controller/audit-log', lazy: page(() => import('./pages/ECAuditLog')), handle: { roles: EC } },
  { path: 'exam-controller/exams', lazy: page(() => import('./pages/ECAllExams')), handle: { roles: EC } },
];
