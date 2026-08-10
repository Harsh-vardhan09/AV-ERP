import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import PublicLayout from '@app/layouts/PublicLayout';
import DashboardLayout from '@app/layouts/DashboardLayout';
import SuperAdminLayout from '@app/layouts/SuperAdminLayout';
import RouteGuard from '@app/guards/RouteGuard';
import PublicOnlyGuard from '@app/guards/PublicOnlyGuard';
import SuperAdminGuard from '@app/guards/SuperAdminGuard';
import ErrorPage from '@shared/ui/ErrorPage';

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
    errorElement: <ErrorPage />,
    children: [
      ...openRoutes,
      superAdminLoginRoute,
      { element: <PublicOnlyGuard />, children: publicOnlyRoutes },
    ],
  },

  {
    element: <RouteGuard />,
    errorElement: <ErrorPage />,
    children: [
      { element: <DashboardLayout />, children: appRoutes },
      ...bareRoutes,
    ],
  },

  {
    path: '/superadmin',
    element: <SuperAdminGuard />,
    errorElement: <ErrorPage />,
    children: [{ element: <SuperAdminLayout />, children: superAdminRoutes }],
  },
]);
