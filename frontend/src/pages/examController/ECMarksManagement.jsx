/**
 * Exam Controller — Marks Management Page
 * ──────────────────────────────────────────────────────────────────────────
 * This page provides the examination department with school-wide access to
 * upload and manage marks for any class, section, subject, and exam.
 *
 * It intentionally reuses the same logic as the teacher UploadMarks page
 * but calls the /api/v1/exam-controller/* endpoints which have the
 * MARKS_ALL_ACCESS bypass. The subject dropdown is populated from ALL
 * class-level subjects (not restricted to TeacherSubjectAssignment).
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  useGetECActiveSessionQuery,
  useGetECExamsQuery,
  useGetECClassesQuery,
  useGetECSectionsQuery,
  useGetECExamSubjectsQuery,
  useGetECStudentsForMarksQuery,
  useGetECExamTemplateQuery,
  useUploadECMarksMutation,
  useUploadECMarksExcelMutation,
} from '../../redux/api/examControllerApi';
import toast from 'react-hot-toast';

/* ─── Helpers (mirrored from teacher's UploadMarks for consistency) ──────── */
const toLabel = (key) => {
  if (!key || typeof key !== 'string') return '';
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
};
const isTotalField  = (key) => key && /total/i.test(key);
const getTermPrefix = (key) => {
  const match = key?.toLowerCase().match(/^(t[12])_/);
  return match ? match[1] : null;
};
const recalcTotals = (fields) => {
  const updated = { ...fields };
  Object.keys(fields).forEach((key) => {
    if (!isTotalField(key)) return;
    const term = getTermPrefix(key);
    if (!term) return;
    const sum = Object.entries(fields)
      .filter(([k, v]) => !isTotalField(k) && getTermPrefix(k) === term && v !== '' && v != null)
      .reduce((acc, [, v]) => { const n = Number(v); return acc + (isFinite(n) ? n : 0); }, 0);
    updated[key] = sum;
  });
  return updated;
};
const getNestedValue = (obj, path, def = null) => {
  try { return path.split('.').reduce((acc, p) => acc?.[p], obj) ?? def; } catch { return def; }
};

const TABS = { MANUAL: 'manual', EXCEL: 'excel' };

/* ─── Component ──────────────────────────────────────────────────────────── */
const ECMarksManagement = () => {
  const { data: sessionData, isLoading: sessionLoading } = useGetECActiveSessionQuery();
  const sessionId = getNestedValue(sessionData, 'data._id');

  /* ── Selections ── */
  const [selectedExam,    setSelectedExam]    = useState('');
  const [selectedClass,   setSelectedClass]   = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [tab, setTab] = useState(TABS.MANUAL);
  const [marks, setMarks] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const fileRef = useRef(null);

  /* ── Reference data ── */
  const { data: examsData,    isLoading: examsLoading   } = useGetECExamsQuery(
    { session: sessionId }, { skip: !sessionId }
  );
  const { data: classesData,  isLoading: classesLoading } = useGetECClassesQuery(
    { session: sessionId }, { skip: !sessionId }
  );
  const { data: sectionsData } = useGetECSectionsQuery(
    { session: sessionId, classId: selectedClass },
    { skip: !sessionId || !selectedClass }
  );

  // ── Exam-scoped subjects (same as teacher: from ExamSubjectConfig) ──────────
  // Only fetches after both exam AND class are selected, showing only subjects
  // configured for that exam+class. This is identical to teacher's data source.
  const { data: examSubjectsData, isLoading: subjectsLoading } = useGetECExamSubjectsQuery(
    { examId: selectedExam, classId: selectedClass },
    { skip: !selectedExam || !selectedClass }
  );

  const exams    = examsData?.data    || [];
  const classes  = classesData?.data  || [];
  const sections = sectionsData?.data || [];

  // ExamSubjectConfig returns records with populated subjectId — extract the subject details
  const subjects = useMemo(() => {
    const configs = examSubjectsData?.data || [];
    return configs
      .filter(cfg => cfg.subjectId)
      .map(cfg => ({
        _id:  cfg.subjectId._id  || cfg.subjectId,
        name: cfg.subjectId.name || cfg.subjectId,
        code: cfg.subjectId.code || '',
      }));
  }, [examSubjectsData]);

  /* ── Template ── */
  const { data: templateData, isLoading: templateLoading } = useGetECExamTemplateQuery(
    { examId: selectedExam, classId: selectedClass },
    { skip: !selectedExam }
  );
  const templateSchema   = templateData?.data?.schema;
  const templateId       = templateData?.data?.templateId;
  const fieldMaxMap      = templateData?.data?.fieldMaxMap  || {};
  const totalMaxMarks    = templateData?.data?.totalMaxMarks ?? 100;

  // ── Non-marks categories to ALWAYS exclude (never input columns) ─────────
  // NOTE: 'other' is NOT in this set — old schemas may store marks fields as 'other'.
  //       Those fall through to the underscore check below.
  const NON_MARKS = new Set(['meta', 'derived', 'attendance']);
  // META prefixes that should never become marks columns (mirrors _classifyField)
  const META_RE = /^(student|name|first|last|middle|father|mother|parent|dob|date|gender|blood|religion|caste|nationality|scholar|roll|admission|pen|address|city|state|pin|phone|email|school|class|section|session|academic|logo|dise|estd|promoted|result|remark)/i;

  const getFieldMax = useCallback((fieldKey) => {
    if (!fieldKey) return totalMaxMarks;
    const lower = fieldKey.toLowerCase();
    if (fieldMaxMap[lower] !== undefined) return Number(fieldMaxMap[lower]);
    const wt = lower.replace(/^t[12]_/, '');
    if (fieldMaxMap[wt] !== undefined) return Number(fieldMaxMap[wt]);
    return totalMaxMarks;
  }, [fieldMaxMap, totalMaxMarks]);

  const dynamicFields = useMemo(() => {
    if (!templateSchema?.fields?.length) return [];
    return templateSchema.fields
      .filter(f => {
        // Explicit marks category → always include
        if (f.category === 'marks') return true;
        // Explicit non-marks (meta/derived/attendance) → always exclude
        if (NON_MARKS.has(f.category)) return false;
        // Universal fallback: field with underscore + not a meta prefix
        // This catches stale schemas where marks fields were saved as category:'other'
        if (f.name && f.name.includes('_') && !META_RE.test(f.name)) return true;
        return false;
      })
      .map(f => ({ key: f.name, label: f.label || toLabel(f.name), max: getFieldMax(f.name) }));
  }, [templateSchema, getFieldMax]);

  const isDynamic = dynamicFields.length > 0;

  /* ── Students ── */
  const { data: studentData, isLoading: studentsLoading } = useGetECStudentsForMarksQuery(
    { classId: selectedClass, sectionId: selectedSection, session: sessionId },
    { skip: !selectedClass || !selectedSection || !sessionId }
  );
  const students = studentData?.data || [];

  /* ── Init marks table when students / template changes ── */
  useEffect(() => {
    if (!students.length) { setMarks([]); return; }
    setMarks(students.map(s => ({
      studentId:   getNestedValue(s, 'userId._id'),
      studentName: `${getNestedValue(s, 'userId.firstName', '')} ${getNestedValue(s, 'userId.lastName', '')}`.trim() || 'Unknown',
      rollNo:      s.rollNo || 'N/A',
      fields:      isDynamic ? Object.fromEntries(dynamicFields.map(f => [f.key, ''])) : {},
      marksObtained: '',
      remarks: '',
    })));
    setValidationErrors({});
  }, [students, isDynamic, dynamicFields]);

  /* ── Mutations ── */
  const [uploadMarks,      { isLoading: uploading      }] = useUploadECMarksMutation();
  const [uploadMarksExcel, { isLoading: uploadingExcel }] = useUploadECMarksExcelMutation();

  /* ── Field change handler ── */
  const handleFieldChange = useCallback((studentId, fieldKey, value) => {
    if (isDynamic && isTotalField(fieldKey)) return;
    setMarks(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      if (isDynamic) {
        const max = getFieldMax(fieldKey);
        const num = Number(value);
        const safeVal = value === '' ? '' : (isFinite(num) ? Math.min(max, Math.max(0, num)) : 0);
        return { ...s, fields: recalcTotals({ ...s.fields, [fieldKey]: safeVal }) };
      }
      return { ...s, marksObtained: value };
    }));
  }, [isDynamic, getFieldMax]);

  const handleRemarksChange = useCallback((studentId, value) =>
    setMarks(prev => prev.map(s => s.studentId === studentId ? { ...s, remarks: value } : s))
  , []);

  /* ── Submit (manual) ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExam || !selectedSubject || !selectedClass || !selectedSection) {
      return toast.error('Please select exam, class, section, and subject');
    }
    try {
      let payload;
      if (isDynamic) {
        const validMarks = marks
          .filter(m => Object.values(m.fields).some(v => v !== '' && v != null && v !== 0))
          .map(m => ({
            studentId: m.studentId,
            fields: Object.fromEntries(Object.entries(m.fields).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)])),
            remarks: m.remarks || '',
          }));
        if (!validMarks.length) return toast.error('Please enter marks for at least one student');
        payload = { examId: selectedExam, subjectId: selectedSubject, classId: selectedClass, sectionId: selectedSection, session: sessionId, marks: validMarks, templateId };
      } else {
        const validMarks = marks.filter(m => m.marksObtained !== '').map(m => ({ studentId: m.studentId, marksObtained: Number(m.marksObtained), remarks: m.remarks || '' }));
        if (!validMarks.length) return toast.error('Please enter marks for at least one student');
        payload = { examId: selectedExam, subjectId: selectedSubject, classId: selectedClass, sectionId: selectedSection, session: sessionId, marks: validMarks, marksType: 'theory' };
      }
      const res = await uploadMarks(payload).unwrap();
      toast.success(res.message || 'Marks uploaded successfully');
      setMarks(prev => prev.map(m => ({ ...m, fields: isDynamic ? Object.fromEntries(dynamicFields.map(f => [f.key, ''])) : {}, marksObtained: '', remarks: '' })));
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to upload marks');
    }
  };

  /* ── Submit (Excel) ── */
  const handleExcelUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('Please select an Excel file');
    if (!selectedExam || !selectedSubject || !selectedClass || !selectedSection) return toast.error('Please fill all selections');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('examId', selectedExam);
    fd.append('subjectId', selectedSubject);
    fd.append('classId', selectedClass);
    fd.append('sectionId', selectedSection);
    fd.append('session', sessionId);
    fd.append('marksType', 'theory');
    if (templateId) fd.append('templateId', templateId);
    try {
      const res = await uploadMarksExcel(fd).unwrap();
      toast.success(res.message || 'Excel uploaded successfully');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      toast.error(err?.data?.message || 'Excel upload failed');
    }
  };

  /* ── Reset cascades ── */
  const onExamChange    = v => { setSelectedExam(v); setSelectedClass(''); setSelectedSection(''); setSelectedSubject(''); setMarks([]); };
  const onClassChange   = v => { setSelectedClass(v); setSelectedSection(''); setSelectedSubject(''); setMarks([]); };
  const onSectionChange = v => { setSelectedSection(v); setSelectedSubject(''); setMarks([]); };

  if (sessionLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: 16, color: '#64748b' }}>Loading session...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          🎓 Marks Management
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          School-wide marks entry — Exam Controller access
        </p>
      </div>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {Object.values(TABS).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: tab === t ? 'var(--color-primary)' : 'var(--card-bg)',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              boxShadow: tab === t ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
              transition: 'all 0.18s',
            }}
          >
            {t === TABS.MANUAL ? '✏️ Manual Entry' : '📊 Excel Upload'}
          </button>
        ))}
      </div>

      {/* Filter Card */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)', padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
          Select Exam → Class → Section → Subject
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {/* Exam */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exam *</label>
            <select value={selectedExam} onChange={e => onExamChange(e.target.value)} disabled={examsLoading}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1.5px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="">{examsLoading ? 'Loading…' : 'Select Exam'}</option>
              {exams.map(e => <option key={e._id} value={e._id}>{e.name} ({e.type?.replace(/_/g, ' ')})</option>)}
            </select>
          </div>
          {/* Class */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class *</label>
            <select value={selectedClass} onChange={e => onClassChange(e.target.value)} disabled={!selectedExam || classesLoading}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1.5px solid var(--card-border)', background: selectedExam ? 'var(--card-bg)' : '#f8fafc', color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          {/* Section */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section *</label>
            <select value={selectedSection} onChange={e => onSectionChange(e.target.value)} disabled={!selectedClass}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1.5px solid var(--card-border)', background: selectedClass ? 'var(--card-bg)' : '#f8fafc', color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="">Select Section</option>
              {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject *</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              disabled={!selectedClass || !selectedExam || subjectsLoading}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1.5px solid var(--card-border)', background: (selectedClass && selectedExam) ? 'var(--card-bg)' : '#f8fafc', color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="">
                {!selectedExam ? 'Select exam first' :
                 !selectedClass ? 'Select class first' :
                 subjectsLoading ? 'Loading subjects…' :
                 subjects.length === 0 ? 'No subjects configured' : 'Select Subject'}
              </option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
            </select>
          </div>
        </div>

        {/* Template badge */}
        {selectedExam && templateLoading && <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>⏳ Loading template…</p>}
        {selectedExam && !templateLoading && templateData && (
          <div style={{ marginTop: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isDynamic ? '#f0fdf4' : '#fefce8', border: `1px solid ${isDynamic ? '#86efac' : '#fde68a'}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: isDynamic ? '#166534' : '#92400e' }}>
              {isDynamic ? `✅ Dynamic template · ${dynamicFields.length} fields` : '📋 Legacy marks mode'}
            </span>
          </div>
        )}
      </div>

      {/* ── MANUAL TAB ─────────────────────────────────────────────────────── */}
      {tab === TABS.MANUAL && selectedExam && selectedClass && selectedSection && selectedSubject && (
        <form onSubmit={handleSubmit}>
          <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {studentsLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading students…</div>
            ) : !students.length ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                No active students found for this class/section.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-primary)', color: '#fff' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Roll No</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Student Name</th>
                      {isDynamic
                        ? dynamicFields.map(f => (
                          <th key={f.key} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {f.label}<br /><span style={{ fontSize: 10, opacity: 0.8 }}>/ {f.max}</span>
                          </th>
                        ))
                        : <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Marks</th>
                      }
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map((m, idx) => (
                      <tr key={m.studentId} style={{ borderBottom: '1px solid var(--card-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.02)' }}>
                        <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontWeight: 500 }}>{m.rollNo}</td>
                        <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.studentName}</td>
                        {isDynamic
                          ? dynamicFields.map(f => (
                            <td key={f.key} style={{ padding: '8px 8px', textAlign: 'center' }}>
                              {isTotalField(f.key) ? (
                                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{m.fields[f.key] || 0}</span>
                              ) : (
                                <input type="number" min={0} max={f.max} value={m.fields[f.key] ?? ''}
                                  onChange={e => handleFieldChange(m.studentId, f.key, e.target.value)}
                                  style={{ width: 70, padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--card-border)', textAlign: 'center', fontSize: 13 }} />
                              )}
                            </td>
                          ))
                          : (
                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                              <input type="number" min={0} value={m.marksObtained}
                                onChange={e => handleFieldChange(m.studentId, 'marksObtained', e.target.value)}
                                style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--card-border)', textAlign: 'center', fontSize: 13 }} />
                            </td>
                          )
                        }
                        <td style={{ padding: '8px 14px' }}>
                          <input type="text" value={m.remarks} placeholder="Optional"
                            onChange={e => handleRemarksChange(m.studentId, e.target.value)}
                            style={{ width: 120, padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--card-border)', fontSize: 13 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {students.length > 0 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={uploading}
                  style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                  {uploading ? 'Uploading…' : '✅ Upload Marks'}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ── EXCEL TAB ──────────────────────────────────────────────────────── */}
      {tab === TABS.EXCEL && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)', padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>📊 Upload via Excel</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
            Upload an Excel (.xlsx / .xls / .csv) file with columns: <strong>Roll No, Marks Obtained</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
              style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--card-border)', fontSize: 13, flex: 1, minWidth: 200 }} />
            <button onClick={handleExcelUpload} disabled={uploadingExcel}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: uploadingExcel ? 'not-allowed' : 'pointer', opacity: uploadingExcel ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {uploadingExcel ? 'Uploading…' : '📤 Upload Excel'}
            </button>
          </div>
        </div>
      )}

      {/* Idle state */}
      {tab === TABS.MANUAL && (!selectedExam || !selectedClass || !selectedSection || !selectedSubject) && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎓</div>
          <p style={{ fontSize: 15, margin: 0 }}>Select exam, class, section, and subject to begin.</p>
        </div>
      )}
    </div>
  );
};

export default ECMarksManagement;
