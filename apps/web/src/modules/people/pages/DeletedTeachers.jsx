import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetDeletedTeachersQuery,
  useRestoreTeacherMutation,
} from '@modules/people/api/teacherManagementApi';
import { RotateCcw, Search } from 'lucide-react';

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Spinner = () => (
  <div className="flex justify-center py-14">
    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Deleted Teachers</h1>
          <p className="text-xs text-slate-500 mt-0.5">{pagination.total ?? 0} soft-deleted teacher records — data preserved</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs font-medium text-amber-800">
        Deleted teacher profiles are kept archived. Restoring will set their status to inactive so you can assign or activate them as needed.
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by teacher name or employee ID…"
            className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? <Spinner /> : teachers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No deleted teachers found.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {teachers.map(t => (
                <div key={t._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{t.fullName || `${t.firstName} ${t.lastName}`}</span>
                    <span className="text-[11px] font-semibold text-slate-500">Emp ID: {t.employeeId || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Phone: <strong className="text-slate-800">{t.phone || '—'}</strong></span>
                    <button
                      onClick={() => setConfirmId(t._id)}
                      className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Emp ID</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Deleted Date</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {teachers.map(t => (
                    <tr key={t._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{t.fullName || `${t.firstName} ${t.lastName}`}</td>
                      <td className="py-3 px-4 text-slate-600">{t.employeeId || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{t.phone || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{fmt(t.deletedAt)}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">{t.deleteReason || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setConfirmId(t._id)}
                          className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="border border-slate-200 text-slate-700 px-3 py-1 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="border border-slate-200 text-slate-700 px-3 py-1 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Restore Teacher Profile?</h3>
            <p className="text-xs text-slate-500">The teacher profile will be restored in inactive status. You can activate it from All Teachers.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmId(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(confirmId)}
                disabled={isRestoring}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                {isRestoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
