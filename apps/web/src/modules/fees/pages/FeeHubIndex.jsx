import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// The hub index has always been role-conditional: admins land on the dashboard,
// everyone else on the student list. Kept as a component so /admin/fee and
// /accounts/fee behave for each role exactly as they did before.
const FeeHubIndex = () => {
  const role = useSelector(s => s.user?.user?.user?.role || s.user?.user?.role);
  return <Navigate to={role === 'admin' ? 'dashboard' : 'students'} replace />;
};

export default FeeHubIndex;
