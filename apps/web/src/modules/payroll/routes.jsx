import { page, redirect } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

// The hub's own child set, identical under every prefix it mounts on.
const hubChildren = (roles) => [
  { index: true, lazy: redirect('dashboard'), handle: { roles } },
  { path: 'dashboard', lazy: page(() => import('./pages/PayrollDashboard')), handle: { roles } },
  { path: 'runs', lazy: page(() => import('./pages/PayrollRuns')), handle: { roles } },
  { path: 'runs/:id', lazy: page(() => import('./pages/PayrollRunDetail')), handle: { roles } },
  { path: 'employee-salaries', lazy: page(() => import('./pages/EmployeeSalaryManager')), handle: { roles } },
  { path: 'structures', lazy: page(() => import('./pages/SalaryStructureManager')), handle: { roles } },
  { path: 'components', lazy: page(() => import('./pages/SalaryComponentManager')), handle: { roles } },
  { path: 'tax-config', lazy: page(() => import('./pages/TaxConfigManager')), handle: { roles } },
  { path: 'attendance', lazy: page(() => import('./pages/AttendanceManager')), handle: { roles } },
  { path: 'payslips', lazy: page(() => import('./pages/PayslipList')), handle: { roles } },
  { path: 'payment-batches', lazy: page(() => import('./pages/PaymentBatchPage')), handle: { roles } },
  { path: 'reports', lazy: page(() => import('./pages/PayrollReports')), handle: { roles } },
  { path: 'my-payslips', lazy: page(() => import('./pages/MyPayslips')), handle: { roles } },
  { path: '*', lazy: redirect('dashboard'), handle: { roles } },
];

const hub = (path, roles) => ({
  path,
  lazy: page(() => import('./pages/PayrollHubLayout')),
  handle: { roles, module: 'payroll' },
  children: hubChildren(roles),
});

export const payrollRoutes = [
  hub('admin/payroll', [ROLES.ADMIN, ROLES.ADMISSION]),
  hub('accounts/payroll', [ROLES.ACCOUNTS]),
  hub('payroll', [ROLES.ADMIN, ROLES.ACCOUNTS]),

  // Teacher self-service is deliberately NOT the hub: mounting payroll/* here
  // would expose every admin payroll screen to teachers.
  {
    path: 'teacher/payroll/my-payslips',
    lazy: page(() => import('./pages/MyPayslips')),
    handle: { roles: [ROLES.TEACHER], module: 'payroll' },
  },
];
