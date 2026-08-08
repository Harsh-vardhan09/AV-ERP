import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setSuperAdmin, useCheckSuperAdminAuthQuery } from '@modules/tenancy';
import ShimmerUi from '@shared/ui/shimmerui';

/**
 * Guards /superadmin/*. Uses superAdminApi, not authApi, and never touches
 * school user state.
 */
const SuperAdminGuard = () => {
  const { data, isLoading, isFetching } = useCheckSuperAdminAuthQuery();
  const dispatch = useDispatch();

  useEffect(() => {
    if (data?.success && data?.superAdmin) {
      dispatch(setSuperAdmin(data.superAdmin));
    }
  }, [data, dispatch]);

  // isFetching matters as much as isLoading here. isLoading is true only for
  // the FIRST fetch of a cache entry. The login page subscribes to this same
  // auth-check entry and gets a 401 before sign-in, so by the time login
  // succeeds and invalidates the tag, the entry is REFETCHING:
  // isLoading=false, isFetching=true, data=undefined. Checking isLoading alone
  // read that as "not authenticated" and bounced the user back to /login
  // immediately after the "Login successful" toast.
  if (isLoading || isFetching) return <ShimmerUi />;

  if (!data?.success) return <Navigate to="/superadmin/login" replace />;

  return <Outlet />;
};

export default SuperAdminGuard;
