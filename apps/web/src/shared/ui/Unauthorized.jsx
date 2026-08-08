import React from 'react';

const Unauthorized = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #060b18 0%, #0d1526 100%)',
    color: '#fff', fontFamily: 'Inter,system-ui,sans-serif', gap: '16px',
  }}>
    <div style={{ fontSize: '56px', filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.4))' }}>🔒</div>
    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Access Denied</h1>
    <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>You don&apos;t have permission to view this page.</p>
    <button
      onClick={() => window.history.back()}
      style={{
        marginTop: '8px', padding: '12px 28px', borderRadius: '10px', border: 'none',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
        fontWeight: 600, cursor: 'pointer', fontSize: '14px',
        boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
      }}
    >
      ← Go Back
    </button>
  </div>
);

export default Unauthorized;
