// ══════════════════════════════════════════════════════════════════
// OASES — Auth Store (Zustand)
// Tracks the authenticated user's OASES role on top of the existing
// ERP auth. Does NOT replace Redux — runs alongside it.
// Persisted to localStorage under key 'oases-auth'
// ══════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useOasesAuthStore = create(
  persist(
    (set) => ({
      // ── State ────────────────────────────────────────────────
      user:             null,    // { _id, name, email, role, oasesRole, schoolId }
      token:            null,    // same JWT as ERP — stored here for OASES Axios
      oasesRole:        null,    // OASES-specific role (from OASES_ROLES enum)
      isAuthenticated:  false,

      // ── Actions ──────────────────────────────────────────────

      /**
       * Call this after a successful ERP login if user has oasesRole.
       * @param {object} user   Full user object from API
       * @param {string} token  JWT access token
       */
      setAuth: (user, token) =>
        set({
          user,
          token,
          oasesRole:       user?.oasesRole || null,
          isAuthenticated: true,
        }),

      /** Clear on logout */
      clearAuth: () =>
        set({
          user:            null,
          token:           null,
          oasesRole:       null,
          isAuthenticated: false,
        }),

      /** Update OASES role independently (e.g. after role assignment) */
      setOasesRole: (role) => set({ oasesRole: role }),
    }),
    {
      name:    'oases-auth',
      // Persist all fields — isAuthenticated must survive page refresh
      partialize: (state) => ({
        user:            state.user,
        oasesRole:       state.oasesRole,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useOasesAuthStore;
