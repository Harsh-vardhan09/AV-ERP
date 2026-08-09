/**
 * SchoolStaffAdmin.jsx
 * Super admin view — see and create staff for any school.
 * Route: /superadmin/schools/:id/staff
 */

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCheckSuperAdminAuthQuery, SUPER_ADMIN_TOKEN_KEY } from '../api/superAdminApi';

const API_BASE = `${import.meta.env.VITE_PORT}/api/super-admin`;

// Cross-site cookie can be blocked; every other super-admin call sends Bearer too.
const authHeader = () => {
  try {
    const t = localStorage.getItem(SUPER_ADMIN_TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
};

// ── helpers ────────────────────────────────────────────────────────────────────
const roleBadge = {
  admin:     { label: 'Admin',     color: '#8b5cf6', bg: '#ede9fe' },
  admission: { label: 'Admission', color: '#3b82f6', bg: '#dbeafe' },
  accounts:  { label: 'Accounts',  color: '#22c55e', bg: '#dcfce7' },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const initials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase() || '?';

// ── Modal ──────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.mHead}>
          <h2 style={s.mTitle}>{title}</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Create staff form ──────────────────────────────────────────────────────────
const CreateForm = ({ onSubmit, loading }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'admin', phone: '' });
  const [err, setErr]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    if (!form.email.trim())     e.email     = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.role)             e.role      = 'Required';
    setErr(e);
    return !Object.keys(e).length;
  };

  const submit = (e) => { e.preventDefault(); if (validate()) onSubmit(form); };

  const field = (name, label, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{label}</label>
      <input
        style={{ ...s.input, ...(err[name] ? { borderColor: '#ef4444' } : {}) }}
        type={type} value={form[name]} autoComplete="off"
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        disabled={loading}
      />
      {err[name] && <span style={{ color: '#ef4444', fontSize: 11.5 }}>{err[name]}</span>}
    </div>
  );

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        {field('firstName', 'First Name *')}
        {field('lastName',  'Last Name *')}
      </div>
      {field('email', 'Email *', 'email')}
      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>Role *</label>
        <select style={s.input} value={form.role}
          onChange={e => setForm(p => ({ ...p, role: e.target.value }))} disabled={loading}>
          <option value="admin">Admin</option>
          <option value="admission">Admission Staff</option>
          <option value="accounts">Accounts Staff</option>
        </select>
      </div>
      {field('phone', 'Phone (optional)')}
      <div style={s.infoBox}>
        ℹ️ A random temporary password will be generated and emailed to the staff member.
        They must change it on first login.
      </div>
      <button type="submit" style={s.btn} disabled={loading}>
        {loading ? '⏳ Creating…' : '✉️ Create & Send Credentials'}
      </button>
    </form>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const SchoolStaffAdmin = () => {
  const { id: schoolId } = useParams();
  const [staff, setStaff]         = useState(null);
  const [school, setSchool]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [error, setError]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [msg, setMsg]             = useState('');

  // Fetch on mount
  React.useEffect(() => {
    if (fetched) return;
    setLoading(true);
    fetch(`${API_BASE}/schools/${schoolId}/staff`, { credentials: 'include', headers: authHeader() })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStaff(data.data.staff);
          setSchool(data.data.school);
        } else {
          setError(data.message || 'Failed to load staff');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => { setLoading(false); setFetched(true); });
  }, [schoolId, fetched]);

  const handleCreate = async (form) => {
    setCreating(true);
    setMsg('');
    try {
      const res  = await fetch(`${API_BASE}/schools/${schoolId}/staff`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`✅ ${data.message}`);
        setShowCreate(false);
        setFetched(false); // refetch
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch {
      setMsg('❌ Network error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ssa-table { width:100%; border-collapse:collapse; }
        .ssa-table th, .ssa-table td { padding:12px 14px; border-bottom:1px solid #f1f5f9; text-align:left; font-size:13px; }
        .ssa-table th { background:#f8fafc; font-weight:600; color:#475569; font-size:12px; text-transform:uppercase; }
        .ssa-table tr:hover td { background:#f8fafc; }
      `}</style>

      <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '0 4px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, fontSize: 13, color: '#94a3b8' }}>
          <Link to="/superadmin/schools" style={{ color: '#6366f1', textDecoration: 'none' }}>
            ← All Schools
          </Link>
          {school && <> / <strong style={{ color: '#1e293b' }}>{school.name}</strong> / Staff</>}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {school ? `${school.name} — Staff` : 'School Staff'}
            </h1>
            {school && (
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                School Code: <strong style={{ color: '#6366f1' }}>{school.code}</strong>
              </span>
            )}
          </div>
          <button style={s.btn} onClick={() => setShowCreate(true)}>
            + Create Staff for This School
          </button>
        </div>

        {/* Inline messages */}
        {msg && (
          <div style={{
            background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
            color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', fontSize: 13,
          }}>
            {msg}
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading staff…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>{error}</div>
          ) : !staff?.length ? (
            <div style={{ textAlign: 'center', padding: 72 }}>
              <div style={{ fontSize: 50, marginBottom: 12 }}>👥</div>
              <h3 style={{ color: '#334155' }}>No staff members found</h3>
              <p style={{ color: '#94a3b8' }}>Create the first staff member using the button above.</p>
            </div>
          ) : (
            <table className="ssa-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Password</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(m => {
                  const rc = roleBadge[m.role] || {};
                  return (
                    <tr key={m._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${rc.color || '#6366f1'}, #8b5cf6)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
                          }}>{initials(m.firstName, m.lastName)}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {m.firstName} {m.lastName}
                            </div>
                            {m.phone && <div style={{ color: '#94a3b8', fontSize: 11 }}>{m.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#475569', fontSize: 13 }}>{m.email}</td>
                      <td>
                        <span style={{ background: rc.bg, color: rc.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                          {rc.label || m.role}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          background: m.isActive ? '#dcfce7' : '#fee2e2',
                          color: m.isActive ? '#16a34a' : '#dc2626',
                          borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                        }}>
                          {m.isActive ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td>
                        {m.mustChangePassword ? (
                          <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                            ⚠ Must Change
                          </span>
                        ) : (
                          <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: 20, padding: '3px 10px', fontSize: 12 }}>
                            ✓ Set
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{fmt(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Create modal */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="➕ Create Staff for School">
          <CreateForm onSubmit={handleCreate} loading={creating} />
        </Modal>
      </div>
    </>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500,
    boxShadow: '0 24px 80px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto',
    padding: '28px 28px 24px',
  },
  mHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mTitle: { fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#64748b' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 },
  input: { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#1e293b', outline: 'none', fontFamily: 'Inter, sans-serif', background: '#f8fafc' },
  btn: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', width: '100%', marginTop: 4 },
  infoBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', color: '#1d4ed8', fontSize: 12.5, marginBottom: 18, lineHeight: 1.6 },
};

export default SchoolStaffAdmin;
