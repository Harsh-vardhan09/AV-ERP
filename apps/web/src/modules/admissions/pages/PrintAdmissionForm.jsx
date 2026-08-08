import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGetFormStudentsQuery } from '../api/admissionApi';
import { useGetClassesQuery, useGetSectionsQuery } from '../../../redux/api/adminApi';

// ─── helpers ──────────────────────────────────────────────────────────────────
const th = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap bg-gray-50 border-r border-gray-200 last:border-r-0';
const td = 'px-3 py-3 text-sm align-middle border-r border-gray-100 last:border-r-0';

export default function PrintAdmissionForm() {
  const navigate = useNavigate();
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [classId, setClassId]         = useState('');
  const [sectionId, setSectionId]     = useState('');
  const debounceRef = useRef(null);

  const handleSearch = (v) => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 450);
  };

  const { data, isLoading, isFetching } = useGetFormStudentsQuery({ page, limit, search, classId, sectionId });
  const { data: classData }             = useGetClassesQuery();
  const { data: sectionData }           = useGetSectionsQuery({ classId }, { skip: !classId });

  const students   = data?.data?.students   || [];
  const pagination = data?.data?.pagination || {};
  const classes    = classData?.data   || [];
  const sections   = sectionData?.data || [];

  const handlePrint = (student) => {
    navigate(`/admin/admission-forms/print/${student._id}`);
  };

  const handleAdmissionPrint = (student) => {
    // Open a new window/tab with just the print form for this student
    window.open(`/admin/admission-forms/print/${student._id}?action=print`, '_blank');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Print Admission Form</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total: <strong>{pagination.total ?? 0}</strong> students
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/admission-forms/settings')}
          className="flex items-center gap-1.5 border border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Form Settings
        </button>
      </div>

      {/* Controls Row — Show Entries + Search */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Show N entries */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>entries</span>
        </div>

        {/* Filters + Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={classId}
            onChange={(e) => { setClassId(e.target.value); setSectionId(''); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select
            value={sectionId}
            onChange={(e) => { setSectionId(e.target.value); setPage(1); }}
            disabled={!classId}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          >
            <option value="">All Sections</option>
            {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
            <input
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search student by name, father name, admission no…"
              className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
            <svg className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button onClick={() => { setSearch(''); setSearchInput(''); }} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {(isLoading || isFetching) ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className={th} style={{ width: 48 }}>#</th>
                  <th className={th}>Admission No.</th>
                  <th className={th}>Roll No.</th>
                  <th className={th} style={{ minWidth: 200 }}>Student Name</th>
                  <th className={th} style={{ minWidth: 180 }}>Father Name</th>
                  <th className={th}>Class</th>
                  <th className={th}>Section</th>
                  <th className={th} style={{ width: 110 }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s, idx) => {
                  const fullName   = s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim();
                  const fatherName = s.parentDetails?.father?.name || '—';
                  const cls        = s.classId?.name   || '—';
                  const sec        = s.sectionId?.name || '—';
                  const serial     = (page - 1) * limit + idx + 1;

                  return (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${td} text-gray-400 text-xs`}>{serial}</td>
                      <td className={td}>
                        <span className="font-medium text-gray-700">{s.admissionNumber || '—'}</span>
                      </td>
                      <td className={`${td} font-medium text-gray-600`}>{s.rollNo || '—'}</td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          {/* Avatar */}
                          {s.documents?.photo ? (
                            <img src={s.documents.photo} alt={fullName} className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {`${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{fullName}</span>
                        </div>
                      </td>
                      <td className={td}>{fatherName}</td>
                      <td className={td}>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">{cls}</span>
                      </td>
                      <td className={`${td} font-medium text-gray-600`}>{sec}</td>
                      <td className={td}>
                        <div className="flex items-center gap-1.5">
                          {/* Print Button */}
                          <button
                            onClick={() => handlePrint(s)}
                            title="View / Print Admission Form"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          {/* Upload / View Button */}
                          <button
                            onClick={() => toast('Document upload coming soon', { icon: 'ℹ️' })}
                            title="Upload Admission Document"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 flex-wrap gap-2">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >Previous</button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
                const p = start + i;
                if (p > pagination.totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1 text-xs border rounded ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
                  >{p}</button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >Next</button>
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={page === pagination.totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
