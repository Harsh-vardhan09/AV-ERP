import React, { useState } from 'react';
import { useGetAdminKnowledgeMaterialsQuery } from '../../redux/api/adminApi';
import {
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSubjectsQuery,
  useGetActiveSessionQuery,
} from '../../redux/api/adminApi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const typeColor = {
  pdf: 'bg-red-50 text-red-600 border-red-200',
  doc: 'bg-blue-50 text-blue-600 border-blue-200',
  docx: 'bg-blue-50 text-blue-600 border-blue-200',
  image: 'bg-green-50 text-green-600 border-green-200',
};
const typeLabel = { pdf: 'PDF', doc: 'DOC', docx: 'DOC', image: 'IMG' };

const AdminKnowledgeCenter = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: classesData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const classes = classesData?.data || [];

  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: sectionsData } = useGetSectionsQuery(filterClass, { skip: !filterClass });
  const sections = sectionsData?.data || [];

  const { data: subjectsData } = useGetSubjectsQuery(sessionId, { skip: !sessionId });
  const subjects = subjectsData?.data || [];

  const filterParams = {};
  if (filterClass) filterParams.classId = filterClass;
  if (filterSection) filterParams.sectionId = filterSection;
  if (filterSubject) filterParams.subjectId = filterSubject;
  if (filterTeacher) filterParams.teacherId = filterTeacher;
  if (filterFrom) filterParams.from = filterFrom;
  if (filterTo) filterParams.to = filterTo;

  const { data: materialsData, isLoading } = useGetAdminKnowledgeMaterialsQuery(filterParams);
  const allMaterials = materialsData?.data || [];

  // Derive unique teachers from fetched materials for teacher filter
  const teachers = [...new Map(
    allMaterials
      .filter(m => m.teacherid)
      .map(m => [m.teacherid._id, { _id: m.teacherid._id, name: `${m.teacherid.firstName} ${m.teacherid.lastName}` }])
  ).values()];

  const filtered = allMaterials.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.title?.toLowerCase().includes(q) ||
      m.subjectDisplay?.toLowerCase().includes(q) ||
      m.teacherName?.toLowerCase().includes(q) ||
      `${m.teacherid?.firstName} ${m.teacherid?.lastName}`.toLowerCase().includes(q);
  });

  const clearFilters = () => {
    setFilterClass(''); setFilterSection(''); setFilterSubject('');
    setFilterTeacher(''); setFilterFrom(''); setFilterTo(''); setSearch('');
  };
  const hasFilter = filterClass || filterSection || filterSubject || filterTeacher || filterFrom || filterTo || search;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Knowledge Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">All uploaded study materials across classes</p>
        </div>
        <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded">
          {filtered.length} materials
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Materials', value: allMaterials.length, color: 'text-blue-600' },
          { label: 'Total Views', value: allMaterials.reduce((a, m) => a + (m.viewCount || 0), 0), color: 'text-green-600' },
          { label: 'Teachers', value: teachers.length, color: 'text-purple-600' },
          { label: 'PDF Files', value: allMaterials.filter(m => m.fileType === 'pdf').length, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Title, subject, teacher..."
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Class</label>
            <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterSection(''); }}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Section</label>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
              disabled={!filterClass}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="">All Sections</option>
              {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subject</label>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Teacher</label>
            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {hasFilter && (
          <button onClick={clearFilters} className="mt-3 text-xs text-blue-600 hover:underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* Materials Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Materials {hasFilter && `(${filtered.length} results)`}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No materials found{hasFilter ? ' matching your filters' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(m => (
                  <tr key={m._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${typeColor[m.fileType] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {typeLabel[m.fileType] || 'FILE'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                          {m.description && <p className="text-xs text-gray-400 line-clamp-1">{m.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-medium">
                        {m.subjectDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {m.classId?.name} {m.sectionId?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {m.teacherid ? `${m.teacherid.firstName} ${m.teacherid.lastName}` : m.teacherName || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmtDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${m.viewCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {m.viewCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminKnowledgeCenter;
