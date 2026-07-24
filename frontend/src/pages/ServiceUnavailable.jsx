import React, { useEffect, useState, useRef } from 'react';

/* ─── Inline keyframes injected once ─── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  @keyframes su-float {
    0%,100% { transform: translateY(0px) rotate(-2deg); }
    50%      { transform: translateY(-18px) rotate(2deg); }
  }
  @keyframes su-pulse-ring {
    0%   { transform: scale(0.95); opacity: 1; }
    100% { transform: scale(1.6);  opacity: 0; }
  }
  @keyframes su-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes su-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes su-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes su-blob1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(40px,-30px) scale(1.1); }
    66%     { transform: translate(-20px,20px) scale(0.95); }
  }
  @keyframes su-blob2 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(-50px,30px) scale(1.08); }
    66%     { transform: translate(30px,-20px) scale(0.93); }
  }
  @keyframes su-blob3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(20px,40px) scale(1.12); }
  }
  @keyframes su-dot-bounce {
    0%,80%,100% { transform: scale(0); }
    40%         { transform: scale(1); }
  }
  @keyframes su-progress {
    0%   { width: 0%; }
    100% { width: 100%; }
  }
  @keyframes su-tick {
    to { stroke-dashoffset: 0; }
  }
  @keyframes su-counter {
    from { opacity: 0.4; }
    to   { opacity: 1; }
  }

  .su-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .su-root {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: #060b18;
  }

  /* ── Background gradient mesh ── */
  .su-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99,102,241,0.18) 0%, transparent 60%),
      radial-gradient(ellipse 70% 50% at 80% 80%, rgba(236,72,153,0.14) 0%, transparent 55%),
      radial-gradient(ellipse 50% 40% at 55% 50%, rgba(14,165,233,0.10) 0%, transparent 50%),
      linear-gradient(135deg, #060b18 0%, #0d1526 50%, #060b18 100%);
    z-index: 0;
  }

  /* ── Animated blobs ── */
  .su-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(72px);
    opacity: 0.5;
    z-index: 0;
    pointer-events: none;
  }
  .su-blob-1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(99,102,241,0.35), transparent 70%);
    top: -120px; left: -100px;
    animation: su-blob1 18s ease-in-out infinite;
  }
  .su-blob-2 {
    width: 450px; height: 450px;
    background: radial-gradient(circle, rgba(236,72,153,0.25), transparent 70%);
    bottom: -80px; right: -80px;
    animation: su-blob2 22s ease-in-out infinite;
  }
  .su-blob-3 {
    width: 350px; height: 350px;
    background: radial-gradient(circle, rgba(14,165,233,0.20), transparent 70%);
    top: 50%; left: 55%;
    animation: su-blob3 15s ease-in-out infinite;
  }

  /* ── Grid overlay ── */
  .su-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 48px 48px;
    z-index: 0;
    pointer-events: none;
  }

  /* ── Content card ── */
  .su-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 560px;
    margin: 24px;
    background: rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 28px;
    padding: 52px 48px 44px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.06),
      0 32px 64px rgba(0,0,0,0.5),
      0 0 100px rgba(99,102,241,0.12);
    animation: su-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both;
  }

  /* ── Icon area ── */
  .su-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    margin: 0 auto 32px;
  }
  .su-icon-bg {
    position: absolute;
    inset: 0;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(236,72,153,0.20));
    border: 1px solid rgba(99,102,241,0.3);
    animation: su-float 4.5s ease-in-out infinite;
  }
  .su-icon-pulse {
    position: absolute;
    inset: -8px;
    border-radius: 32px;
    border: 2px solid rgba(99,102,241,0.4);
    animation: su-pulse-ring 2.2s cubic-bezier(0.4,0,0.6,1) infinite;
  }
  .su-icon-pulse-2 {
    animation-delay: 1.1s;
  }
  .su-icon-svg {
    position: relative;
    z-index: 1;
    animation: su-float 4.5s ease-in-out infinite;
  }

  /* ── Status badge ── */
  .su-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 100px;
    padding: 5px 14px;
    font-size: 11.5px;
    font-weight: 600;
    color: #f87171;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .su-badge-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #ef4444;
    animation: su-pulse-ring 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  /* ── Heading ── */
  .su-heading {
    font-size: 32px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.6px;
    color: #f1f5f9;
    margin-bottom: 12px;
    text-align: center;
  }
  .su-heading-gradient {
    background: linear-gradient(135deg, #818cf8, #e879f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .su-subtext {
    font-size: 15px;
    line-height: 1.65;
    color: rgba(148,163,184,0.9);
    text-align: center;
    margin-bottom: 32px;
  }

  /* ── Progress bar ── */
  .su-progress-wrap {
    background: rgba(255,255,255,0.06);
    border-radius: 100px;
    height: 4px;
    overflow: hidden;
    margin-bottom: 28px;
  }
  .su-progress-bar {
    height: 100%;
    border-radius: 100px;
    background: linear-gradient(90deg, #6366f1, #e879f9, #6366f1);
    background-size: 200% 100%;
    animation: su-shimmer 2.2s linear infinite;
  }

  /* ── Info rows ── */
  .su-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 28px;
  }
  .su-info-item {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .su-info-icon {
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .su-info-label {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(148,163,184,0.6);
    margin-bottom: 3px;
  }
  .su-info-value {
    font-size: 12.5px;
    font-weight: 500;
    color: #cbd5e1;
  }
  .su-info-value.error {
    color: #fca5a5;
  }

  /* ── Retry button ── */
  .su-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px 24px;
    border-radius: 12px;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    outline: none;
    letter-spacing: 0.1px;
  }
  .su-btn-primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  }
  .su-btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    box-shadow: 0 6px 24px rgba(99,102,241,0.5);
    transform: translateY(-1px);
  }
  .su-btn-primary:active { transform: translateY(0); }
  .su-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* ── Three-dot loading indicator ── */
  .su-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .su-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #fff;
    animation: su-dot-bounce 1.4s ease-in-out infinite both;
  }
  .su-dot:nth-child(1) { animation-delay: 0s; }
  .su-dot:nth-child(2) { animation-delay: 0.16s; }
  .su-dot:nth-child(3) { animation-delay: 0.32s; }

  /* ── Footer note ── */
  .su-footer {
    margin-top: 24px;
    text-align: center;
    font-size: 12px;
    color: rgba(148,163,184,0.45);
    line-height: 1.6;
  }
  .su-footer a {
    color: rgba(148,163,184,0.65);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* ── Retry count badge ── */
  .su-retry-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    background: rgba(99,102,241,0.1);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 100px;
    font-size: 11px;
    font-weight: 500;
    color: #a5b4fc;
    margin-top: 10px;
  }

  /* ── Countdown ── */
  .su-countdown {
    font-size: 12px;
    font-weight: 500;
    color: rgba(148,163,184,0.5);
    text-align: center;
    margin-top: 10px;
    animation: su-counter 1s linear infinite alternate;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .su-card {
      padding: 36px 24px 32px;
      border-radius: 20px;
    }
    .su-heading { font-size: 24px; }
    .su-info-grid { grid-template-columns: 1fr; }
  }
`;

/* ─── SVG Icons ─── */
const ServerIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#e879f9" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

function formatTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function useCountdown(seconds) {
  const [count, setCount] = useState(seconds);
  useEffect(() => {
    setCount(seconds);
    const id = setInterval(() => setCount(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return count;
}

/* ─────────────────────────────────────────────
   ServiceUnavailable — main export
   Props:
     status       'checking' | 'offline' | 'degraded'
     lastChecked  Date | null
     responseTime number | null
     errorMessage string | null
     retryCount   number
     manualRetry  () => void
   ───────────────────────────────────────────── */
export default function ServiceUnavailable({
  status = 'offline',
  lastChecked = null,
  responseTime = null,
  errorMessage = null,
  retryCount = 0,
  manualRetry,
}) {
  const [checking, setChecking] = useState(false);
  // Countdown for auto-retry (5s intervals when degraded/offline)
  const nextRetryIn = useCountdown(checking ? 0 : 5);

  const handleRetry = () => {
    if (checking) return;
    setChecking(true);
    manualRetry?.();
    setTimeout(() => setChecking(false), 3000);
  };

  const statusLabel = status === 'degraded' ? 'Service Degraded' : 'Server Offline';
  const statusColor = status === 'degraded' ? '#fbbf24' : '#ef4444';

  return (
    <>
      <style>{STYLES}</style>
      <div className="su-root" role="alert" aria-live="assertive">
        {/* Background */}
        <div className="su-bg" aria-hidden="true" />
        <div className="su-grid" aria-hidden="true" />
        <div className="su-blob su-blob-1" aria-hidden="true" />
        <div className="su-blob su-blob-2" aria-hidden="true" />
        <div className="su-blob su-blob-3" aria-hidden="true" />

        {/* Card */}
        <div className="su-card">

          {/* Icon */}
          <div className="su-icon-wrap" aria-hidden="true">
            <div className="su-icon-pulse" />
            <div className="su-icon-pulse su-icon-pulse-2" />
            <div className="su-icon-bg" />
            <div className="su-icon-svg">
              <ServerIcon />
            </div>
          </div>

          {/* Status badge */}
          <div style={{ textAlign: 'center' }}>
            <span className="su-badge" style={{ borderColor: `${statusColor}40`, color: statusColor, background: `${statusColor}18` }}>
              <span className="su-badge-dot" style={{ background: statusColor }} />
              {statusLabel}
            </span>
          </div>

          {/* Heading */}
          <h1 className="su-heading">
            Service{' '}
            <span className="su-heading-gradient">Unavailable</span>
          </h1>

          {/* Subtext */}
          <p className="su-subtext">
            We're aware of the issue and our team is actively working to restore
            service. Everything will be back online shortly.{' '}
            <strong style={{ color: '#94a3b8' }}>No action needed on your end.</strong>
          </p>

          {/* Animated progress bar */}
          <div className="su-progress-wrap" aria-hidden="true">
            <div
              className="su-progress-bar"
              style={{ width: status === 'checking' ? '60%' : '35%' }}
            />
          </div>

          {/* Info grid */}
          <div className="su-info-grid">
            <div className="su-info-item">
              <span className="su-info-icon">🕐</span>
              <div>
                <div className="su-info-label">Last Checked</div>
                <div className="su-info-value">{formatTime(lastChecked)}</div>
              </div>
            </div>
            <div className="su-info-item">
              <span className="su-info-icon">🔁</span>
              <div>
                <div className="su-info-label">Retry Attempts</div>
                <div className="su-info-value">{retryCount}</div>
              </div>
            </div>
            <div className="su-info-item">
              <span className="su-info-icon">⚡</span>
              <div>
                <div className="su-info-label">Response Time</div>
                <div className="su-info-value">
                  {responseTime != null ? `${responseTime} ms` : 'Timed out'}
                </div>
              </div>
            </div>
            <div className="su-info-item">
              <span className="su-info-icon">🌐</span>
              <div>
                <div className="su-info-label">Network</div>
                <div className="su-info-value">
                  {navigator.onLine ? 'Connected' : 'Offline'}
                </div>
              </div>
            </div>
          </div>

          {/* Error message (if any) */}
          {errorMessage && (
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '20px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
              <p style={{ fontSize: '12.5px', color: '#fca5a5', lineHeight: 1.5 }}>
                {errorMessage}
              </p>
            </div>
          )}

          {/* Retry button */}
          <button
            id="su-retry-btn"
            className="su-btn su-btn-primary"
            onClick={handleRetry}
            disabled={checking}
            aria-label="Retry connecting to server"
          >
            {checking ? (
              <div className="su-dots">
                <div className="su-dot" />
                <div className="su-dot" />
                <div className="su-dot" />
              </div>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Retry Connection
              </>
            )}
          </button>

          {/* Auto-retry countdown */}
          {!checking && (
            <p className="su-countdown" aria-live="polite">
              Auto-checking in {nextRetryIn}s…
            </p>
          )}

          {/* Footer */}
          <div className="su-footer">
            If this issue persists, please contact your system administrator.
            <br />
            <span style={{ opacity: 0.5 }}>ERP System · {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </>
  );
}
