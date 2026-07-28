import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllClassesAdminQuery, useGetActiveSessionQuery, useGetSessionsQuery } from '../../redux/api/adminApi';

const AdminClassDirectory = () => {
  const navigate = useNavigate();
  const [inputSearch, setInputSearch] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const { data: sessionData } = useGetActiveSessionQuery();
  const activeSessionId = sessionData?.data?._id;

  const { data: sessionsData } = useGetSessionsQuery();
  const sessions = sessionsData?.data || [];

  const { data, isLoading } = useGetAllClassesAdminQuery();
  const allClasses = data?.data || [];

  // Filter by selected session (or active session if none selected)
  const targetSessionId = selectedSessionId || activeSessionId;
  const sessionClasses = targetSessionId
    ? allClasses.filter((c) => c.session?._id === targetSessionId)
    : allClasses;

  // Sort by numericOrder
  const sorted = [...sessionClasses].sort(
    (a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999)
  );

  // Filter by search
  const classes = search.trim()
    ? sorted.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.session?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputSearch);
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
        <span className="text-gray-900 font-medium">Classes</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Class Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${classes.length} classes found`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
        {/* Session Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Session:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Active Session</option>
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} {s.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
          {selectedSessionId && (
            <button
              onClick={() => setSelectedSessionId('')}
              className="text-xs text-gray-500 underline hover:text-blue-600"
            >
              Reset to Active
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
            placeholder="Search by class name…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-gray-800 text-white px-4 py-1.5 rounded-md text-sm hover:bg-gray-700 font-medium transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setInputSearch(''); }}
              className="text-xs text-gray-500 underline px-1"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex justify-center py-14">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-14 bg-white border border-gray-200 rounded-lg text-gray-400">
          <p className="text-sm">No classes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classes.map((cls) => (
            <div
              key={cls._id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {/* Order number badge */}
                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-bold shrink-0 border border-gray-200">
                  {cls.numericOrder ?? '—'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm capitalize truncate">
                    {cls.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {cls.session?.name || 'No session'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <p>
                  Order:{' '}
                  <span className="font-medium text-gray-800">
                    {cls.numericOrder ?? '—'}
                  </span>
                </p>
                {cls.session?.name && (
                  <p>
                    Session:{' '}
                    <span className="font-medium text-gray-800">
                      {cls.session.name}
                    </span>
                  </p>
                )}
                {cls.session?.isActive && (
                  <span className="inline-block bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full font-medium mt-1">
                    Active Session
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClassDirectory;
