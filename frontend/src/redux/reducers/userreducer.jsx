import { createSlice } from '@reduxjs/toolkit'

const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null, 
    isAuthenticated: false
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload; 
      if (action.payload?.token) {
        localStorage.setItem('token', action.payload.token);
      }
    },
    userlogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
  },
});

export const { setUser, userlogout } = userSlice.actions;
export default userSlice.reducer;
