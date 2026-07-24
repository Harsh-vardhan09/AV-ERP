import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdRestoreFromTrash } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useGetDeletedFormsQuery, useRestoreFormMutation } from '../../../redux/api/customFormApi';

const DeletedForms = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const { data, isLoading } = useGetDeletedFormsQuery({ page, limit: 20 }, { refetchOnMountOrArgChange: true });
  const [restoreForm, { isLoading: restoring }] = useRestoreFormMutation();

  const forms      = data?.data?.forms      || [];
  const pagination = data?.data?.pagination || {};

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreForm(restoreTarget._id).unwrap();
      toast.success('Form restored successfully');
      setRestoreTarget(null);
    } catch { toast.error('Failed to restore form'); }
  };

  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <button onClick={() => navigate('/admin/custom-forms')}
          style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MdArrowBack size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>Deleted Forms</h1>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Restore or permanently manage deleted forms.</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['#','Title','Session','Deleted At','Action'].map((h, i) => (
                  <th key={i} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} style={{ padding: '14px 18px' }}>
                        <div style={{ height: 14, background: '#f1f5f9', borderRadius: 6, width: j === 1 ? 180 : 80, animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                    <div style={{ fontWeight: 600, color: '#374151' }}>No deleted forms</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>All your forms are active.</div>
                  </td>
                </tr>
              ) : (
                forms.map((form, idx) => (
                  <tr key={form._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '14px 18px', color: '#6b7280' }}>{(page - 1) * 20 + idx + 1}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#374151' }}>{form.title}</td>
                    <td style={{ padding: '14px 18px', color: '#374151' }}>{form.session || '—'}</td>
                    <td style={{ padding: '14px 18px', color: '#6b7280' }}>{fmt(form.deletedAt)}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <button onClick={() => setRestoreTarget(form)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        <MdRestoreFromTrash size={14} /> Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Total: {pagination.total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#d1d5db' : '#374151' }}>Previous</button>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', color: page === pagination.totalPages ? '#d1d5db' : '#374151' }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {restoreTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>♻️</div>
            <h3 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Restore Form?</h3>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', margin: '0 0 22px' }}>
              "<strong>{restoreTarget.title}</strong>" will be restored and made active again.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRestoreTarget(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleRestore} disabled={restoring}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                {restoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

export default DeletedForms;
