import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllStudentsQuery, useActivateStudentMutation, useDeactivateStudentMutation, useLazyExportStudentsExcelQuery } from '../../../redux/api/admissionApi';
import { useGetClassesQuery, useGetSectionsQuery, useGetActiveSessionQuery } from '../../../redux/api/adminApi';
import EditStudent from './EditStudent';
import toast from 'react-hot-toast';

const StudentList = () => {
  const navigate = useNavigate();
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const { data: classData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const classes = classData?.data || [];

  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [inputSearch, setInputSearch] = useState('');
  const [search, setSearch] = useState('');

  const { data: sectionData } = useGetSectionsQuery(
    { classId: filterClass, session: sessionId },
    { skip: !filterClass || !sessionId }
  );
  const sections = sectionData?.data || [];

  const params = {};
  if (filterClass) params.classId = filterClass;
  if (filterSection) params.sectionId = filterSection;
  if (search) params.search = search;

  const { data, isLoading } = useGetAllStudentsQuery(params);
  const [activate] = useActivateStudentMutation();
  const [deactivate] = useDeactivateStudentMutation();
  const [triggerExport, { isFetching: isExporting }] = useLazyExportStudentsExcelQuery();
  const students = data?.data || [];

  const handleDownloadExcel = async () => {
    try {
      const exportParams = {};
      if (filterClass)   exportParams.classId   = filterClass;
      if (filterSection) exportParams.sectionId = filterSection;
      if (search)        exportParams.search    = search;
      const blob = await triggerExport(exportParams).unwrap();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `students_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel download started!');
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.error('Excel download failed. Please try again.');
    }
  };

  const [editId, setEditId] = useState(null);

  const handleToggle = async (s) => {
    try {
      if (s.status === 'active') { await deactivate(s._id).unwrap(); toast.success('Deactivated'); }
      else { await activate(s._id).unwrap(); toast.success('Activated'); }
    } catch (err) { toast.error('Failed to update status'); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputSearch);
  };

  const clearFilters = () => {
    setFilterClass('');
    setFilterSection('');
    setInputSearch('');
    setSearch('');
  };

  const hasFilters = filterClass || filterSection || search;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">All Students</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data?.count ?? 0} students found</p>
        </div>
        {/* ── Excel Download Button ────────────────────────────────────────── */}
        <button
          onClick={handleDownloadExcel}
          disabled={isExporting}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          {isExporting ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {/* Class */}
          <select
            value={filterClass}
            onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>

          {/* Section */}
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            disabled={!filterClass}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
            <option value="">All Sections</option>
            {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>

          {/* Spacer on small screens */}
          <div className="hidden sm:block" />
          <div className="hidden sm:block" />
        </div>

        {/* Search row */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
            placeholder="Search by name, roll no, scholar no, admission no…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 whitespace-nowrap">Search</button>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-xs text-gray-500 underline px-2">Clear</button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Class / Section</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Roll No</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Scholar No</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s._id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Photo Avatar */}
                          {(() => {
                            const photo = s.documents?.photo;
                            const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase();
                            return photo ? (
                              <img src={photo} alt={initials} className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {initials}
                              </div>
                            );
                          })()}
                          <div>
                            <div className="font-medium text-gray-900">{s.firstName} {s.lastName}</div>
                            <div className="text-xs text-gray-400">{s.admissionNumber || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {s.classId?.name || '—'} / {s.sectionId?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{s.rollNo || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{s.scholarNo || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/admission/students/${s._id}`)} className="text-xs font-medium text-blue-600 hover:underline">View</button>
                          <button onClick={() => setEditId(s._id)} className="text-xs font-medium text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-50">Edit</button>
                          <button onClick={() => handleToggle(s)} className={`text-xs font-medium ${s.status === 'active' ? 'text-red-600' : 'text-green-600'}`}>
                            {s.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-10 text-gray-400">
                      {hasFilters ? 'No students match the selected filters.' : 'No students registered yet.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y">
              {students.map(s => (
                <div key={s._id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Photo Avatar — mobile */}
                      {(() => {
                        const photo = s.documents?.photo;
                        const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase();
                        return photo ? (
                          <img src={photo} alt={initials} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                            {initials}
                          </div>
                        );
                      })()}
                      <div>
                        <div className="font-semibold text-gray-800">{s.firstName} {s.lastName}</div>
                        <div className="text-xs text-gray-400">Adm: {s.admissionNumber || '—'}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.classId?.name || '—'} / {s.sectionId?.name || '—'} · Roll: {s.rollNo || '—'} · Scholar: {s.scholarNo || '—'}
                  </div>
                  <div className="flex gap-4 pt-1">
                    <button onClick={() => navigate(`/admission/students/${s._id}`)} className="text-sm font-medium text-blue-600">View</button>
                    <button onClick={() => setEditId(s._id)} className="text-sm font-medium text-indigo-600">Edit</button>
                    <button onClick={() => handleToggle(s)} className={`text-sm font-medium ${s.status === 'active' ? 'text-red-600' : 'text-green-600'}`}>
                      {s.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && <div className="text-center py-8 text-gray-400">
                {hasFilters ? 'No students match the filters.' : 'No students yet.'}
              </div>}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editId && <EditStudent studentId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
};

export default StudentList;
