// ══════════════════════════════════════════════════════════════════
// OASES Hook — useOasesAuth (Phase 2 migration update)
//
// BEFORE: Read only from Zustand oases-auth store.
//         ERP admin/teacher had isAuthenticated=false → bounced to /login.
//
// AFTER:  Priority chain:
//   1. Zustand oases-auth store (explicit OASES users — unchanged)
//   2. ERP Redux store fallback:
//         admin   → SCHOOL_ADMIN
//         teacher → EVALUATOR
//   Logic for existing oasesRole users is completely UNCHANGED.
// ══════════════════════════════════════════════════════════════════
import { useSelector } from 'react-redux';
import useOasesAuthStore from '../store/authStore';
import { OASES_ROLES } from '../utils/oasesConstants';

// Same mapping as backend oasesAuth.js ERP_ROLE_TO_OASES
const ERP_ROLE_TO_OASES = {
  admin:   OASES_ROLES.SCHOOL_ADMIN,
  teacher: OASES_ROLES.EVALUATOR,
};

export const useOasesAuth = () => {
  // ── Source 1: Explicit OASES Zustand store (existing OASES users) ──
  const {
    user: zustandUser,
    oasesRole: zustandOasesRole,
    isAuthenticated: zustandAuth,
    setAuth,
    clearAuth,
  } = useOasesAuthStore();

  // ── Source 2: ERP Redux store (admin / teacher fallback) ──────────
  const erpUser = useSelector((state) => state?.user?.user?.user);
  const erpRole = erpUser?.role;                          // 'admin' | 'teacher' | ...
  const erpMappedOasesRole = ERP_ROLE_TO_OASES[erpRole]; // undefined if not admin/teacher

  // ── Resolve: ERP role wins when present (avoids stale Zustand cache) ────
  // ERP admin/teacher → always use live ERP mapping.
  // Standalone OASES user with no ERP role → fall back to Zustand.
  const isAuthenticated = !!erpMappedOasesRole || zustandAuth;
  const oasesRole       = erpMappedOasesRole || zustandOasesRole || null;
  const user            = erpUser || zustandUser || null;

  /** True if the user has one of the given OASES roles */
  const hasRole = (...roles) => {
    if (!oasesRole) return false;
    // SUPER_ADMIN always passes
    if (oasesRole === OASES_ROLES.SUPER_ADMIN) return true;
    return roles.includes(oasesRole);
  };

  const isAdmin        = hasRole(OASES_ROLES.SCHOOL_ADMIN);
  const isEvaluator    = hasRole(OASES_ROLES.EVALUATOR);
  const isHeadExaminer = hasRole(OASES_ROLES.HEAD_EXAMINER);
  const isScanOperator = hasRole(OASES_ROLES.SCAN_OPERATOR);

  return {
    user,
    oasesRole,
    isAuthenticated,
    hasRole,
    isAdmin,
    isEvaluator,
    isHeadExaminer,
    isScanOperator,
    setAuth,
    clearAuth,
  };
};

export default useOasesAuth;
