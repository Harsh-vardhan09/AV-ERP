import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetPassedStudentsQuery } from '../../../redux/api/studentManagementApi';

const Spinner = () => (
  <div className="flex justify-center py-14">
    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span><span>Students</span><span>›</span>
        <span className="text-gray-900 font-medium">Passed Students</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Passed Students / Alumni</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination.total ?? 0} students who have completed their education</p>
        </div>
      </div>

      {/* Year batch pills */}
      {availableYears.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {availableYears.map(yr => (
            <button key={yr} onClick={() => setPassedOutYear(passedOutYear === yr ? '' : yr)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${passedOutYear === yr ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
              {yr}
            </button>
          ))}
          {passedOutYear && (
            <button onClick={() => setPassedOutYear('')} className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 underline">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <select value={passedOutYear} onChange={e => { setPassedOutYear(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Years</option>
            {availableYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, roll no…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="text-xs text-gray-500 underline px-1">Clear</button>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? <Spinner /> : students.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            <p className="text-sm">No passed out students yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Roll No', 'Passed Out Year', 'Passed Out Class', 'Parent Phone'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.fullName || `${s.firstName} ${s.lastName}`}</td>
                    <td className="px-4 py-3 text-gray-600">{s.rollNo || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{s.passedOutYear || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.passedOutClass || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.parentPhone || s.parentDetails?.father?.phone || '—'}</td>
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
    </div>
  );
}
