import React from 'react';
import { Navigate, Outlet, useLocation, useMatches } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isModuleEnabled } from '@av-erp/shared';
import { useCheak_authQuery } from '@modules/identity';
import ShimmerUi from '@shared/ui/shimmerui';
import { roleHomePaths } from '@shared/constants/roles';

// Every handle.roles in the matched chain has to admit the role — they
// intersect, never override. A hub child can only tighten what its mount
// allows, so mounting the fee config screens (admin-only) under /accounts
// leaves them reachable by nobody, exactly as before.
const roleAllows = (matches, role) =>
  matches.every((m) => !m.handle?.roles || m.handle.roles.includes(role));

const moduleHandles = (matches) =>
  matches.filter((m) => m.handle?.module).map((m) => m.handle);

/**
 * The one guard. Reads route.handle.roles and route.handle.module off the
 * matched chain instead of wrapping every route in <ProtectedRoute>.
 */
const RouteGuard = () => {
  const matches = useMatches();
  const location = useLocation();
  const { data, isLoading } = useCheak_authQuery();
  const moduleSettings = useSelector((s) => s.moduleSettings);
  const oasesSettings = useSelector((s) => s.oasesSettings);

  if (isLoading) return <ShimmerUi />;
  if (!data) return <Navigate to="/login" replace />;

  const role = data?.user?.role;
  const home = roleHomePaths[role] || '/login';

  // Someone still on their temporary password goes to the change-password page
  // whatever they asked for.
  if (data?.user?.mustChangePassword && !location.pathname.includes('/change-password')) {
    return <Navigate to="/change-password" replace />;
  }

  if (!roleAllows(matches, role)) {
    return <Navigate to={home} replace />;
  }

  for (const h of moduleHandles(matches)) {
    // OASES is gated by its own slice, not moduleSettings: SchoolSettingsProvider
    // composes the school's isOasesEnabled toggle with the Super Admin switch,
    // and only the composed value may open the module.
    if (h.module === 'oases') {
      if (!oasesSettings?.loaded) return <ShimmerUi />;
      if (!oasesSettings?.isOasesEnabled) return <Navigate to={h.moduleRedirect || home} replace />;
    } else {
      // Wait rather than decide on an empty store, or the first paint after a
      // reload flashes a page the school cannot use.
      if (!moduleSettings?.loaded) return <ShimmerUi />;
      if (!isModuleEnabled(moduleSettings?.modules, h.module)) {
        return <Navigate to={h.moduleRedirect || home} replace />;
      }
    }
  }

  return <Outlet />;
};

export default RouteGuard;
