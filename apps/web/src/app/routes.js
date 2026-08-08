// Route composition, kept free of React so it can be loaded on its own by the
// parity check in docs/ROUTE-PARITY-WEB.md.
import { page, redirect } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

import { academicsRoutes } from '@modules/academics/routes';
import { admissionsRoutes } from '@modules/admissions/routes';
import { attendanceRoutes } from '@modules/attendance/routes';
import { biometricRoutes } from '@modules/biometric/routes';
import { communicationRoutes, communicationLegacyRoutes } from '@modules/communication/routes';
import { dashboardRoutes } from '@modules/dashboard/routes';
import { documentsRoutes } from '@modules/documents/routes';
import { examinationRoutes } from '@modules/examination/routes';
import { feesRoutes } from '@modules/fees/routes';
import {
  identityOpenRoutes,
  identityProtectedRoutes,
  identityPublicOnlyRoutes,
} from '@modules/identity/routes';
import { importsRoutes } from '@modules/imports/routes';
import { libraryRoutes } from '@modules/library/routes';
import { notificationsRoutes } from '@modules/notifications/routes';
import { oasesRoutes } from '@modules/oases/routes';
import { payrollRoutes } from '@modules/payroll/routes';
import { peopleRoutes } from '@modules/people/routes';
import { reportcardsRoutes } from '@modules/reportcards/routes';
import { superAdminLoginRoute, superAdminRoutes, tenancyRoutes } from '@modules/tenancy/routes';

import {
  pendingAppRoutes,
  pendingLegacyRoutes,
  pendingOpenRoutes,
  pendingPublicOnlyRoutes,
} from './routes.pending';

const ADMIN_BRANCH = [ROLES.ADMIN, ROLES.ADMISSION];

// Branch landing spots. These were <Route index> under each prefix; as full
// paths they resolve identically and stay visible in the parity table.
const branchIndexes = [
  { path: 'admin', lazy: redirect('/admin/dashboard'), handle: { roles: ADMIN_BRANCH } },
  {
    path: 'accounts',
    lazy: redirect('/accounts/fee/students'),
    handle: { roles: [ROLES.ACCOUNTS] },
  },
  { path: 'teacher', lazy: redirect('/teacher/dashboard'), handle: { roles: [ROLES.TEACHER] } },
  { path: 'student', lazy: redirect('/student/dashboard'), handle: { roles: [ROLES.STUDENT] } },
  {
    path: 'exam-controller',
    lazy: redirect('/exam-controller/dashboard'),
    handle: { roles: [ROLES.EXAM_CONTROLLER] },
  },
];

// Everything that renders inside DashboardLayout.
export const appRoutes = [
  ...branchIndexes,
  ...academicsRoutes,
  ...admissionsRoutes,
  ...attendanceRoutes,
  ...biometricRoutes,
  ...communicationRoutes,
  ...dashboardRoutes,
  ...documentsRoutes,
  ...examinationRoutes,
  ...feesRoutes,
  ...importsRoutes,
  ...libraryRoutes,
  ...oasesRoutes,
  ...payrollRoutes,
  ...peopleRoutes,
  ...reportcardsRoutes,
  ...tenancyRoutes,
  ...pendingAppRoutes,
];

// Signed-in routes that render bare, with no dashboard chrome.
export const bareRoutes = [
  ...identityProtectedRoutes,
  ...notificationsRoutes,
  ...communicationLegacyRoutes,
  ...pendingLegacyRoutes,
];

export const openRoutes = [
  ...identityOpenRoutes,
  ...pendingOpenRoutes,
  {
    path: '/service-unavailable',
    lazy: page(() => import('@shared/ui/ServiceUnavailablePreview')),
  },
  { path: '/unauthorized', lazy: page(() => import('@shared/ui/Unauthorized')) },
];

// Sends each role to its own dashboard; unauthenticated visitors to /login.
export const rootRoute = { path: '/', lazy: page(() => import('./HomeRedirect')) };

export const publicOnlyRoutes = [...identityPublicOnlyRoutes, ...pendingPublicOnlyRoutes];

export { superAdminLoginRoute, superAdminRoutes };
