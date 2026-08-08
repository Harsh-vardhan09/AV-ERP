// store/store.js
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';

const store = configureStore({
  reducer: {},
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializability checks
        ignoredActions: ['form/setImage'],
        ignoredPaths: ['form.image'], // Ignore image state path
      },
    }),
});

export default store;
