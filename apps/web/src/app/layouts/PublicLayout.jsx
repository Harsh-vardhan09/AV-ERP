import React from 'react';
import { Outlet } from 'react-router-dom';

// Public pages have never shared any chrome; this is the seam where it would go.
const PublicLayout = () => <Outlet />;

export default PublicLayout;
