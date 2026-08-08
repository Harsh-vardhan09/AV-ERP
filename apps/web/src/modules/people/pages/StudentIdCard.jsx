import React, { useState, useRef } from 'react';
import { useGetAllStudentsEnhancedQuery } from '@modules/people/api/studentManagementApi';
import { useGetClassesQuery, useGetSectionsQuery } from '../../../redux/api/adminApi';
import { useGetSchoolSettingsQuery } from '@modules/admissions/api/admissionApi';

const th = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap bg-gray-50 border-r border-gray-200 last:border-r-0';
const td = 'px-3 py-3 text-sm align-middle border-r border-gray-100 last:border-r-0';

// ── Single ID Card (print-ready) ─────────────────────────────────────────────
function StudentCard({ student, schoolName, schoolAddress, schoolPhone, schoolLogo, session }) {
  const fullName   = student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim();
  const fatherName = student.parentDetails?.father?.name || '—';
  const motherName = student.parentDetails?.mother?.name || '—';
  const cls        = student.classId?.name   || '—';
  const sec        = student.sectionId?.name || '—';
  const dob        = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : '—';
  const blood      = student.bloodGroup || '—';
  const phone      = student.parentDetails?.father?.mobile || student.contactNumber || '—';
  const photo      = student.documents?.photo;

  return (
    <div style={{
      width: 320, minHeight: 200, border: '2px solid #1e3a5f', borderRadius: 12,
      fontFamily: 'Arial, sans-serif', overflow: 'hidden', background: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pageBreakInside: 'avoid',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff',
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {schoolLogo
          ? <img src={schoolLogo} alt="logo" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover' }} />
          : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#1e3a5f' }}>S</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName || 'School Name'}</div>
          <div style={{ fontSize: 9, opacity: 0.85, marginTop: 1 }}>STUDENT IDENTITY CARD</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 10 }}>
        {/* Photo */}
        <div style={{ flexShrink: 0 }}>
          {photo
            ? <img src={photo} alt={fullName} style={{ width: 72, height: 90, objectFit: 'cover', border: '2px solid #1e3a5f', borderRadius: 6 }} />
            : <div style={{ width: 72, height: 90, border: '2px solid #1e3a5f', borderRadius: 6, background: 'linear-gradient(135deg,#dbeafe,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#1e3a5f' }}>
                {`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase() || 'S'}
              </div>
          }
          <div style={{ marginTop: 4, textAlign: 'center', background: '#1e3a5f', color: '#fff', borderRadius: 4, padding: '2px 4px', fontSize: 9, fontWeight: 700 }}>{blood}</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, fontSize: 9.5, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#1e3a5f', marginBottom: 3 }}>{fullName}</div>
          {[
            ['Adm. No', student.admissionNumber || '—'],
            ['Roll No', student.rollNo || '—'],
            ['Class', `${cls}${sec !== '—' ? ` - ${sec}` : ''}`],
            ["Father's Name", fatherName],
            ['D.O.B', dob],
            ['Contact', phone],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 4 }}>
              <span style={{ color: '#4b5563', fontWeight: 600, minWidth: 62, flexShrink: 0 }}>{label}:</span>
              <span style={{ color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '5px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#475569' }}>
        <span>Session: {session || '—'}</span>
        <span>{schoolPhone || schoolAddress || ''}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentIdCard() {
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [classId, setClassId]         = useState('');
  const [sectionId, setSectionId]     = useState('');
  const [printStudent, setPrintStudent] = useState(null);   // null = list view
  const debounceRef = useRef(null);
  const printRef    = useRef(null);

  const { data, isLoading, isFetching } = useGetAllStudentsEnhancedQuery({ page, limit, search, classId, sectionId });
  const { data: classData }             = useGetClassesQuery();
  const { data: sectionData }           = useGetSectionsQuery({ classId }, { skip: !classId });
  const { data: settings }              = useGetSchoolSettingsQuery();

  const students   = data?.data?.students   || [];
  const pagination = data?.data?.pagination || {};
  const classes    = classData?.data        || [];
  const sections   = sectionData?.data      || [];
  const school     = settings?.data || {};
  const schoolName    = school.schoolName    || 'School Name';
  const schoolAddress = school.address       || '';
  const schoolPhone   = school.phone         || '';
  const schoolLogo    = school.logo          || '';
  const session       = school.currentSession|| '';

  const handleSearch = (v) => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 450);
  };

  const handlePrint = (student) => {
    setPrintStudent(student);
    setTimeout(() => window.print(), 300);
  };

  // ── Print Preview mode ───────────────────────────────────────────────────
  if (printStudent) {
    return (
      <>
        <style>{`@media print { .no-print { display:none!important; } body { margin:0; } }`}</style>
        <div className="no-print" style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setPrintStudent(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>← Back</button>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>🖨️ Print</button>
          <span style={{ color: '#64748b', fontSize: 13 }}>ID Card Preview — {printStudent.firstName} {printStudent.lastName}</span>
        </div>
        <div ref={printRef} style={{ padding: 32, display: 'flex', justifyContent: 'center', background: '#f8fafc', minHeight: '80vh' }}>
          <StudentCard student={printStudent} schoolName={schoolName} schoolAddress={schoolAddress} schoolPhone={schoolPhone} schoolLogo={schoolLogo} session={session} />
        </div>
      </>
    );
  }

  // ── List View ────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Student ID Cards</h1>
          <p className="text-xs text-gray-500 mt-0.5">Total: <strong>{pagination.total ?? 0}</strong> students</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Show</span>
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>entries</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(1); }} disabled={!classId} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
            <option value="">All Sections</option>
            {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <div className="relative">
            <input value={searchInput} onChange={(e) => handleSearch(e.target.value)} placeholder="Search student by name…" className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64" />
            <svg className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            {search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">✕</button>}
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
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className={th} style={{ width: 48 }}>#</th>
                  <th className={th}>Photo</th>
                  <th className={th} style={{ minWidth: 200 }}>Student Name</th>
                  <th className={th}>Adm. No</th>
                  <th className={th}>Roll No</th>
                  <th className={th}>Class</th>
                  <th className={th}>Section</th>
                  <th className={th} style={{ width: 100 }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s, idx) => {
                  const fullName = s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim();
                  const cls      = s.classId?.name   || '—';
                  const sec      = s.sectionId?.name || '—';
                  const serial   = (page - 1) * limit + idx + 1;
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${td} text-gray-400 text-xs`}>{serial}</td>
                      <td className={td}>
                        {s.documents?.photo
                          ? <img src={s.documents.photo} alt={fullName} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                          : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">{`${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase()}</div>
                        }
                      </td>
                      <td className={td}><span className="font-medium text-gray-800">{fullName}</span></td>
                      <td className={td}><span className="font-medium text-gray-700">{s.admissionNumber || '—'}</span></td>
                      <td className={`${td} font-medium text-gray-600`}>{s.rollNo || '—'}</td>
                      <td className={td}><span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">{cls}</span></td>
                      <td className={`${td} font-medium text-gray-600`}>{sec}</td>
                      <td className={td}>
                        <button onClick={() => handlePrint(s)} title="Print ID Card"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 flex-wrap gap-2">
            <span className="text-xs text-gray-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} entries</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
                const p = start + i;
                if (p > pagination.totalPages) return null;
                return <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 text-xs border rounded ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>{p}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              <button onClick={() => setPage(pagination.totalPages)} disabled={page === pagination.totalPages} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
