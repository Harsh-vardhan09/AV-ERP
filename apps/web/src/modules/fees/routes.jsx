import { page } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

// Before this refactor the hub registered its config screens only when
// `role === 'admin'`; anyone else fell through to the "Select a tab" panel.
// That role restriction is preserved here as handle.roles — a non-admin is now
// redirected home instead of shown the empty panel, which is the one visible
// difference. See docs/ROUTE-PARITY-WEB.md.
const ADMIN_ONLY = [ROLES.ADMIN];

const hubChildren = (sharedRoles) => [
  { index: true, lazy: page(() => import('./pages/FeeHubIndex')), handle: { roles: sharedRoles } },
  { path: 'dashboard', lazy: page(() => import('./pages/FeeDashboard')), handle: { roles: ADMIN_ONLY } },
  { path: 'sessions', lazy: page(() => import('./pages/FeeSessionManager')), handle: { roles: ADMIN_ONLY } },
  { path: 'heads', lazy: page(() => import('./pages/FeeHeadManager')), handle: { roles: ADMIN_ONLY } },
  { path: 'structures', lazy: page(() => import('./pages/FeeStructureManager')), handle: { roles: ADMIN_ONLY } },
  { path: 'defaulters', lazy: page(() => import('./pages/FeeDefaulters')), handle: { roles: ADMIN_ONLY } },
  { path: 'reports', lazy: page(() => import('./pages/FeeReports')), handle: { roles: ADMIN_ONLY } },
  { path: 'ledger', lazy: page(() => import('./pages/StudentLedger')), handle: { roles: ADMIN_ONLY } },
  { path: 'refunds', lazy: page(() => import('./pages/FeeRefunds')), handle: { roles: ADMIN_ONLY } },
  { path: 'students', lazy: page(() => import('./pages/StudentFeeView')), handle: { roles: sharedRoles } },
  { path: 'collect', lazy: page(() => import('./pages/CollectFee')), handle: { roles: sharedRoles } },
  { path: '*', lazy: page(() => import('./pages/FeeHubFallback')), handle: { roles: sharedRoles } },
];

const hub = (path, roles) => ({
  path,
  lazy: page(() => import('./pages/FeeHubLayout')),
  handle: { roles, module: 'fee_management' },
  children: hubChildren(roles),
});

export const feesRoutes = [
  hub('admin/fee', [ROLES.ADMIN, ROLES.ADMISSION]),
  hub('accounts/fee', [ROLES.ACCOUNTS]),

  {
    path: 'student/fees',
    lazy: page(() => import('./pages/StudentFees')),
    handle: { roles: [ROLES.STUDENT], module: 'fee_management' },
  },
];
