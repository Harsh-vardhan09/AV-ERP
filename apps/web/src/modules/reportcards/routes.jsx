import { page, redirect } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const MODULE = 'report_cards';
const ADMIN = [ROLES.ADMIN, ROLES.ADMISSION];
const TEACHER = [ROLES.TEACHER];

export const reportcardsRoutes = [
  // The legacy ReportCardManager generator is unrouted for admin —
  // /admin/template-report-cards is the single template-driven generator.
  { path: 'admin/report-cards', lazy: redirect('/admin/template-report-cards'), handle: { roles: ADMIN, module: MODULE } },
  { path: 'admin/report-cards/:studentId', lazy: page(() => import('./pages/ReportCardEditor')), handle: { roles: ADMIN, module: MODULE } },
  { path: 'admin/dynamic-reports', lazy: page(() => import('./pages/DynamicReportManager')), handle: { roles: ADMIN, module: MODULE } },
  // Select-only gallery. Authoring lives in Super Admin (/superadmin/templates).
  { path: 'admin/templates', lazy: page(() => import('./pages/TemplateManager')), handle: { roles: ADMIN, module: MODULE } },
  { path: 'admin/template-report-cards', lazy: page(() => import('./pages/TemplateReportCard')), handle: { roles: ADMIN, module: MODULE } },

  { path: 'teacher/report-cards', lazy: page(() => import('./pages/TemplateReportCard')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/report-cards/:studentId', lazy: page(() => import('./pages/ReportCardEditor')), handle: { roles: TEACHER, module: MODULE } },
  { path: 'teacher/template-report-cards', lazy: redirect('/teacher/report-cards'), handle: { roles: TEACHER, module: MODULE } },

  { path: 'student/report-card', lazy: page(() => import('./pages/ReportCardEditor')), handle: { roles: [ROLES.STUDENT], module: MODULE } },
];
