import React from 'react';
import { Toaster } from 'react-hot-toast';
import StoreProvider from './StoreProvider';
import ServerHealthGate from './ServerHealthGate';
import SchoolSettingsProvider from './SchoolSettingsProvider';
import SocketProvider from './SocketProvider';

// Order matters: everything below StoreProvider reads redux, and the health
// gate replaces the whole app when the API is confirmed down.
const AppProviders = ({ children }) => (
  <StoreProvider>
    <ServerHealthGate>
      <SchoolSettingsProvider>
        <SocketProvider>
          {children}
          <Toaster position="top-right" />
        </SocketProvider>
      </SchoolSettingsProvider>
    </ServerHealthGate>
  </StoreProvider>
);

export default AppProviders;
