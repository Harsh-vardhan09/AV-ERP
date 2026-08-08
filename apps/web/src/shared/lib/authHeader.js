/**
 * Shared helper to attach Bearer token to all RTK Query API requests
 */
export const prepareAuthHeaders = (headers, { getState }) => {
  const token = getState()?.user?.user?.token || localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

/**
 * Same token, as a plain object — for raw fetch() calls that bypass RTK Query.
 * The cookie alone is not enough cross-site (Vercel -> Render).
 */
export const authHeaders = () => {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};
