import React from 'react';
import Sidebar from '../../pages/Sidebar';
import HomePage from '../../pages/Homepage';

// /home has always rendered these two as siblings with no layout route.
const LegacyHome = () => (
  <>
    <Sidebar />
    <HomePage />
  </>
);

export default LegacyHome;
