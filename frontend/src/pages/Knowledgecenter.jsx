import React, { useState, useEffect } from 'react';
import { useGetStudentMaterialsQuery, useMarkMaterialViewedMutation } from '../redux/api/studentApi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fileTypeColor = {
  pdf: 'bg-red-50 text-red-600 border-red-200',
  doc: 'bg-blue-50 text-blue-600 border-blue-200',
  docx: 'bg-blue-50 text-blue-600 border-blue-200',
  image: 'bg-green-50 text-green-600 border-green-200',
};
const fileTypeLabel = { pdf: 'PDF', doc: 'DOC', docx: 'DOC', image: 'IMG' };

function StudentKnowledgeCenter() {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  const filterParams = {};
  if (filterFrom) filterParams.from = filterFrom;
  if (filterTo) filterParams.to = filterTo;

  const { data, isLoading, error, refetch } = useGetStudentMaterialsQuery(filterParams);
  const [markViewed] = useMarkMaterialViewedMutation();
  const allMaterials = data?.data || [];

  // Subject options from fetched data
  const subjects = [...new Map(
    allMaterials.map(m => [m.subjectDisplay, m.subjectDisplay])
  ).values()].filter(Boolean);

  const filtered = allMaterials.filter(m => {
    const matchSubject = !filterSubject || m.subjectDisplay === filterSubject;
    const matchSearch = !search ||
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.subjectDisplay?.toLowerCase().includes(search.toLowerCase()) ||
      m.teacherName?.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  // Mark as viewed when opening
  const handleOpen = async (m, newTab = true) => {
    if (!m.hasViewed) {
      try { await markViewed(m._id); } catch (_) { }
    }
    if (newTab) window.open(m.fileUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm mb-2">Failed to load materials</p>
        <button onClick={() => refetch()} className="text-blue-600 text-sm underline">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Knowledge Center</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Materials', value: allMaterials.length, color: 'text-blue-600' },
          { label: 'Viewed', value: allMaterials.filter(m => m.hasViewed).length, color: 'text-green-600' },
          { label: 'New', value: allMaterials.filter(m => !m.hasViewed).length, color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Title, subject, teacher..."
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subject</label>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 max-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {(filterSubject || filterFrom || filterTo || search) && (
            <button onClick={() => { setFilterSubject(''); setFilterFrom(''); setFilterTo(''); setSearch(''); }}
              className="text-xs text-blue-600 hover:underline mt-5">Clear all</button>
          )}
        </div>
      </div>

      {/* Materials grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-medium text-gray-600">No materials found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <div key={m._id} className={`bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${m.hasViewed ? 'border-gray-200' : 'border-blue-300 shadow-sm'}`}>
              {!m.hasViewed && (
                <div className="bg-blue-600 text-white text-xs text-center py-0.5 font-medium">New</div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${fileTypeColor[m.fileType] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {fileTypeLabel[m.fileType] || 'FILE'}
                  </span>
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-medium">{m.subjectDisplay}</span>
                </div>
                <h3 className="font-medium text-gray-900 text-sm mt-2 line-clamp-2">{m.title}</h3>
                {m.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.description}</p>}
                <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                  <p>By: {m.teacherName || m.teacherid?.firstName}</p>
                  <p>Uploaded: {fmtDate(m.createdAt)}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex gap-2">
                <button onClick={() => handleOpen(m, true)}
                  className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 font-medium transition">
                  {m.hasViewed ? 'Open' : 'View'}
                </button>
                <a href={m.fileUrl} download
                  onClick={() => m.hasViewed ? null : markViewed(m._id)}
                  className="flex-1 text-center bg-gray-100 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-200 font-medium transition">
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentKnowledgeCenter;