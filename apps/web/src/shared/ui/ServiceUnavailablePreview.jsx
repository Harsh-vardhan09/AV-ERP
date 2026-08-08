import React from 'react';
import ServiceUnavailable from './ServiceUnavailable';

// /service-unavailable — lets the down-screen be opened directly for testing.
const ServiceUnavailablePreview = () => (
  <ServiceUnavailable
    status="offline"
    lastChecked={new Date()}
    responseTime={null}
    errorMessage="Unable to reach the server. It may be down or restarting."
    retryCount={3}
    manualRetry={() => { window.location.href = '/'; }}
  />
);

export default ServiceUnavailablePreview;
