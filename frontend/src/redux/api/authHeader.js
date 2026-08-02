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
