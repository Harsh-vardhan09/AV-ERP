import { page } from '@shared/lib/lazyRoute';
import { ALL_ROLES } from '@shared/constants/roles';

// Both render without DashboardLayout — composed into the bare protected shell.
export const notificationsRoutes = [
  { path: '/notifications', lazy: page(() => import('./pages/NotificationCenter')), handle: { roles: ALL_ROLES } },
  { path: '/notification-preferences', lazy: page(() => import('./pages/NotificationPreferences')), handle: { roles: ALL_ROLES } },
];
