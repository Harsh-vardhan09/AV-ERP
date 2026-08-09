import React from 'react';
import { Toaster } from 'react-hot-toast';
import StoreProvider from '@app/providers/StoreProvider';
import ServerHealthGate from '@app/providers/ServerHealthGate';
import SchoolSettingsProvider from '@app/providers/SchoolSettingsProvider';
import SocketProvider from '@app/providers/SocketProvider';

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
