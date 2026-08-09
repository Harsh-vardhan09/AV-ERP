import { page, redirect } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const ADMIN = [ROLES.ADMIN, ROLES.ADMISSION];

export const tenancyRoutes = [
  { path: 'admin/settings', lazy: page(() => import('./pages/SchoolSettingsPage')), handle: { roles: ADMIN } },
  // Notification control lives inside School Settings.
  { path: 'admin/notifications', lazy: redirect('/admin/settings'), handle: { roles: ADMIN } },
];

// Guarded by superAdminToken, never by the school-user roles above — composed
// into its own shell in app/router.jsx.
export const superAdminRoutes = [
  { index: true, lazy: redirect('/superadmin/dashboard') },
  { path: 'dashboard', lazy: page(() => import('./pages/SuperAdminDashboard')) },
  { path: 'schools', lazy: page(() => import('./pages/SuperAdminSchools')) },
  { path: 'schools/:id/modules', lazy: page(() => import('./pages/SchoolModules')) },
  { path: 'schools/:id/staff', lazy: page(() => import('./pages/SchoolStaffAdmin')) },
  { path: 'schools/:id/templates', lazy: page(() => import('./pages/SuperAdminTemplateManager')) },
  { path: 'templates', lazy: page(() => import('./pages/SuperAdminGlobalTemplates')) },
  // Legacy per-school template manager, still reachable directly
  { path: 'school-templates', lazy: page(() => import('./pages/SuperAdminTemplateManager')) },
  { path: 'admission-templates', lazy: page(() => import('./pages/SuperAdminAdmissionTemplateManager')) },
];

export const superAdminLoginRoute = {
  path: '/superadmin/login',
  lazy: page(() => import('./pages/SuperAdminLogin')),
};
