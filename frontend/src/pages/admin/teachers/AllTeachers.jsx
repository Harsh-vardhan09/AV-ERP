import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetAllTeachersEnhancedQuery,
  useSoftDeleteTeacherMutation,
  useToggleTeacherStatusMutation,
} from '../../../redux/api/teacherManagementApi';
import { useGetSessionsQuery } from '../../../redux/api/adminApi';

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
        className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Teachers</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total: <strong>{pagination.total ?? 0}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-lg">
          <div className="relative flex-1">
            <input value={searchInput} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, employee ID, phone…"
              className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <svg className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="text-xs text-gray-500 underline">Clear</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <select value={sessionId} onChange={e=>{setSessionId(e.target.value);setPage(1);}}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]">
          <option value="">All Sessions</option>
          {sessions.map(s=><option key={s._id} value={s._id}>{s.name} {s.isActive ? '(Active)' : ''}</option>)}
        </select>
        {sessionId && (
          <button onClick={()=>{setSessionId('');}} className="text-xs text-gray-500 underline hover:text-blue-600">Clear filter</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No teachers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className={th} style={{ width: 40 }}>#</th>
                  <th className={th}>Biometric Code</th>
                  <th className={th} style={{ minWidth: 220 }}>Teacher Details</th>
                  <th className={th} style={{ minWidth: 180 }}>Assigned Classes &amp; Sections</th>
                  <th className={th}>Joining Time</th>
                  <th className={th}>Status</th>
                  <th className={th} style={{ width: 48 }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map((t, idx) => {
                  const name  = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                  const email = t.userId?.email || t.email || '—';
                  const phone = t.userId?.phone || t.phone || '—';
                  const username = t.userId?.username || t.teacherId || t.employeeId || '—';
                  return (
                    <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${td} text-gray-400 text-xs`}>{(page - 1) * 20 + idx + 1}</td>

                      {/* Biometric Code */}
                      <td className={td}>
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {t.teacherId || t.employeeId || '—'}
                        </span>
                      </td>

                      {/* Teacher Details */}
                      <td className={td}>
                        <div className="flex items-start gap-2 min-w-[200px]">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {(t.firstName?.[0] || '').toUpperCase()}{(t.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <button onClick={() => navigate(`/admin/teachers/${t._id}`)}
                              className="font-semibold text-blue-600 hover:underline text-left leading-tight text-sm">
                              {name}
                            </button>
                            <div className="text-xs text-gray-500 mt-0.5">{email}</div>
                            {phone !== '—' && <div className="text-xs text-gray-500">📞 {phone}</div>}
                            {t.designation && <div className="text-xs text-gray-400 italic">{t.designation}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Assigned Classes */}
                      <td className={td}>
                        <div className="flex flex-wrap gap-1">
                          {(t.assignedClasses || []).length === 0
                            ? <span className="text-xs text-gray-400">—</span>
                            : (t.assignedClasses || []).slice(0, 6).map((a, i) => (
                              <span key={i} className={`px-1.5 py-0.5 rounded text-xs font-medium border ${badgeColor(i)}`}>
                                {a.label}
                              </span>
                            ))
                          }
                          {(t.assignedClasses || []).length > 6 && (
                            <span className="text-xs text-gray-400">+{t.assignedClasses.length - 6}</span>
                          )}
                        </div>
                      </td>

                      {/* Joining Time */}
                      <td className={`${td} text-xs text-gray-500 whitespace-nowrap`}>{fmt(t.joiningDate)}</td>

                      {/* Status Toggle */}
                      <td className={td}>
                        <StatusToggle teacher={t} onToggle={handleToggle} isLoading={togglingId === t._id} />
                      </td>

                      {/* Action */}
                      <td className={td}>
                        <ActionMenu teacher={t} navigate={navigate} onDelete={t => setDeleteModal(t)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40">Next →</button>
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
