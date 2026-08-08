import React from 'react';
import { RouterProvider } from 'react-router-dom';
import AppProviders from '@app/providers';
import { router } from '@app/router';
import Loader from '@shared/ui/Loader';

const App = () => (
  <AppProviders>
    <RouterProvider router={router} fallbackElement={<Loader />} />
  </AppProviders>
);

export default App;
