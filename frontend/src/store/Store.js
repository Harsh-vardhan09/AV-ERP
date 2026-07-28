// store/store.js
import { configureStore,getDefaultMiddleware } from '@reduxjs/toolkit';

import formReducer from '../redux/reducers/FormSlice';
import eventsReducer from "../redux/reducers/EventSlice";
const store = configureStore({
    reducer: {
        form: formReducer,
        events: eventsReducer,
    },
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
