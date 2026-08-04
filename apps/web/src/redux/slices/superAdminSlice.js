import { createSlice } from '@reduxjs/toolkit';

/**
 * superAdminSlice — Redux state for the logged-in super admin.
 *
 * SECURITY NOTE: This slice is intentionally NOT persisted via redux-persist.
 * If the super admin refreshes the page, checkSuperAdminAuth API call
 * re-validates the httpOnly cookie and repopulates this state.
 * This prevents stale super admin sessions in localStorage.
 */
const initialState = {
  superAdmin: null,
  isAuthenticated: false,
};

const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    setSuperAdmin: (state, action) => {
      state.superAdmin = action.payload;
      state.isAuthenticated = true;
    },
    clearSuperAdmin: (state) => {
      state.superAdmin = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setSuperAdmin, clearSuperAdmin } = superAdminSlice.actions;
export default superAdminSlice.reducer;
