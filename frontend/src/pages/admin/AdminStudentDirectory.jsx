import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAdminStudentsQuery, useGetClassesQuery, useGetSectionsQuery, useGetActiveSessionQuery, useGetSessionsQuery } from '../../redux/api/adminApi';

const AdminStudentDirectory = () => {
  const navigate = useNavigate();
  const { data: sessionData } = useGetActiveSessionQuery();
  const activeSessionId = sessionData?.data?._id;
  const { data: sessionsData } = useGetSessionsQuery();
  const allSessions = sessionsData?.data || [];

  const [selectedSession, setSelectedSession] = useState(''); // empty = active session
  const sessionId = selectedSession || activeSessionId;

  const { data: classesData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const classes = [...(classesData?.data || [])].sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));

  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [search, setSearch] = useState('');
  const [inputSearch, setInputSearch] = useState('');

  const { data: sectionsData } = useGetSectionsQuery(
    { classId: filterClass, session: sessionId },
    { skip: !filterClass || !sessionId }
  );
  const sections = [...(sectionsData?.data || [])].sort((a, b) => a.name.localeCompare(b.name));

  const params = {};
  if (filterClass) params.classId = filterClass;
  if (filterSection) params.sectionId = filterSection;
  if (sessionId) params.session = sessionId;
  if (search) params.search = search;

  const { data, isLoading } = useGetAdminStudentsQuery(params);
  const students = data?.data || [];

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputSearch);
  };

  const statusColor = (status) => ({
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-yellow-100 text-yellow-700',
  }[status] || 'bg-gray-100 text-gray-600');

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span>
        <span className="text-gray-900 font-medium">Students</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Student Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">{data?.total ?? 0} students found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {/* Session */}
          <div className="sm:col-span-1">
            <select
              value={selectedSession}
              onChange={(e) => { setSelectedSession(e.target.value); setFilterClass(''); setFilterSection(''); }}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Active Session</option>
              {allSessions.map(s => (
                <option key={s._id} value={s._id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>
              ))}
            </select>
          </div>
          {/* Class */}
          <div>
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          {/* Section */}
          <div>
            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)}
              disabled={!filterClass}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="">All Sections</option>
              {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {/* Search row */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
            placeholder="Search by name, roll no, admission no…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700">Search</button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setInputSearch(''); }}
              className="text-xs text-gray-500 underline px-1">Clear</button>
          )}
        </form>
      </div>


      {/* Cards grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {students.map((s) => (
              <div
                key={s._id}
                onClick={() => navigate(`/admin/students/${s._id}`)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {s.firstName?.[0]?.toUpperCase()}{s.lastName?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-gray-400">{s.userId?.email || '—'}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  {s.admissionNumber && <p>Admission: <span className="font-medium">{s.admissionNumber}</span></p>}
                  <p>
                    {s.classId?.name ? (
                      <span>Class <span className="font-medium">{s.classId.name}</span>{s.sectionId?.name ? ` — Section ${s.sectionId.name}` : ''}</span>
                    ) : '—'}
                  </p>
                  {s.rollNo && <p>Roll No: <span className="font-medium">{s.rollNo}</span></p>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-blue-600 hover:underline text-right">
                  View Details →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStudentDirectory;
