import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

export const biometricRoutes = [
  {
    path: 'admin/biometric/devices',
    lazy: page(() => import('./pages/FingerprintAttendance')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION], module: 'biometric' },
  },
];
