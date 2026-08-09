import { useState, useEffect, useCallback, useRef } from 'react';

// Prefer VITE_API_BASE_URL (production), fall back to VITE_PORT (legacy), then localhost
const _BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PORT || 'http://localhost:5000';
const HEALTH_ENDPOINT = `${_BASE_URL}/api/v1/health`;
const INITIAL_CHECK_INTERVAL = 10_000; // 10 seconds
const DEGRADED_CHECK_INTERVAL = 5_000; // 5 seconds when server is down
const MAX_RESPONSE_TIME_MS = 8_000; // 8s timeout

/**
 * useServerHealth
 * ──────────────
 * Periodically pings the backend health endpoint.
 * Returns:
 *  - status: 'checking' | 'online' | 'offline' | 'degraded'
 *  - lastChecked: Date | null
 *  - responseTime: number (ms) | null
 *  - errorMessage: string | null
 *  - retryCount: number
 *  - manualRetry: () => void   — trigger an immediate re-check
 */
export function useServerHealth() {
  const [status, setStatus] = useState('checking');
  const [lastChecked, setLastChecked] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const timerRef = useRef(null);
  const isMounted = useRef(true);

  const checkHealth = useCallback(async () => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MAX_RESPONSE_TIME_MS);

      const res = await fetch(HEALTH_ENDPOINT, {
        method: 'GET',
        // NOTE: No credentials needed — /api/v1/health is a public endpoint.
        // Sending credentials cross-origin triggers a CORS preflight which
        // fails when the server returns a 5xx (no CORS headers on error responses).
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - start;

      if (!isMounted.current) return;

      if (res.ok) {
        setStatus('online');
        setResponseTime(elapsed);
        setErrorMessage(null);
        setRetryCount(0);
      } else {
        // Server responded but with an error status (5xx/4xx)
        setStatus('degraded');
        setResponseTime(elapsed);
        setErrorMessage(`Server returned ${res.status} ${res.statusText}`);
        setRetryCount((prev) => prev + 1);
      }
    } catch (err) {
      if (!isMounted.current) return;

      const elapsed = Date.now() - start;
      setResponseTime(elapsed < MAX_RESPONSE_TIME_MS ? elapsed : null);

      if (err.name === 'AbortError') {
        setStatus('offline');
        setErrorMessage('Connection timed out. Server is not responding.');
      } else if (!navigator.onLine) {
        setStatus('offline');
        setErrorMessage('No internet connection detected.');
      } else {
        setStatus('offline');
        setErrorMessage('Unable to reach the server. It may be down or restarting.');
      }
      setRetryCount((prev) => prev + 1);
    } finally {
      if (isMounted.current) {
        setLastChecked(new Date());
      }
    }
  }, []);

  // Kick off periodic polling
  useEffect(() => {
    isMounted.current = true;

    // Immediate first check
    checkHealth();

    const schedule = () => {
      const interval =
        status === 'offline' || status === 'degraded'
          ? DEGRADED_CHECK_INTERVAL
          : INITIAL_CHECK_INTERVAL;

      timerRef.current = setTimeout(() => {
        checkHealth().then(schedule);
      }, interval);
    };

    timerRef.current = setTimeout(schedule, INITIAL_CHECK_INTERVAL);

    return () => {
      isMounted.current = false;
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-schedule with tighter interval when offline/degraded
  useEffect(() => {
    clearTimeout(timerRef.current);
    const interval =
      status === 'offline' || status === 'degraded'
        ? DEGRADED_CHECK_INTERVAL
        : INITIAL_CHECK_INTERVAL;

    timerRef.current = setTimeout(function tick() {
      checkHealth().then(() => {
        if (isMounted.current) {
          const next =
            status === 'offline' || status === 'degraded'
              ? DEGRADED_CHECK_INTERVAL
              : INITIAL_CHECK_INTERVAL;
          timerRef.current = setTimeout(tick, next);
        }
      });
    }, interval);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const manualRetry = useCallback(() => {
    setStatus('checking');
    clearTimeout(timerRef.current);
    checkHealth();
  }, [checkHealth]);

  return { status, lastChecked, responseTime, errorMessage, retryCount, manualRetry };
}
