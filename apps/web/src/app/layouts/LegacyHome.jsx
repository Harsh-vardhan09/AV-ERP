import React from 'react';
import Sidebar from '@app/layouts/LegacySidebar';
import HomePage from '@app/pages/Homepage';

// /home has always rendered these two as siblings with no layout route.
const LegacyHome = () => (
  <>
    <Sidebar />
    <HomePage />
  </>
);

export default LegacyHome;
