import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetAllTeachersEnhancedQuery,
  useSoftDeleteTeacherMutation,
  useToggleTeacherStatusMutation,
} from '@modules/people/api/teacherManagementApi';
import { useGetSessionsQuery } from '@shared/lib/api/adminApi';

// ─── helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const BADGE_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
];
const badgeColor = (i) => BADGE_COLORS[i % BADGE_COLORS.length];

const th = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap bg-gray-50 border-r border-gray-200 last:border-r-0';
const td = 'px-3 py-3 text-sm align-middle border-r border-gray-100 last:border-r-0';

// ─── Confirm Delete Modal ──────────────────────────────────────────────────────
const DeleteModal = ({ teacher, onClose, onConfirm, isLoading }) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Delete Teacher — {teacher.firstName} {teacher.lastName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            Soft delete — teacher can be restored from Deleted Teachers. Their login will be deactivated.
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Reason (optional)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="accent-red-500" />
            I confirm this action
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => onConfirm(reason)} disabled={!confirmed || isLoading}
              className="flex-1 bg-red-600 text-white py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
              {isLoading ? 'Deleting…' : 'Delete Teacher'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Action Menu ───────────────────────────────────────────────────────────────
const ActionMenu = ({ teacher, onDelete, navigate }) => {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const open = () => {
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const items = [
    { label: 'View Profile',    fn: () => navigate(`/admin/teachers/${teacher._id}`) },
    { label: 'Edit',            fn: () => navigate(`/admin/teachers/${teacher._id}/edit`) },
    { label: 'Delete Teacher',  fn: () => onDelete(teacher), red: true },
  ];

  return (
    <>
      <button ref={btnRef} onClick={open}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPos(null)} />
          <div className="fixed z-40 bg-white border border-gray-200 rounded-xl shadow-xl w-48 py-1 text-sm"
            style={{ top: pos.top, right: pos.right }}>
            {items.map(item => (
              <button key={item.label} onClick={() => { setPos(null); item.fn(); }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${item.red ? 'text-red-600' : 'text-gray-700'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};

// ─── Status Toggle ─────────────────────────────────────────────────────────────
const StatusToggle = ({ teacher, onToggle, isLoading }) => {
  const isActive = teacher.status === 'active';
  return (
    <button
      onClick={() => onToggle(teacher._id, !isActive)}
      disabled={isLoading}
      title={isActive ? 'Click to deactivate' : 'Click to activate'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50
        ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
        ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AllTeachers() {
  const navigate = useNavigate();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [togglingId, setTogglingId]   = useState(null);
  const debounceRef = useRef(null);

  const handleSearch = v => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 500);
  };

  const { data, isLoading } = useGetAllTeachersEnhancedQuery({ page, limit: 20, search, sessionId });
  const { data: sessionsData } = useGetSessionsQuery();
  const sessions = sessionsData?.data || [];
  const [softDelete, { isLoading: isDeleting }] = useSoftDeleteTeacherMutation();
  const [toggleStatus] = useToggleTeacherStatusMutation();

  const teachers   = data?.data?.teachers   || [];
  const pagination = data?.data?.pagination || {};

  const handleDelete = async (reason) => {
    try {
      await softDelete({ id: deleteModal._id, reason }).unwrap();
      toast.success('Teacher deleted successfully');
      setDeleteModal(null);
    } catch (e) { toast.error(e?.data?.message || 'Error'); }
  };

  const handleToggle = async (id, isActive) => {
    setTogglingId(id);
    try {
      await toggleStatus({ id, isActive }).unwrap();
      toast.success(`Teacher ${isActive ? 'activated' : 'deactivated'}`);
    } catch (e) { toast.error(e?.data?.message || 'Error'); } finally { setTogglingId(null); }
  };

  const th = 'px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap bg-slate-50 border-r border-slate-200/80 last:border-r-0';
  const td = 'px-3 py-3 text-sm align-middle border-r border-slate-100 last:border-r-0';

  return (
    <div className="max-w-7xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Teachers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Staff: <strong className="text-slate-800 tabular-nums">{pagination.total ?? 0}</strong>
          </p>
        </div>
        <div className="relative flex-1 min-w-[200px] sm:w-64">
          <input value={searchInput} onChange={e => handleSearch(e.target.value)}
            placeholder="Search teacher, ID, phone…"
            className="w-full border border-slate-200/80 bg-white rounded-xl pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-slate-400 shadow-xs" />
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button onClick={() => { setSearch(''); setSearchInput(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">×</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex items-center justify-between gap-3">
        <select value={sessionId} onChange={e=>{setSessionId(e.target.value);setPage(1);}}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400 min-w-[150px]">
          <option value="">All Sessions</option>
          {sessions.map(s=><option key={s._id} value={s._id}>{s.name} {s.isActive ? '(Active)' : ''}</option>)}
        </select>
        {sessionId && (
          <button onClick={()=>{setSessionId('');}} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Clear filter</button>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <p className="text-xs font-medium">No teachers found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (Phone Viewport) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {teachers.map((t) => {
                const name = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                return (
                  <div key={t._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {(t.firstName?.[0] || '').toUpperCase()}{(t.lastName?.[0] || '').toUpperCase()}
                        </div>
                        <div>
                          <button onClick={() => navigate(`/admin/teachers/${t._id}`)} className="font-bold text-xs text-slate-900 hover:text-indigo-600 text-left block">
                            {name}
                          </button>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {t.designation || 'Teacher'}
                          </span>
                        </div>
                      </div>
                      <StatusToggle teacher={t} onToggle={handleToggle} isLoading={togglingId === t._id} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>ID: <strong className="text-slate-800">{t.teacherId || t.employeeId || '—'}</strong></span>
                      <button
                        onClick={() => navigate(`/admin/teachers/${t._id}`)}
                        className="text-xs font-bold text-indigo-600"
                      >
                        View Profile →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className={th} style={{ width: 40 }}>#</th>
                    <th className={th}>ID Code</th>
                    <th className={th} style={{ minWidth: 200 }}>Teacher Details</th>
                    <th className={th} style={{ minWidth: 180 }}>Assigned Classes &amp; Sections</th>
                    <th className={th}>Joining Date</th>
                    <th className={th}>Status</th>
                    <th className={th} style={{ width: 48 }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {teachers.map((t, idx) => {
                    const name  = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                    const email = t.userId?.email || t.email || '—';
                    const phone = t.userId?.phone || t.phone || '—';
                    return (
                      <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className={`${td} text-slate-400 text-[11px]`}>{(page - 1) * 20 + idx + 1}</td>

                        <td className={td}>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200/80">
                            {t.teacherId || t.employeeId || '—'}
                          </span>
                        </td>

                        <td className={td}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {(t.firstName?.[0] || '').toUpperCase()}{(t.lastName?.[0] || '').toUpperCase()}
                            </div>
                            <div>
                              <button onClick={() => navigate(`/admin/teachers/${t._id}`)}
                                className="font-bold text-slate-900 hover:text-indigo-600 text-left leading-tight block">
                                {name}
                              </button>
                              <div className="text-[11px] text-slate-400">{email}</div>
                            </div>
                          </div>
                        </td>

                        <td className={td}>
                          <div className="flex flex-wrap gap-1">
                            {(t.assignedClasses || []).length === 0
                              ? <span className="text-[11px] text-slate-400">—</span>
                              : (t.assignedClasses || []).slice(0, 6).map((a, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                  {a.label}
                                </span>
                              ))
                            }
                          </div>
                        </td>

                        <td className={`${td} text-[11px] text-slate-500 whitespace-nowrap`}>{fmt(t.joiningDate)}</td>

                        <td className={td}>
                          <StatusToggle teacher={t} onToggle={handleToggle} isLoading={togglingId === t._id} />
                        </td>

                        <td className={td}>
                          <ActionMenu teacher={t} navigate={navigate} onDelete={t => setDeleteModal(t)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs cursor-pointer">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs cursor-pointer">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <DeleteModal
          teacher={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
