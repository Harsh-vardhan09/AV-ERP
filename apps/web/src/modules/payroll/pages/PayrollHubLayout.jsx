import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Loader from '@shared/ui/Loader';

// Mounted under several prefixes — /admin/payroll/*, /accounts/payroll/* and a
// bare /payroll/* — because pages navigate with absolute '/payroll/...' paths
// while the sidebar links role-prefixed ones. Child paths are relative, so the
// same route array works under all of them.
const PayrollHubLayout = () => (
  <Suspense fallback={<Loader />}>
    <Outlet />
  </Suspense>
);

export default PayrollHubLayout;
