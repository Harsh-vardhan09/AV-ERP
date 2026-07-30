import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetPassedStudentsQuery } from '../../../redux/api/studentManagementApi';
import { Search } from 'lucide-react';

const Spinner = () => (
  <div className="flex justify-center py-14">
    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function PassedStudents() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [passedOutYear, setPassedOutYear] = useState('');
  const debounceRef = useRef(null);

  const handleSearchChange = (v) => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 500);
  };

  const { data, isLoading } = useGetPassedStudentsQuery({ page, limit: 20, search, passedOutYear });

  const students = data?.data?.students || [];
  const pagination = data?.data?.pagination || {};
  const availableYears = data?.data?.availableYears || [];

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Passed Students / Alumni</h1>
          <p className="text-xs text-slate-500 mt-0.5">{pagination.total ?? 0} students who have completed their education</p>
        </div>
      </div>

      {/* Year batch pills */}
      {availableYears.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableYears.map(yr => (
            <button key={yr} onClick={() => setPassedOutYear(passedOutYear === yr ? '' : yr)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                passedOutYear === yr ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              Batch {yr}
            </button>
          ))}
          {passedOutYear && (
            <button onClick={() => setPassedOutYear('')} className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <select value={passedOutYear} onChange={e => { setPassedOutYear(e.target.value); setPage(1); }}
          className="w-full sm:w-auto border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400">
          <option value="">All Years</option>
          {availableYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
        </select>
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by student name or roll no…"
            className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400" />
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? <Spinner /> : students.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No passed out students found.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {students.map(s => (
                <div key={s._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{s.fullName || `${s.firstName} ${s.lastName}`}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
                      Batch {s.passedOutYear || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Class: <strong className="text-slate-800">{s.passedOutClass || '—'}</strong></span>
                    <span>Roll: <strong className="text-slate-800">{s.rollNo || '—'}</strong></span>
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
                    <th className="py-2.5 px-4">Passed Out Year</th>
                    <th className="py-2.5 px-4">Passed Out Class</th>
                    <th className="py-2.5 px-4">Parent Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {students.map(s => (
                    <tr key={s._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.fullName || `${s.firstName} ${s.lastName}`}</td>
                      <td className="py-3 px-4 text-slate-600">{s.rollNo || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
                          {s.passedOutYear || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.passedOutClass || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.parentPhone || s.parentDetails?.father?.phone || '—'}</td>
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
    </div>
  );
}
