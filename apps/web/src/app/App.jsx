import React from 'react';
import { RouterProvider } from 'react-router-dom';
import AppProviders from './providers';
import { router } from './router';
import Loader from '@shared/ui/Loader';

const App = () => (
  <AppProviders>
    <RouterProvider router={router} fallbackElement={<Loader />} />
  </AppProviders>
);

export default App;
