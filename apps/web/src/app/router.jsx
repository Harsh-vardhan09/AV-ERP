import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import PublicLayout from '@app/layouts/PublicLayout';
import DashboardLayout from '@app/layouts/DashboardLayout';
import SuperAdminLayout from '@app/layouts/SuperAdminLayout';
import RouteGuard from '@app/guards/RouteGuard';
import PublicOnlyGuard from '@app/guards/PublicOnlyGuard';
import SuperAdminGuard from '@app/guards/SuperAdminGuard';

import {
  appRoutes,
  bareRoutes,
  openRoutes,
  publicOnlyRoutes,
  rootRoute,
  superAdminLoginRoute,
  superAdminRoutes,
} from '@app/routes';

export const router = createBrowserRouter([
  rootRoute,

  {
    element: <PublicLayout />,
    children: [
      ...openRoutes,
      superAdminLoginRoute,
      { element: <PublicOnlyGuard />, children: publicOnlyRoutes },
    ],
  },

  {
    element: <RouteGuard />,
    children: [
      { element: <DashboardLayout />, children: appRoutes },
      ...bareRoutes,
    ],
  },

  {
    path: '/superadmin',
    element: <SuperAdminGuard />,
    children: [{ element: <SuperAdminLayout />, children: superAdminRoutes }],
  },
]);
