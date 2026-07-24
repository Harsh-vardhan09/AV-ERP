import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGetDroppedStudentsQuery, useUnsuspendStudentMutation } from '../../../redux/api/studentManagementApi';

const Spinner = () => (
  <div className="flex justify-center py-14">
    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function DroppedStudents() {
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

  const { data, isLoading } = useGetDroppedStudentsQuery({ page, limit: 20, search });
  const [reenroll, { isLoading: isReenrolling }] = useUnsuspendStudentMutation();

  const students = data?.data?.students || [];
  const pagination = data?.data?.pagination || {};

  const handleReenroll = async (id) => {
    try { await reenroll(id).unwrap(); toast.success('Student re-enrolled and marked as active'); setConfirmId(null); }
    catch (e) { toast.error(e?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span><span>Students</span><span>›</span>
        <span className="text-gray-900 font-medium">Dropped Students</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dropped Students</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination.total ?? 0} students who left before completing education</p>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm text-orange-700">
        Students who left school mid-year. You can re-enroll them to make them active again.
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex gap-2">
          <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, roll no, admission no…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="text-xs text-gray-500 underline px-1">Clear</button>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? <Spinner /> : students.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No dropped students</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Roll No', 'Class', 'Drop Date', 'Drop Reason', 'Parent Phone', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.fullName || `${s.firstName} ${s.lastName}`}</td>
                    <td className="px-4 py-3 text-gray-600">{s.rollNo || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.className || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.droppedDate ? new Date(s.droppedDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={s.dropReason}>{s.dropReason || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.parentPhone || s.parentDetails?.father?.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirmId(s._id)}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-xs hover:bg-green-700">
                        Re-enroll
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Re-enroll Student?</h3>
            <p className="text-sm text-gray-600 mb-5">This will set the student's status back to <strong>active</strong>.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmId(null)} className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded-md text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleReenroll(confirmId)} disabled={isReenrolling}
                className="flex-1 bg-green-600 text-white py-1.5 rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
                {isReenrolling ? 'Re-enrolling…' : 'Re-enroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
