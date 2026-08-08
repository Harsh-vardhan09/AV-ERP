import { page } from '@shared/lib/lazyRoute';
import { ALL_ROLES } from '@shared/constants/roles';

// Signed-in users get bounced to their own dashboard by PublicOnlyLayout.
export const identityPublicOnlyRoutes = [
  { path: '/login', lazy: page(() => import('./pages/Loginpage')) },
  { path: '/otp', lazy: page(() => import('./pages/Otppage')) },
];

// Reachable signed in or out — a locked-out user needs these.
export const identityOpenRoutes = [
  { path: '/forgot-password', lazy: page(() => import('./pages/Resetpass')) },
  { path: '/forgot-password/:token', lazy: page(() => import('./pages/Changepassword')) },
];

// Renders without DashboardLayout. The guard sends anyone with
// mustChangePassword here, so it must stay reachable by every role.
export const identityProtectedRoutes = [
  { path: '/change-password', lazy: page(() => import('./pages/ForcePasswordChange')), handle: { roles: ALL_ROLES } },
];
