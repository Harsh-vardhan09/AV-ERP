import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllSubjectsAdminQuery } from '../../../redux/api/adminApi';

const AdminSubjectDirectory = () => {
  const navigate = useNavigate();
  const [inputSearch, setInputSearch] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useGetAllSubjectsAdminQuery();
  const allSubjects = data?.data || [];

  // Unique types
  const types = [...new Set(allSubjects.map((s) => s.type).filter(Boolean))].sort();

  // Sort alphabetically then filter
  const filtered = [...allSubjects]
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .filter((s) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q);
      const matchType = !typeFilter || s.type === typeFilter;
      return matchSearch && matchType;
    });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputSearch);
  };

  // Get initial letters for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="hover:text-blue-600"
        >
          Dashboard
        </button>
        <span>›</span>
        <span className="text-gray-900 font-medium">Subjects</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Subject Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${filtered.length} subjects found`}
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              placeholder="Search by subject name or code…"
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-gray-800 text-white px-4 py-1.5 rounded-md text-sm hover:bg-gray-700 font-medium transition-colors"
            >
              Search
            </button>
            {(search || typeFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setInputSearch(''); setTypeFilter(''); }}
                className="text-xs text-gray-500 underline px-1"
              >
                Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex justify-center py-14">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-white border border-gray-200 rounded-lg text-gray-400">
          <p className="text-sm">No subjects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sub) => (
            <div
              key={sub._id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {/* Initials avatar — single neutral color */}
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold shrink-0 border border-slate-200">
                  {getInitials(sub.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {sub.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {sub.code || 'No code'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                {sub.code && (
                  <p>
                    Code:{' '}
                    <span className="font-medium text-gray-800">{sub.code}</span>
                  </p>
                )}
                {sub.type && (
                  <p>
                    Type:{' '}
                    <span className="font-medium text-gray-800 capitalize">
                      {sub.type}
                    </span>
                  </p>
                )}
              </div>

              {/* Type badge at bottom */}
              {sub.type && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize border ${
                      sub.type === 'core'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : sub.type === 'elective'
                        ? 'bg-gray-50 text-gray-600 border-gray-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {sub.type}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSubjectDirectory;
