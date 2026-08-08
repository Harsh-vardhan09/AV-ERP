import React from 'react';
import { useServerHealth } from '@shared/hooks/useServerHealth';
import ServiceUnavailable from '@shared/ui/ServiceUnavailable';

// Require this many consecutive failures before blocking the app. Prevents a
// single transient network glitch (or a cold-start 5xx during Vercel wake-up)
// from locking users out.
const FAILURE_THRESHOLD = 2;

const ServerHealthGate = ({ children }) => {
  const { status, lastChecked, responseTime, errorMessage, retryCount, manualRetry } =
    useServerHealth();

  const isConfirmedDown =
    (status === 'offline' || status === 'degraded') && retryCount >= FAILURE_THRESHOLD;

  if (isConfirmedDown) {
    return (
      <ServiceUnavailable
        status={status}
        lastChecked={lastChecked}
        responseTime={responseTime}
        errorMessage={errorMessage}
        retryCount={retryCount}
        manualRetry={manualRetry}
      />
    );
  }

  return children;
};

export default ServerHealthGate;
