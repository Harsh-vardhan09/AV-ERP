import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCheak_authQuery } from '@modules/identity';
import ShimmerUi from '@shared/ui/shimmerui';
import { roleHomePaths } from '@shared/constants/roles';

const HomeRedirect = () => {
  const { data, isLoading } = useCheak_authQuery();
  if (isLoading) return <ShimmerUi />;
  if (!data?.success) return <Navigate to="/login" replace />;
  return <Navigate to={roleHomePaths[data?.user?.role] || '/login'} replace />;
};

export default HomeRedirect;
