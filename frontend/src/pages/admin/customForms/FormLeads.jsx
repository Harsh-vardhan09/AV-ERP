import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack, MdPerson } from 'react-icons/md';
import { useGetFormLeadsQuery } from '../../../redux/api/customFormApi';

const FormLeads = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useGetFormLeadsQuery({ id, page, limit: 20, status }, { refetchOnMountOrArgChange: true });

  const form       = data?.data?.form       || null;
  const leads      = data?.data?.leads      || [];
  const pagination = data?.data?.pagination || {};

  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const statusBadge = (s) => {
    const cfg = {
      new:       { bg: '#eff6ff', color: '#1d4ed8', label: 'New' },
      contacted: { bg: '#fef3c7', color: '#92400e', label: 'Contacted' },
      converted: { bg: '#f0fdf4', color: '#15803d', label: 'Converted' },
      rejected:  { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected' },
    };
    const c = cfg[s] || cfg.new;
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{c.label}</span>;
  };

  // Build column headers from enabled predefined fields or custom fields
  const formFields = form
    ? (form.fieldMode === 'predefined'
        ? (form.predefinedFields || []).filter(f => f.enabled).map(f => ({ key: f.fieldKey, label: f.fieldName }))
        : (form.customFields || []).map(f => ({ key: f.label, label: f.label })))
    : [];

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/admin/custom-forms')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdArrowBack size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>
              Form Leads {form ? `— ${form.title}` : ''}
            </h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>All submissions for this form.</p>
          </div>
        </div>

        {/* Filter by status */}
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}>
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Leads', value: pagination.total ?? 0, color: '#6366f1' },
          { label: 'New', value: leads.filter(l => l.status === 'new').length, color: '#3b82f6' },
          { label: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, color: '#f59e0b' },
          { label: 'Converted', value: leads.filter(l => l.status === 'converted').length, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>#</th>
                {formFields.slice(0, 5).map(f => (
                  <th key={f.key} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{f.label}</th>
                ))}
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: formFields.slice(0, 5).length + 3 }).map((__, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ height: 14, background: '#f1f5f9', borderRadius: 6, width: j === 1 ? 140 : 80, animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={formFields.slice(0, 5).length + 3} style={{ padding: '52px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                    <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No leads yet</div>
                    <div style={{ fontSize: 12 }}>Share your form link to start receiving enquiries.</div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, idx) => {
                  const fields = lead.fields instanceof Object ? lead.fields : {};
                  return (
                    <tr key={lead._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MdPerson size={14} color="#fff" />
                          </div>
                          {(page - 1) * 20 + idx + 1}
                        </div>
                      </td>
                      {formFields.slice(0, 5).map(f => (
                        <td key={f.key} style={{ padding: '14px 16px', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(fields[f.key] ?? fields.get?.(f.key) ?? '—')}
                        </td>
                      ))}
                      <td style={{ padding: '14px 16px' }}>{statusBadge(lead.status)}</td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmt(lead.submittedAt || lead.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#d1d5db' : '#374151' }}>Previous</button>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', color: page === pagination.totalPages ? '#d1d5db' : '#374151' }}>Next</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

export default FormLeads;
