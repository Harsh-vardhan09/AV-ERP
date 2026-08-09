import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useCheak_authQuery } from '@modules/identity';
import Loader from '@shared/ui/Loader';
import { roleHomePaths } from '@shared/constants/roles';

// Sign-in pages: a user who is already authenticated is sent to their own
// dashboard instead. OASES is a module inside the ERP, so there is no separate
// redirect for it.
const PublicOnlyGuard = () => {
  const { data, isLoading } = useCheak_authQuery();
  const user = useSelector((state) => state?.user?.user?.user);

  if (isLoading) return <Loader />;

  if (data?.success) {
    const role = data?.user?.role || user?.role;
    return <Navigate to={roleHomePaths[role] || '/'} replace />;
  }

  return <Outlet />;
};

export default PublicOnlyGuard;
