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
    const ids = students.map(s => s.studentId);  // plain string per ReportCardManager
    setSelectedStudents(selectedStudents.length === ids.length ? [] : ids);
  };

  /* ── Render ── */
  return (
    <div style={{ padding:'28px 32px', maxWidth:1100, margin:'0 auto', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>
          📋 Template Report Cards
        </h1>
        <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:14 }}>
          Preview and download HTML-template-based report cards. All data is fetched live from the database.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background:'#fff', borderRadius:14, padding:24,
        boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:'1px solid #e5e7eb', marginBottom:24,
      }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:16 }}>

          {/* Session — shown for all non-teacher staff when sessions data exists */}
          {isStaff && !isTeacher && (
            <div>
              <label htmlFor="trc-session" style={lbl}>Academic Session</label>
              <select id="trc-session" style={sel} value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}>
                <option value="">-- Select Session --</option>
                {allSessions.map(s => (
                  <option key={s._id} value={s._id}>{s.year || s.name}{s.isActive ? ' (Active)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Class — shown for all staff */}
          {isStaff && (
            <div>
              <label htmlFor="trc-class" style={lbl}>Class</label>
              <select id="trc-class" style={sel} value={selectedClass}
                aria-busy={classesLoading}
                onChange={e => setSelectedClass(e.target.value)}
                disabled={(!isTeacher && !selectedSession) || classesLoading}>
                <option value="">{classesLoading ? 'Loading…' : '-- Select Class --'}</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.className || c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Section — shown for all staff */}
          {isStaff && (
            <div>
              <label htmlFor="trc-section" style={lbl}>Section</label>
              <select id="trc-section" style={sel} value={selectedSection}
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
            <label htmlFor="trc-exam-type" style={lbl}>Exam Type</label>
            <select id="trc-exam-type" style={sel} value={examType} onChange={e => setExamType(e.target.value)}>
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="trc-template" style={lbl}>Template</label>
            <select id="trc-template" style={sel} value={selectedTemplate}
              aria-busy={templatesLoading}
              onChange={e => { setSelectedTemplate(e.target.value); setAutoMatchedTemplate(null); }}>
              <option value="">{templatesLoading ? 'Loading…' : '-- Auto (class-matched) --'}</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name}{t.classGroupName ? ` [${t.classGroupName}]` : ''}{t.isDefault ? ' ★' : ''}
                </option>
              ))}
            </select>
            {/* Auto-match info badge — shown when class is selected and resolver found a template */}
            {autoMatchedTemplate && selectedClass && (
              <div style={{
                marginTop: 6, padding: '6px 10px',
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 7, fontSize: 12, color: '#1d4ed8',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 14 }}>
                  {autoMatchedTemplate.matchReason === 'exact_class' ? '🎯'
                   : autoMatchedTemplate.matchReason === 'class_range' ? '📚'
                   : '🌐'}
                </span>
                <span>
                  <strong>Auto Matched:</strong> {autoMatchedTemplate.name}
                  {autoMatchedTemplate.groupName ? ` (${autoMatchedTemplate.groupName})` : ''}
                  {' — '}
                  <span style={{ color: '#64748b' }}>
                    {autoMatchedTemplate.matchReason === 'exact_class' ? 'Exact class match'
                     : autoMatchedTemplate.matchReason === 'class_range' ? 'Class range match'
                     : 'Global default'}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="trc-search" style={lbl}>Search</label>
            <input id="trc-search" style={sel} type="text" placeholder="Name or roll no…"
              aria-label="Search students by name or roll number"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {templates.length === 0 && selectedSession && (
          <div style={{
            marginTop:14, padding:'10px 14px', background:'#fef9c3',
            border:'1px solid #fde047', borderRadius:8, color:'#854d0e', fontSize:13,
          }}>
            ⚠️ No active templates found. Ask a Super Admin to upload and assign a template to your school.
          </div>
        )}

        {students.length > 0 && (
          <div style={{ marginTop:10, fontSize:12, color:'#94a3b8' }}>
            Academic Year: <strong>{academicYear}</strong>
          </div>
        )}
      </div>

      {/* Student Table */}
      {selectedClass && selectedSession ? (
        <div style={{
          background:'#fff', borderRadius:14,
          boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:'1px solid #e5e7eb', overflow:'hidden',
        }}>
          {/* ── Query error banner ── */}
          {studentsError && (
            <div role="alert" style={{
              padding:'12px 20px', background:'#fef2f2', borderBottom:'1px solid #fecaca',
              color:'#b91c1c', fontSize:13, display:'flex', alignItems:'center', gap:8,
            }}>
              ⚠️ Failed to load students. Check your connection and try refreshing.
              <button onClick={refetchList}
                style={{ marginLeft:'auto', background:'#b91c1c', color:'#fff', border:'none',
                  borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                Retry
              </button>
            </div>
          )}
          {/* ── Students loading skeleton ── */}
          {studentsLoading && (
            <div aria-busy="true" aria-label="Loading students…" style={{
              padding:'48px 24px', textAlign:'center', color:'#94a3b8',
            }}>
              <div style={{
                width:32, height:32, border:'3px solid #e5e7eb',
                borderTop:'3px solid #6366f1', borderRadius:'50%',
                animation:'spin 0.7s linear infinite', margin:'0 auto 12px',
                display:'inline-block',
              }}/>
              <div style={{ fontWeight:600, color:'#64748b' }}>Loading students…</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {/* Table toolbar */}
          <div style={{
            padding:'14px 22px', borderBottom:'1px solid #f1f5f9',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'#f8fafc', flexWrap:'wrap', gap:10,
          }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>
              {students.length} Student{students.length !== 1 ? 's' : ''}
              {selectedStudents.length > 0 && (
                <span style={{ color:'#6366f1', marginLeft:8, fontWeight:500, fontSize:13 }}>
                  ({selectedStudents.length} selected)
                </span>
              )}
            </div>
            <button id="trc-bulk-btn"
              disabled={generatingFor === 'bulk' || students.length === 0}
              onClick={handleBulkGenerate}
              style={{
                background: generatingFor === 'bulk'
                  ? '#e0e7ff' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                color: generatingFor === 'bulk' ? '#6366f1' : '#fff',
                border:'none', borderRadius:8, padding:'8px 20px',
                fontWeight:600, fontSize:13, cursor:'pointer',
                boxShadow:'0 2px 8px rgba(99,102,241,0.25)',
              }}
            >
              {generatingFor === 'bulk' ? '⏳ Generating…'
                : selectedStudents.length > 0 ? `⬇ Download ${selectedStudents.length} PDFs`
                : '⬇ Generate All PDFs'}
            </button>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  <th style={th}>
                    <input type="checkbox"
                      checked={selectedStudents.length === students.length && students.length > 0}
                      onChange={toggleAll} style={{ cursor:'pointer' }} />
                  </th>
                  <th style={th}>Roll No</th>
                  <th style={th}>Student Name</th>
                  <th style={th}>Section</th>
                  <th style={th}>Last Generated</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
                    <div style={{ fontSize:36 }}>📂</div>
                    <div style={{ marginTop:8, fontWeight:600 }}>No students found</div>
                    <div style={{ fontSize:13, marginTop:4 }}>
                      {searchTerm ? 'Try a different search.' : 'Select a class and section above.'}
                    </div>
                  </td></tr>
                ) : students.map(row => {
                  // Flat fields per ReportCardManager: row.studentId (plain string), row.firstName, row.lastName
                  const sid   = row.studentId;
                  const sname = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Student';
                  const roll  = row.rollNo || '—';
                  const sec   = row.sectionName || '—';
                  const lastGen = row.updatedAt
                    ? new Date(row.updatedAt).toLocaleDateString('en-IN',
                        { day:'2-digit', month:'short', year:'numeric' })
                    : '—';
                  const isThis = generatingFor === sid;

                  return (
                    <tr key={sid} style={{
                      borderBottom:'1px solid #f1f5f9',
                      background: selectedStudents.includes(sid) ? '#f0f9ff' : '#fff',
                    }}>
                      <td style={td}>
                      <input type="checkbox" checked={selectedStudents.includes(sid)}
                          onChange={() => toggleStudent(sid)} style={{ cursor:'pointer' }} />
                      </td>
                      <td style={{ ...td, fontWeight:600, color:'#374151' }}>{roll}</td>
                      <td style={{ ...td, fontWeight:600, color:'#0f172a' }}>{sname}</td>
                      <td style={td}>{sec}</td>
                      <td style={{ ...td, color:'#64748b', fontSize:13 }}>{lastGen}</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:8 }}>
                          <button id={`trc-preview-${sid}`}
                            onClick={() => setPreviewStudent({ _id: sid, name: sname })}
                            disabled={!academicYear}
                            style={{
                              background:'#f0f9ff', color:'#0284c7',
                              border:'1px solid #bae6fd', borderRadius:7,
                              padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer',
                            }}>
                            👁 Preview
                          </button>
                          <button id={`trc-dl-${sid}`}
                            onClick={() => handleGenerate(sid, sname)}
                            disabled={isThis || !academicYear}
                            style={{
                              background: isThis ? '#f3f4f6' : 'linear-gradient(135deg,#10b981,#059669)',
                              color: isThis ? '#6b7280' : '#fff',
                              border:'none', borderRadius:7,
                              padding:'5px 12px', fontSize:12, fontWeight:600,
                              cursor: isThis ? 'not-allowed' : 'pointer',
                              boxShadow: isThis ? 'none' : '0 2px 6px rgba(16,185,129,0.25)',
                            }}>
                            {isThis ? '⏳' : '⬇ PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          background:'#fff', borderRadius:14, padding:'56px 24px',
          textAlign:'center', border:'1px solid #e5e7eb',
          boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize:52, marginBottom:16 }}>🎓</div>
          <div style={{ fontWeight:700, fontSize:18, color:'#0f172a', marginBottom:8 }}>
            Select a Session &amp; Class to get started
          </div>
          <div style={{ color:'#64748b', fontSize:14, maxWidth:440, margin:'0 auto' }}>
            All marks, subjects, student info, and school logo will be fetched live
            from the database and rendered into the template assigned by your Super Admin.
          </div>
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

/* ── Shared micro-styles ── */
const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:5, letterSpacing:'0.3px' };
const sel = { width:'100%', padding:'8px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, color:'#0f172a', background:'#fff', fontFamily:'inherit' };
const th  = { padding:'11px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.4px', borderBottom:'2px solid #e5e7eb' };
const td  = { padding:'12px 16px', fontSize:13.5, verticalAlign:'middle' };

export default TemplateReportCard;
