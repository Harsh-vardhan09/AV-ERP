import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Payroll Module — Coming Soon
 * ─────────────────────────────────────────────────────────────
 * Temporarily replaces the full payroll module.
 * All payroll routes render this page until the module goes live.
 * To re-enable: restore the lazy-loaded sub-routes in this file.
 */
const PayrollModuleHub = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>
      {/* Animated background blobs */}
      <div style={{ ...styles.blob, ...styles.blob1 }} />
      <div style={{ ...styles.blob, ...styles.blob2 }} />

      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconRing}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>

        {/* Badge */}
        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          Under Development
        </div>

        <h1 style={styles.title}>Payroll Module</h1>
        <p style={styles.subtitle}>
          We're building a powerful payroll system — salary structures,
          automated pay runs, payslips &amp; reports — all in one place.
        </p>

        {/* Features preview */}
        <div style={styles.featureGrid}>
          {[
            { icon: '💰', label: 'Salary Structures' },
            { icon: '🔄', label: 'Auto Pay Runs' },
            { icon: '📄', label: 'Payslip Generation' },
            { icon: '📊', label: 'Reports & Analytics' },
            { icon: '🏦', label: 'Bank Transfer Files' },
            { icon: '📅', label: 'Attendance Sync' },
          ].map(({ icon, label }) => (
            <div key={label} style={styles.featureChip}>
              <span style={styles.featureIcon}>{icon}</span>
              <span style={styles.featureLabel}>{label}</span>
            </div>
          ))}
        </div>

        {/* Back button */}
        <button
          style={styles.backBtn}
          onClick={() => navigate(-1)}
          onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
          onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
        >
          ← Go Back to Dashboard
        </button>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0c29 0%, #1a1035 50%, #0f0c29 100%)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.25,
    pointerEvents: 'none',
  },
  blob1: {
    width: 400,
    height: 400,
    background: 'radial-gradient(circle, #6366f1, #8b5cf6)',
    top: '-100px',
    right: '-100px',
    animation: 'none',
  },
  blob2: {
    width: 350,
    height: 350,
    background: 'radial-gradient(circle, #3b82f6, #6366f1)',
    bottom: '-80px',
    left: '-80px',
  },
  card: {
    position: 'relative',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: '48px 40px',
    maxWidth: 560,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 0 40px rgba(99,102,241,0.25)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.35)',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#a5b4fc',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#6366f1',
    boxShadow: '0 0 8px #6366f1',
    display: 'inline-block',
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: '#f1f5f9',
    margin: '0 0 14px',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 1.7,
    margin: '0 0 32px',
    maxWidth: 420,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 36,
  },
  featureChip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '14px 8px',
    transition: 'border-color 0.2s',
  },
  featureIcon: {
    fontSize: 22,
    lineHeight: 1,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.02em',
    textAlign: 'center',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    letterSpacing: '0.01em',
  },
};

export default PayrollModuleHub;
