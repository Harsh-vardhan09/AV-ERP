import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

export const importsRoutes = [
  {
    path: 'admin/bulk-import',
    lazy: page(() => import('./pages/BulkImport')),
    handle: { roles: [ROLES.ADMIN, ROLES.ADMISSION], module: 'imports' },
  },
];
