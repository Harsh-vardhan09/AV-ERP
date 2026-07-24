import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdDelete, MdRestoreFromTrash, MdEdit, MdList, MdSearch, MdLink, MdLinkOff } from 'react-icons/md';
import { FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  useGetAllFormsQuery,
  useToggleFormStatusMutation,
  useDeleteFormMutation,
} from '../../../redux/api/customFormApi';

const AllForms = () => {
  const navigate = useNavigate();
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [limit]               = useState(20);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isFetching } = useGetAllFormsQuery(
    { page, limit, search },
    { refetchOnMountOrArgChange: true }
  );

  const [toggleStatus] = useToggleFormStatusMutation();
  const [deleteForm]   = useDeleteFormMutation();

  const forms      = data?.data?.forms      || [];
  const pagination = data?.data?.pagination || {};

  const handleToggle = async (form) => {
    try {
      await toggleStatus({ id: form._id, status: !form.status }).unwrap();
      toast.success(`Form ${!form.status ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteForm(deleteTarget._id).unwrap();
      toast.success('Form moved to trash');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete form');
    }
  };

  const fmt = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text, #111)', margin: 0 }}>Custom Forms</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Build and manage custom enquiry / admission forms for your school.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/admin/custom-forms/deleted')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            <MdRestoreFromTrash size={16} />
            Deleted Forms
          </button>
          <button
            onClick={() => navigate('/admin/custom-forms/create')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
          >
            <MdAdd size={17} />
            Create New Form
          </button>
        </div>
      </div>

      {/* Stats card + Search row */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 22px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MdList size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Total Forms</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{pagination.total ?? 0}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search forms…"
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', width: 220 }}
              />
            </div>
            <select
              value={limit}
              style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
            >
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['#','Title','Total Leads','Link to Lead','Receiver Email','Session','Status','Created At','Action'].map((h,i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ height: 14, background: '#f1f5f9', borderRadius: 6, width: j === 1 ? 160 : 60, animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                    <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>No forms yet</div>
                    <div style={{ fontSize: 12 }}>Create your first custom form to start collecting enquiries.</div>
                  </td>
                </tr>
              ) : (
                forms.map((form, idx) => (
                  <tr key={form._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '14px 16px', color: '#6b7280' }}>{(page - 1) * limit + idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111' }}>
                      {form.title}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 28, height: 22, borderRadius: 20,
                        background: form.totalLeads > 0 ? '#eff6ff' : '#f1f5f9',
                        color: form.totalLeads > 0 ? '#3b82f6' : '#9ca3af',
                        fontWeight: 700, fontSize: 12, padding: '0 8px',
                      }}>
                        {form.totalLeads}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {form.linkToLead ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6366f1', fontWeight: 500 }}>
                          <MdLink size={14} /> Linked
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#9ca3af' }}>
                          <MdLinkOff size={14} /> Not linked
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151' }}>{form.receiverEmail || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ padding: '14px 16px', color: '#374151' }}>{form.session || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {/* iOS-style toggle */}
                      <button
                        onClick={() => handleToggle(form)}
                        style={{
                          width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: form.status ? '#22c55e' : '#e5e7eb',
                          position: 'relative', transition: 'background 0.25s',
                        }}
                        title={form.status ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                      >
                        <span style={{
                          position: 'absolute', top: 3,
                          left: form.status ? 21 : 3,
                          width: 18, height: 18, borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          transition: 'left 0.25s',
                        }} />
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmt(form.createdAt)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => navigate(`/admin/custom-forms/${form._id}/leads`)}
                          title="View Leads"
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/custom-forms/${form._id}/edit`)}
                          title="Edit Form"
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}
                        >
                          <MdEdit size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(form)}
                          title="Delete Form"
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                        >
                          <MdDelete size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} entries
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#d1d5db' : '#374151' }}
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - page) <= 2)
                .map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid', borderColor: p === page ? '#6366f1' : '#e5e7eb', background: p === page ? '#6366f1' : '#fff', color: p === page ? '#fff' : '#374151', fontSize: 13, cursor: 'pointer', fontWeight: p === page ? 700 : 400 }}>
                    {p}
                  </button>
                ))
              }
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', color: page === pagination.totalPages ? '#d1d5db' : '#374151' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Delete Form?</h3>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', margin: '0 0 22px' }}>
              "<strong>{deleteTarget.title}</strong>" will be moved to trash. You can restore it later.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
};

export default AllForms;
