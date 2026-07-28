import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isSidebarOpen: false,
  isnoticeopen:true,
};

export const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen; // Correctly toggling the sidebar state
    },
    togglenotice: (state) => {
        state.isnoticeopen = !state.isnoticeopen; // Correctly toggling the sidebar state
      },
  },
});

export const { toggleSidebar,togglenotice } = sidebarSlice.actions;

export default sidebarSlice.reducer;
