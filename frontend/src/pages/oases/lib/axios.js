// ══════════════════════════════════════════════════════════════════
// OASES — Axios Instance
// Dedicated Axios client for OASES API calls.
// • Reads JWT from localStorage (same key as existing ERP auth)
// • 401 → clears token and redirects to /login
// • 403 → redirects to /unauthorized
// ══════════════════════════════════════════════════════════════════
import axios from 'axios';

const oasesAxios = axios.create({
  baseURL: `${import.meta.env.VITE_PORT || import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/v1/oases`,
  withCredentials: true,
  timeout: 30000,
});

// ── Request Interceptor ───────────────────────────────────────────
oasesAxios.interceptors.request.use(
  (config) => {
    // Token may be in cookie (existing ERP) or localStorage
    // Try localStorage first (fallback for dev / non-cookie flows)
    const stored = localStorage.getItem('erp-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[oasesAxios] Token attached to request');
        } else {
          console.warn('[oasesAxios] Token not found in erp-auth.state');
        }
      } catch (e) {
        console.warn('[oasesAxios] Error parsing erp-auth:', e.message);
      }
    } else {
      console.warn('[oasesAxios] No erp-auth found in localStorage');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────
oasesAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Expired/invalid session → force re-login
      localStorage.removeItem('erp-auth');
      window.location.href = '/login';
    }
    // NOTE: 403 is NOT globally redirected — individual components
    // handle access-denied gracefully (show error state / empty UI).
    // A single 403 from a background API call should NOT kick the
    // whole user out of the page.

    return Promise.reject(error);
  }
);

export default oasesAxios;
