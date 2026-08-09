// ══════════════════════════════════════════════════════════════════
// OASES — OasesRoleGuard (shared component)
// Renders children only when user has the required OASES role(s).
// If not authenticated → redirects to main ERP login (/login).
// ══════════════════════════════════════════════════════════════════
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useOasesAuth from '../hooks/useOasesAuth';

/**
 * @param {string[]} roles   Array of allowed OASES roles
 * @param {ReactNode} children
 * @param {ReactNode} [fallback]  Optional custom fallback UI
 */
const OasesRoleGuard = ({ roles = [], children, fallback }) => {
  const { hasRole, isAuthenticated } = useOasesAuth();
  const location = useLocation();

  // Not logged in → send to main ERP login page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !hasRole(...roles)) {
    return fallback ?? (
      <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-3">
        <ShieldAlert className="w-10 h-10" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs text-gray-500">
          Required role(s): {roles.join(', ')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default OasesRoleGuard;
