import { page, redirect } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const MODULE = 'admissions';
const ADMIN = [ROLES.ADMIN, ROLES.ADMISSION];
const ADMIN_HANDLE = { roles: ADMIN, module: MODULE };

// School admins and admission staff can VIEW and PREVIEW admission templates
// only — upload/edit/delete is Super Admin territory.
const formRoutes = (prefix) => [
  { path: `${prefix}/admission-forms/print`, lazy: page(() => import('./pages/PrintAdmissionForm')), handle: ADMIN_HANDLE },
  { path: `${prefix}/admission-forms/print/:id`, lazy: page(() => import('./pages/PrintPreview')), handle: ADMIN_HANDLE },
  { path: `${prefix}/admission-forms/settings`, lazy: page(() => import('./pages/AdmissionFormSettings')), handle: ADMIN_HANDLE },
  { path: `${prefix}/admission/templates`, lazy: page(() => import('./pages/AdmissionTemplateManager')), handle: ADMIN_HANDLE },
  { path: `${prefix}/admission/templates/:id/preview`, lazy: page(() => import('./pages/AdmissionTemplatePreview')), handle: ADMIN_HANDLE },
];

export const admissionsRoutes = [
  ...formRoutes('admin'),
  ...formRoutes('admission'),

  { path: 'admission', lazy: redirect('/admission/dashboard'), handle: ADMIN_HANDLE },
  { path: 'admission/dashboard', lazy: page(() => import('./pages/AdmissionDashboard')), handle: ADMIN_HANDLE },
  { path: 'admission/register-student', lazy: page(() => import('./pages/RegisterStudent')), handle: ADMIN_HANDLE },
  { path: 'admission/register-teacher', lazy: page(() => import('./pages/RegisterTeacher')), handle: ADMIN_HANDLE },
  { path: 'admission/students', lazy: page(() => import('./pages/StudentList')), handle: ADMIN_HANDLE },
  { path: 'admission/students/:id', lazy: page(() => import('./pages/AdmissionStudentDetail')), handle: ADMIN_HANDLE },
  { path: 'admission/teachers', lazy: page(() => import('./pages/TeacherList')), handle: ADMIN_HANDLE },
  { path: 'admission/teachers/:id', lazy: page(() => import('./pages/AdmissionTeacherDetail')), handle: ADMIN_HANDLE },

  // retired: custom_forms — re-add when modules.json marks it available
  // { path: 'admin/custom-forms', lazy: page(() => import('./pages/AllForms')), handle: { roles: ADMIN, module: 'custom_forms' } },
  // { path: 'admin/custom-forms/create', lazy: page(() => import('./pages/CreateForm')), handle: { roles: ADMIN, module: 'custom_forms' } },
  // { path: 'admin/custom-forms/deleted', lazy: page(() => import('./pages/DeletedForms')), handle: { roles: ADMIN, module: 'custom_forms' } },
  // { path: 'admin/custom-forms/:id/edit', lazy: page(() => import('./pages/EditForm')), handle: { roles: ADMIN, module: 'custom_forms' } },
  // { path: 'admin/custom-forms/:id/leads', lazy: page(() => import('./pages/FormLeads')), handle: { roles: ADMIN, module: 'custom_forms' } },
];
