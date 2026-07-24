import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetDeletedTeachersQuery,
  useRestoreTeacherMutation,
} from '../../../redux/api/teacherManagementApi';

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const BADGE_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
];
const badgeColor = (i) => BADGE_COLORS[i % BADGE_COLORS.length];

const th = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap bg-gray-50 border-r border-gray-200 last:border-r-0';
const td = 'px-3 py-3 text-sm align-middle border-r border-gray-100 last:border-r-0';

const Spinner = () => (
  <div className="flex justify-center py-14">
    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function DeletedTeachers() {
  const navigate = useNavigate();
  const [page, setPage]               = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [confirmId, setConfirmId]     = useState(null);
  const debounceRef = useRef(null);

  const handleSearchChange = (v) => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 500);
  };

  const { data, isLoading } = useGetDeletedTeachersQuery({ page, limit: 20, search });
  const [restore, { isLoading: isRestoring }] = useRestoreTeacherMutation();

  const teachers   = data?.data?.teachers   || [];
  const pagination = data?.data?.pagination || {};

  const handleRestore = async (id) => {
    try {
      await restore(id).unwrap();
      toast.success('Teacher restored. Status set to inactive — activate from All Teachers.');
      setConfirmId(null);
    } catch (e) { toast.error(e?.data?.message || 'Error restoring teacher'); }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span><span>Teachers</span><span>›</span>
        <span className="text-gray-900 font-medium">Deleted Teachers</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deleted Teachers</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {pagination.total ?? 0} soft-deleted records — data preserved &amp; can be restored
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
        All the teachers you have deleted can be restored here. The status of the account will be
        <strong> inactive</strong> after restoring — activate manually from All Teachers.
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex gap-2">
          <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, employee ID…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {search && (
            <button onClick={() => { setSearch(''); setSearchInput(''); }}
              className="text-xs text-gray-500 underline px-1">Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? <Spinner /> : teachers.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No deleted teachers</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className={th} style={{ width: 40 }}>#</th>
                  <th className={th} style={{ minWidth: 220 }}>Teacher Details</th>
                  <th className={th} style={{ minWidth: 180 }}>Assigned Classes &amp; Sections</th>
                  <th className={th}>Joining Time</th>
                  <th className={th}>Deleted At</th>
                  <th className={th} style={{ width: 80 }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map((t, idx) => {
                  const name  = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                  const email = t.userId?.email || '—';
                  const phone = t.userId?.phone || t.phone || '—';
                  return (
                    <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${td} text-gray-400 text-xs`}>{(page - 1) * 20 + idx + 1}</td>

                      {/* Teacher Details */}
                      <td className={td}>
                        <div className="flex items-start gap-2 min-w-[200px]">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {(t.firstName?.[0] || '').toUpperCase()}{(t.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{email}</div>
                            {phone !== '—' && <div className="text-xs text-gray-500">📞 {phone}</div>}
                            {t.employeeId && <div className="text-xs text-gray-400 font-mono">{t.employeeId}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Assigned Classes */}
                      <td className={td}>
                        <div className="flex flex-wrap gap-1">
                          {(t.assignedClasses || []).length === 0
                            ? <span className="text-xs text-gray-400">—</span>
                            : (t.assignedClasses || []).slice(0, 5).map((a, i) => (
                              <span key={i} className={`px-1.5 py-0.5 rounded text-xs font-medium border ${badgeColor(i)}`}>
                                {a.label}
                              </span>
                            ))
                          }
                        </div>
                      </td>

                      {/* Joining Time */}
                      <td className={`${td} text-xs text-gray-500 whitespace-nowrap`}>{fmt(t.joiningDate)}</td>

                      {/* Deleted At */}
                      <td className={`${td} text-xs text-red-500 whitespace-nowrap`}>{fmt(t.deletedAt)}</td>

                      {/* Action */}
                      <td className={td}>
                        <button onClick={() => setConfirmId(t._id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700 transition-colors">
                          Restore
                        </button>
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

      {/* Restore Confirm Modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Restore Teacher?</h3>
            <p className="text-sm text-gray-600 mb-5">
              This will restore the teacher profile. Their login account will remain <strong>inactive</strong> — activate manually from All Teachers.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded-md text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleRestore(confirmId)} disabled={isRestoring}
                className="flex-1 bg-blue-600 text-white py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                {isRestoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
