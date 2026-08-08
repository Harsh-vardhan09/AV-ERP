import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import RouteGuard from './guards/RouteGuard';
import PublicOnlyGuard from './guards/PublicOnlyGuard';
import SuperAdminGuard from './guards/SuperAdminGuard';

import {
  appRoutes,
  bareRoutes,
  openRoutes,
  publicOnlyRoutes,
  rootRoute,
  superAdminLoginRoute,
  superAdminRoutes,
} from './routes';

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
