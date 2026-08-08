import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const hubChildren = (roles) => [
  { index: true, lazy: page(() => import('./OasesIndex')), handle: { roles } },
  // kept for backward compat
  { path: 'dashboard', lazy: page(() => import('./OasesDashboard')), handle: { roles } },

  { path: 'exams', lazy: page(() => import('./admin/ExamListPage')), handle: { roles } },
  { path: 'exam/new', lazy: page(() => import('./admin/ExamWizardPage')), handle: { roles } },
  { path: 'exam/:examId', lazy: page(() => import('./admin/ExamWizardPage')), handle: { roles } },

  { path: 'admin/exam-setup', lazy: page(() => import('./admin/ExamSetup')), handle: { roles } },
  { path: 'admin/scheme/:examId', lazy: page(() => import('./admin/QuestionSchemePage')), handle: { roles } },
  { path: 'admin/sheets/:examId', lazy: page(() => import('./admin/SheetManagementPage')), handle: { roles } },
  { path: 'admin/assignments', lazy: page(() => import('./admin/AssignmentManager')), handle: { roles } },
  { path: 'admin/reports', lazy: page(() => import('./admin/ReportsDashboard')), handle: { roles } },
  { path: 'admin/conflicts', lazy: page(() => import('./head-examiner/ConflictResolutionPage')), handle: { roles } },
  { path: 'admin/audit', lazy: page(() => import('./admin/ReportsDashboard')), handle: { roles } },

  { path: 'scan-operator/upload', lazy: page(() => import('./scan-operator/UploadQueue')), handle: { roles } },

  { path: 'evaluator/queue', lazy: page(() => import('./evaluator/TeacherOasesPage')), handle: { roles } },
  { path: 'evaluator/sheet/:sheetId', lazy: page(() => import('./evaluator/SheetViewer')), handle: { roles } },

  { path: 'head-examiner/conflicts', lazy: page(() => import('./head-examiner/ConflictResolutionPage')), handle: { roles } },
  { path: 'head-examiner/final', lazy: page(() => import('./admin/ReportsDashboard')), handle: { roles } },
];

// moduleRedirect reproduces the old OasesEnabledRoute: a different landing spot
// per mount when the school has OASES switched off.
const hub = (path, roles, moduleRedirect) => ({
  path,
  lazy: page(() => import('./OasesHubLayout')),
  handle: { roles, module: 'oases', moduleRedirect },
  children: hubChildren(roles),
});

export const oasesRoutes = [
  hub('admin/oases', [ROLES.ADMIN, ROLES.ADMISSION], '/admin/exams'),
  hub('teacher/oases', [ROLES.TEACHER], '/teacher/dashboard'),
];
