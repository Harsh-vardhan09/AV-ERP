import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGetSuspendedStudentsQuery, useUnsuspendStudentMutation } from '@modules/people/api/studentManagementApi';
import { RotateCcw, Search } from 'lucide-react';

const Spinner = () => (
  <div className="flex justify-center py-14">
    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const daysLeft = (until) => {
  if (!until) return null;
  return Math.ceil((new Date(until) - new Date()) / (1000 * 60 * 60 * 24));
};

const DaysBadge = ({ until }) => {
  const d = daysLeft(until);
  if (d === null) return <span className="text-slate-400">—</span>;
  if (d <= 0) return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold border border-slate-200">Expired</span>;
  if (d <= 3) return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200">{d}d left</span>;
  return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold border border-rose-200">{d}d left</span>;
};

export default function SuspendedStudents() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const debounceRef = useRef(null);

  const handleSearchChange = (v) => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 500);
  };

  const { data, isLoading } = useGetSuspendedStudentsQuery({ page, limit: 20, search });
  const [unsuspend, { isLoading: isLifting }] = useUnsuspendStudentMutation();

  const students = data?.data?.students || [];
  const pagination = data?.data?.pagination || {};

  const handleLift = async (id) => {
    try {
      await unsuspend(id).unwrap();
      toast.success('Suspension lifted. Student is now active.');
      setConfirmId(null);
    } catch (e) {
      toast.error(e?.data?.message || 'Error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Suspended Students</h1>
          <p className="text-xs text-slate-500 mt-0.5">{pagination.total ?? 0} temporarily suspended student accounts</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by student name, roll no, admission no…"
            className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? <Spinner /> : students.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No suspended students found.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {students.map(s => (
                <div key={s._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{s.fullName || `${s.firstName} ${s.lastName}`}</span>
                    <DaysBadge until={s.suspendedUntil} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Class: <strong className="text-slate-800">{s.className || '—'}</strong></span>
                    <button
                      onClick={() => setConfirmId(s._id)}
                      className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Lift
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
                    <th className="py-2.5 px-4">Roll No</th>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4">Suspended Until</th>
                    <th className="py-2.5 px-4">Days Left</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {students.map(s => (
                    <tr key={s._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.fullName || `${s.firstName} ${s.lastName}`}</td>
                      <td className="py-3 px-4 text-slate-600">{s.rollNo || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.className || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{s.suspendedUntil ? new Date(s.suspendedUntil).toLocaleDateString('en-IN') : 'Indefinite'}</td>
                      <td className="py-3 px-4"><DaysBadge until={s.suspendedUntil} /></td>
                      <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">{s.suspendedReason || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setConfirmId(s._id)}
                          className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" /> Lift Suspension
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

      {/* Lift Modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Lift Suspension?</h3>
            <p className="text-xs text-slate-500">This will immediately reactivate the student account.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmId(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLift(confirmId)}
                disabled={isLifting}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                {isLifting ? 'Lifting…' : 'Lift Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
