import { createSlice } from '@reduxjs/toolkit';

/**
 * notificationSlice
 *
 * Holds the real-time unread count updated by Socket.io.
 * Separate from RTK Query cache so the bell updates INSTANTLY
 * without waiting for the polling interval.
 */

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    unreadCount: 0,
    // Latest notification received via socket (for toast popup tracking)
    latestNotification: null,
  },
  reducers: {
    setUnreadCount: (state, action) => {
      state.unreadCount = Number(action.payload) || 0;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    decrementUnreadCount: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
    setLatestNotification: (state, action) => {
      state.latestNotification = action.payload;
    },
  },
});

export const {
  setUnreadCount,
  incrementUnreadCount,
  decrementUnreadCount,
  resetUnreadCount,
  setLatestNotification,
} = notificationSlice.actions;

export default notificationSlice.reducer;
