import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loader from '../../components/Loader';

// Mounted under several prefixes — /admin/payroll/*, /accounts/payroll/*,
// /teacher/payroll/* and a bare /payroll/* — because pages navigate with absolute
// '/payroll/...' paths while the sidebar links role-prefixed ones. Relative child
// paths below work under all of them.
const PayrollDashboard       = lazy(() => import('./pages/PayrollDashboard'));
const PayrollRuns            = lazy(() => import('./pages/PayrollRuns'));
const PayrollRunDetail       = lazy(() => import('./pages/PayrollRunDetail'));
const EmployeeSalaryManager  = lazy(() => import('./pages/EmployeeSalaryManager'));
const SalaryStructureManager = lazy(() => import('./pages/SalaryStructureManager'));
const SalaryComponentManager = lazy(() => import('./pages/SalaryComponentManager'));
const TaxConfigManager       = lazy(() => import('./pages/TaxConfigManager'));
const AttendanceManager      = lazy(() => import('./pages/AttendanceManager'));
const PayslipList            = lazy(() => import('./pages/PayslipList'));
const PaymentBatchPage       = lazy(() => import('./pages/PaymentBatchPage'));
const PayrollReports         = lazy(() => import('./pages/PayrollReports'));
const MyPayslips             = lazy(() => import('./pages/MyPayslips'));

const PayrollModuleHub = () => (
  <Suspense fallback={<Loader />}>
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard"         element={<PayrollDashboard />} />
      <Route path="runs"              element={<PayrollRuns />} />
      <Route path="runs/:id"          element={<PayrollRunDetail />} />
      <Route path="employee-salaries" element={<EmployeeSalaryManager />} />
      <Route path="structures"        element={<SalaryStructureManager />} />
      <Route path="components"        element={<SalaryComponentManager />} />
      <Route path="tax-config"        element={<TaxConfigManager />} />
      <Route path="attendance"        element={<AttendanceManager />} />
      <Route path="payslips"          element={<PayslipList />} />
      <Route path="payment-batches"   element={<PaymentBatchPage />} />
      <Route path="reports"           element={<PayrollReports />} />
      <Route path="my-payslips"       element={<MyPayslips />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default PayrollModuleHub;
