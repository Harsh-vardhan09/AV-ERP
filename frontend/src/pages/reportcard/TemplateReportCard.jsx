import React, { useState, useEffect, useMemo } from 'react';
import { useCheak_authQuery } from '../../redux/api/userApi';
import toast from 'react-hot-toast';
import {
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
} from '../../redux/api/adminApi';
import { useGetMyClassTeacherQuery } from '../../redux/api/teacherApi';
import { useGetClassReportCardsQuery } from '../../redux/api/reportCardApi';
import {
  useGenerateDynamicReportMutation,
  useGenerateBulkDynamicReportsMutation,
} from '../../redux/api/dynamicReportApi';
import { useGetReportTemplatesQuery, useGetTemplateForClassQuery } from '../../redux/api/reportTemplateApi';
import './reportCard.css';


const EXAM_TYPES = [
  { value: 'annual',      label: 'Annual' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'custom',      label: 'Custom' },
];

/* ── Preview modal – fetches HTML with auth cookie, renders via srcDoc ─── */
const PreviewModal = ({ studentId, templateId, academicYear, examType, studentName, onClose }) => {
  const [html,    setHtml]    = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState('');

  React.useEffect(() => {
    if (!studentId || !academicYear) {
      setError('Missing student ID or academic year.');
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (templateId)  params.append('templateId',  templateId);
    if (academicYear) params.append('academicYear', academicYear);
    if (examType)    params.append('examType',    examType);

    const url = `${import.meta.env.VITE_PORT}/api/v1/dynamic-reports/preview/${studentId}?${params.toString()}`;

    setLoading(true);
    setError('');
    setHtml('');

    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) return res.json().then(j => { throw new Error(j.message || `HTTP ${res.status}`); });
        return res.text();
      })
      .then(text => { setHtml(text); setLoading(false); })
      .catch(err => { setError(err.message || 'Preview failed.'); setLoading(false); });
  }, [studentId, academicYear, examType, templateId]);

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed',inset:0,zIndex:1000,
        background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)',
        display:'flex',alignItems:'center',justifyContent:'center',padding:20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'#fff',borderRadius:14,width:'100%',maxWidth:920,
          maxHeight:'92vh',display:'flex',flexDirection:'column',
          boxShadow:'0 24px 80px rgba(0,0,0,0.35)',overflow:'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'14px 20px',
          background:'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)',
        }}>
          <div>
            <div style={{color:'#fff',fontWeight:700,fontSize:15}}>📄 Report Card Preview</div>
            <div style={{color:'#94a3b8',fontSize:12,marginTop:2}}>
              {studentName} — {examType?.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.12)',border:'none',borderRadius:8,
            color:'#fff',padding:'6px 16px',cursor:'pointer',fontWeight:600,fontSize:13,
          }}>✕ Close</button>
        </div>

        {/* Content area */}
        <div style={{flex:1,overflow:'hidden',position:'relative',minHeight:540}}>
          {loading && (
            <div style={{
              position:'absolute',inset:0,display:'flex',alignItems:'center',
              justifyContent:'center',background:'#f8fafc',flexDirection:'column',gap:10,
            }}>
              <div style={{
                width:36,height:36,border:'4px solid #e5e7eb',
                borderTop:'4px solid #6366f1',borderRadius:'50%',
                animation:'spin 0.8s linear infinite',
              }}/>
              <div style={{color:'#64748b',fontWeight:600}}>Generating preview…</div>
              <div style={{color:'#94a3b8',fontSize:13}}>Fetching live data from database</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {error && !loading && (
            <div style={{
              position:'absolute',inset:0,display:'flex',alignItems:'center',
              justifyContent:'center',background:'#fef2f2',flexDirection:'column',gap:8,
            }}>
              <div style={{fontSize:40}}>⚠️</div>
              <div style={{fontWeight:700,color:'#b91c1c',fontSize:15}}>Preview Failed</div>
              <div style={{color:'#7f1d1d',fontSize:13,maxWidth:360,textAlign:'center'}}>{error}</div>
              <div style={{color:'#94a3b8',fontSize:12,marginTop:4}}>
                Ensure a template is assigned to this school and marks are entered.
              </div>
            </div>
          )}
          {html && !loading && (
            <iframe
              key={html.length}
              srcDoc={html}
              title="Report Card Preview"
              style={{width:'100%',height:'100%',border:'none',minHeight:540}}
              sandbox="allow-same-origin allow-scripts"
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main page ─────────────────────────────────────────────────────────── */
const TemplateReportCard = () => {
  // Use the same auth query that ProtectedRoute uses (App.jsx line 231: data?.user?.role)
  // This avoids the redux-persist rehydration race where useSelector returns undefined
  // until the persisted state is loaded — which prevented the dropdowns from ever showing.
  const { data: authData } = useCheak_authQuery();
  const role        = authData?.user?.role;
  const isAdmin     = role === 'admin';
  const isTeacher   = role === 'teacher';
  // Any authenticated staff member (not a student) may use the filters
  const isStaff     = Boolean(role) && role !== 'student';

  const [selectedSession,  setSelectedSession]  = useState('');
  const [selectedClass,    setSelectedClass]    = useState('');
  const [selectedSection,  setSelectedSection]  = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [examType,         setExamType]         = useState('annual');
  const [academicYear,     setAcademicYear]     = useState('');
  const [searchTerm,       setSearchTerm]       = useState('');
  // FIX 2: Debounced search term — only sent to API after 400ms of inactivity
  // This prevents RTK Query from creating a new cache entry on every keystroke
  // and ensures the student list actually updates when the user stops typing.
  const [debouncedSearch,  setDebouncedSearch]  = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [previewStudent,   setPreviewStudent]   = useState(null);
  const [generatingFor,    setGeneratingFor]    = useState(null);
  const [autoMatchedTemplate, setAutoMatchedTemplate] = useState(null); // { name, matchReason }

  /* ── Queries ── */
  // Sessions: fetch for any non-teacher staff (admin, exam_controller, accounts, etc.)
  const { data: activeSessionData } = useGetActiveSessionQuery(undefined, { skip: !isStaff || isTeacher });
  const { data: sessionsData }      = useGetSessionsQuery(undefined, { skip: !isStaff || isTeacher });
  const { data: classTeacherData }  = useGetMyClassTeacherQuery(undefined, { skip: !isTeacher });
  const { data: templatesData, isLoading: templatesLoading }     = useGetReportTemplatesQuery({ isActive: true, templateType: examType });
  // Classes: fetch when a session is selected (non-teacher staff); teachers get their own list
  const { data: classData,     isLoading: classesLoading }       = useGetClassesQuery(selectedSession, {
    skip: isTeacher || !selectedSession,
  });
  const { data: sectionData,   isLoading: sectionsLoading }      = useGetSectionsQuery(
    { classId: selectedClass, session: selectedSession },
    { skip: !selectedClass || !selectedSession || isTeacher }
  );
  // Auto-resolve best-matched template for selected class
  const { data: classTemplateData } = useGetTemplateForClassQuery(
    { classId: selectedClass, examType },
    { skip: !selectedClass }
  );
  const {
    data:    reportCardsData,
    refetch: refetchList,
    isLoading: studentsLoading,
    isError:   studentsError,
  } = useGetClassReportCardsQuery(
    // use debouncedSearch so the API only fires after typing stops (400 ms)
    { classId: selectedClass, sectionId: selectedSection, session: selectedSession, search: debouncedSearch },
    { skip: !selectedClass || !selectedSession }
  );

  /* ── Mutations ── */
  const [generateReport] = useGenerateDynamicReportMutation();
  const [generateBulk]   = useGenerateBulkDynamicReportsMutation();

  /* ── Derived (mirrors DynamicReportManager exactly) ── */
  const allSessions         = sessionsData?.data || [];
  const classTeacherAssigns = classTeacherData?.data || [];
  const templates           = templatesData?.data || [];
  const students            = reportCardsData?.data || [];

  const classes = useMemo(() => {
    if (!Array.isArray(isTeacher ? classTeacherAssigns : classData?.data)) return [];
    if (isTeacher) {
      return classTeacherAssigns
        .filter(item => !selectedSession || item.session?._id === selectedSession)
        .reduce((acc, item) => {
          const id = item.classId?._id;
          if (!id || acc.some(e => e._id === id)) return acc;
          acc.push({ _id: id, className: item.classId?.name, numericOrder: item.classId?.numericOrder });
          return acc;
        }, [])
        .sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));
    }
    // Admin, exam_controller, and all other staff use the full class list
    return [...(classData?.data || [])].sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));
  }, [isTeacher, classTeacherAssigns, selectedSession, classData]);

  const sections = useMemo(() => {
    if (isTeacher) {
      return (classTeacherAssigns || [])
        .filter(item => item.classId?._id === selectedClass)
        .map(item => item.sectionId)
        .filter(Boolean);
    }
    return sectionData?.data || [];
  }, [isTeacher, classTeacherAssigns, selectedClass, sectionData]);

  /* ── Effects ── */

  // Auto-select active session (admin & exam_controller)
  useEffect(() => {
    const activeId = activeSessionData?.data?._id;
    if (isStaff && !isTeacher && activeId && !selectedSession) {
      setSelectedSession(activeId);
      const s = (sessionsData?.data || []).find(s => s._id === activeId);
      if (s) setAcademicYear(s.name || s.year || '');
    }
  }, [isStaff, isTeacher, activeSessionData, sessionsData, selectedSession]);

  // Sync academicYear when session changes — use session.name (matches backend AcademicSession lookup)
  useEffect(() => {
    if (!selectedSession) return;
    const s = allSessions.find(s => s._id === selectedSession);
    if (s) setAcademicYear(s.name || s.year || '');
  }, [selectedSession, allSessions]);

  // Auto-select teacher's class
  useEffect(() => {
    if (isTeacher && classTeacherAssigns.length > 0) {
      const ct = classTeacherAssigns[0];
      setSelectedSession(ct.session?._id || '');
      setSelectedClass(ct.classId?._id || '');
      setSelectedSection(ct.sectionId?._id || '');
      setAcademicYear(ct.session?.name || ct.session?.year || '');
    }
  }, [isTeacher, classTeacherAssigns]);

  // Auto-select default template
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const def = templates.find(t => t.isDefault) || templates[0];
      setSelectedTemplate(def?._id || '');
    }
  }, [templates]);

  // Auto-select class-matched template when class or examType changes
  useEffect(() => {
    if (!selectedClass) return;
    if (classTemplateData?.success && classTemplateData?.data) {
      const t = classTemplateData.data;
      setSelectedTemplate(t._id || '');
      setAutoMatchedTemplate({
        name:        t.name,
        matchReason: t.matchReason,
        groupName:   t.classGroupName || '',
      });
    }
  }, [classTemplateData, selectedClass]);

  // Reset section when class changes
  useEffect(() => { setSelectedSection(''); setSelectedStudents([]); }, [selectedClass]);

  // FIX 2: Debounce search — sync debouncedSearch 400ms after the user stops typing.
  // Keeps the API call stable and ensures the student list actually filters.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  /* ── Handlers ── */
  /* Helper: download a protected PDF via fetch (carries auth cookie) */
  const downloadPdf = async (downloadUrl, fileName) => {
    try {
      const fullUrl = `${import.meta.env.VITE_PORT}${downloadUrl}`;
      const res = await fetch(fullUrl, { credentials: 'include' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
    }
  };

  const handleGenerate = async (studentId, studentName) => {
    if (!academicYear) return toast.error('Session not resolved yet — wait a moment and retry.');
    setGeneratingFor(studentId);
    try {
      const result = await generateReport({
        studentId,
        templateId: selectedTemplate || undefined,
        academicYear,
        examType,
      }).unwrap();

      const downloadUrl = result?.data?.downloadUrl || result?.downloadUrl;
      if (downloadUrl) {
        await downloadPdf(downloadUrl, `ReportCard_${studentName}.pdf`);
      }
      toast.success(`✅ Report generated for ${studentName}`);
      refetchList();
    } catch (err) {
      toast.error(err?.data?.message || `Failed to generate report for ${studentName}`);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleBulkGenerate = async () => {
    const ids = selectedStudents.length > 0
      ? selectedStudents
      : students.map(s => s.studentId);  // studentId is plain string per ReportCardManager
    if (!ids.length)   return toast.error('No students found.');
    if (!academicYear) return toast.error('Session not resolved yet.');
    setGeneratingFor('bulk');
    try {
      await generateBulk({ studentIds: ids, templateId: selectedTemplate || undefined, academicYear, examType }).unwrap();
      toast.success(`⏳ Bulk generation started for ${ids.length} students`);
      refetchList();
    } catch (err) {
      toast.error(err?.data?.message || 'Bulk generation failed.');
    } finally {
      setGeneratingFor(null); setSelectedStudents([]);
    }
  };

  const toggleStudent = id => setSelectedStudents(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => {
    const ids = students.map(s => s.studentId);
    setSelectedStudents(selectedStudents.length === ids.length ? [] : ids);
  };

  /* ── Render ── */
  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Template Report Cards</h1>
          <p className="text-xs text-slate-500 mt-0.5">Preview and generate academic report cards using assigned templates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">

          {/* Session */}
          {isStaff && !isTeacher && (
            <div>
              <label htmlFor="trc-session" className="block text-xs font-semibold text-slate-700 mb-1">Session</label>
              <select id="trc-session" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400" value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}>
                <option value="">Select Session</option>
                {allSessions.map(s => (
                  <option key={s._id} value={s._id}>{s.year || s.name}{s.isActive ? ' (Active)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Class */}
          {isStaff && (
            <div>
              <label htmlFor="trc-class" className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
              <select id="trc-class" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400" value={selectedClass}
                aria-busy={classesLoading}
                onChange={e => setSelectedClass(e.target.value)}
                disabled={(!isTeacher && !selectedSession) || classesLoading}>
                <option value="">{classesLoading ? 'Loading…' : 'Select Class'}</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.className || c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Section */}
          {isStaff && (
            <div>
              <label htmlFor="trc-section" className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
              <select id="trc-section" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400" value={selectedSection}
                aria-busy={sectionsLoading}
                onChange={e => setSelectedSection(e.target.value)}
                disabled={!selectedClass || sectionsLoading}>
                <option value="">{sectionsLoading ? 'Loading…' : 'All Sections'}</option>
                {sections.map(s => (
                  <option key={s._id} value={s._id}>{s.name || s.sectionName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="trc-exam-type" className="block text-xs font-semibold text-slate-700 mb-1">Exam Type</label>
            <select id="trc-exam-type" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400" value={examType} onChange={e => setExamType(e.target.value)}>
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="trc-template" className="block text-xs font-semibold text-slate-700 mb-1">Template</label>
            <select id="trc-template" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400" value={selectedTemplate}
              aria-busy={templatesLoading}
              onChange={e => { setSelectedTemplate(e.target.value); setAutoMatchedTemplate(null); }}>
              <option value="">{templatesLoading ? 'Loading…' : 'Auto (class-matched)'}</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name}{t.classGroupName ? ` [${t.classGroupName}]` : ''}{t.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="pt-1">
          <div className="relative">
            <input id="trc-search" className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400" type="text" placeholder="Search student name or roll no…"
              aria-label="Search students by name or roll number"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Student List & Actions Container */}
      {selectedClass && selectedSession ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          
          {/* Header Action Bar */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-900">
              {students.length} Student{students.length !== 1 ? 's' : ''}
              {selectedStudents.length > 0 && (
                <span className="text-indigo-600 ml-2 font-semibold">
                  ({selectedStudents.length} selected)
                </span>
              )}
            </div>
            <button
              disabled={generatingFor === 'bulk' || students.length === 0}
              onClick={handleBulkGenerate}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <span>
                {generatingFor === 'bulk' ? 'Generating...'
                  : selectedStudents.length > 0 ? `Download ${selectedStudents.length} Reports`
                  : 'Generate All Reports'}
              </span>
            </button>
          </div>

          {studentsLoading ? (
            <div className="flex justify-center py-14">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No students found for selected criteria.
            </div>
          ) : (
            <>
              {/* Mobile Card View (Phones) */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {students.map(row => {
                  const sid   = row.studentId;
                  const sname = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Student';
                  const roll  = row.rollNo || '—';
                  const sec   = row.sectionName || '—';
                  const isThis = generatingFor === sid;

                  return (
                    <div key={sid} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedStudents.includes(sid)}
                            onChange={() => toggleStudent(sid)} className="accent-indigo-600" />
                          <span className="font-bold text-xs text-slate-900">{sname}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">Roll: {roll}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>Section: <strong className="text-slate-800">{sec}</strong></span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewStudent({ _id: sid, name: sname })}
                            disabled={!academicYear}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleGenerate(sid, sname)}
                            disabled={isThis || !academicYear}
                            className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                          >
                            {isThis ? '...' : 'PDF'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Data Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                      <th className="py-2.5 px-4 w-10">
                        <input type="checkbox"
                          checked={selectedStudents.length === students.length && students.length > 0}
                          onChange={toggleAll} className="accent-indigo-600" />
                      </th>
                      <th className="py-2.5 px-4">Roll No</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Section</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {students.map(row => {
                      const sid   = row.studentId;
                      const sname = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Student';
                      const roll  = row.rollNo || '—';
                      const sec   = row.sectionName || '—';
                      const isThis = generatingFor === sid;

                      return (
                        <tr key={sid} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4">
                            <input type="checkbox" checked={selectedStudents.includes(sid)}
                              onChange={() => toggleStudent(sid)} className="accent-indigo-600" />
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{roll}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{sname}</td>
                          <td className="py-3 px-4">{sec}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setPreviewStudent({ _id: sid, name: sname })}
                                disabled={!academicYear}
                                className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => handleGenerate(sid, sname)}
                                disabled={isThis || !academicYear}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {isThis ? 'Generating…' : 'Download PDF'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-xs">
          <p className="font-bold text-slate-900 text-sm">Select Session & Class</p>
          <p className="text-xs text-slate-400 mt-1">Choose an academic session and class above to view student report cards</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewStudent && (
        <PreviewModal
          studentId={previewStudent._id}
          studentName={previewStudent.name}
          templateId={selectedTemplate || undefined}
          academicYear={academicYear}
          examType={examType}
          onClose={() => setPreviewStudent(null)}
        />
      )}
    </div>
  );
};

export default TemplateReportCard;
