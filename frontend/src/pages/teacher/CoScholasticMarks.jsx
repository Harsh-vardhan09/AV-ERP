import React, { useState, useEffect } from 'react';
import {
  useGetMyClassTeacherQuery,
  useGetMyAssignmentsQuery,
  useGetCoScholasticSkillsQuery,
  useGetCoScholasticMarksQuery,
  useSaveCoScholasticMarksMutation,
} from '../../redux/api/teacherApi';
import { useGetSessionsQuery } from '../../redux/api/adminApi';
import './CoScholasticMarks.css';

// ── Default skill list (used when the skills API returns no results) ─────────
const DEFAULT_SKILLS = ['Discipline', 'Activity', 'Games', 'Drawing', 'Music'];

// ── Grade colour map ──────────────────────────────────────────────────────────
const GRADE_META = {
  'A+': { bg: '#d1fae5', color: '#065f46' },
  A:   { bg: '#dcfce7', color: '#15803d' },
  B:   { bg: '#dbeafe', color: '#1d4ed8' },
  C:   { bg: '#fef9c3', color: '#a16207' },
  D:   { bg: '#ffedd5', color: '#c2410c' },
  E:   { bg: '#fee2e2', color: '#b91c1c' },
  '':  { bg: '#f1f5f9', color: '#94a3b8' },
};
const GRADE_OPTIONS = ['', 'A+', 'A', 'B', 'C', 'D', 'E'];

// ── Grade select cell ─────────────────────────────────────────────────────────
function GradeCell({ value, onChange, disabled }) {
  const meta = GRADE_META[value] || GRADE_META[''];
  return (
    <select
      className="csk-grade-select"
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{ background: meta.bg, color: meta.color }}
    >
      {GRADE_OPTIONS.map(opt => (
        <option key={opt} value={opt}>{opt || '—'}</option>
      ))}
    </select>
  );
}

// ── Grade-mode toggle ─────────────────────────────────────────────────────────
const MODES = [
  { key: 'combined', label: 'Combined Grade' },
  { key: 'split',    label: 'T1 / T2 Split'  },
];

export default function CoScholasticMarks() {

  /* ── Data hooks ─────────────────────────────────────────────────────────── */
  const { data: ctData }       = useGetMyClassTeacherQuery();
  const { data: myData }       = useGetMyAssignmentsQuery();
  const { data: sessionsData } = useGetSessionsQuery();

  const ctAssignments      = ctData?.data  || [];
  const subjectAssignments = myData?.data  || [];
  const sessions           = sessionsData?.data || [];

  // De-duplicate classes from both sources
  const classMap = new Map();
  [...ctAssignments, ...subjectAssignments].forEach(a => {
    if (a.classId?._id) classMap.set(String(a.classId._id), a.classId);
  });
  const allClasses = [...classMap.values()].sort(
    (a, b) => (a.numericOrder ?? 99) - (b.numericOrder ?? 99)
  );

  // Class-teacher lookup
  const ctByClass = new Map();
  ctAssignments.forEach(a => {
    if (a.classId?._id) ctByClass.set(String(a.classId._id), a);
  });

  /* ── Filter state ─────────────────────────────────────────────────────── */
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass,   setSelectedClass]   = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [gradeMode,       setGradeMode]        = useState('combined');

  // Section options
  const sectionMap = new Map();
  [...ctAssignments, ...subjectAssignments]
    .filter(a => selectedClass && String(a.classId?._id) === selectedClass)
    .forEach(a => {
      const sec = a.sectionId;
      if (sec?._id) sectionMap.set(String(sec._id), { _id: sec._id, name: sec.name });
    });
  const sectionOptions = [...sectionMap.values()];

  /* ── Auto-select active session ──────────────────────────────────────── */
  useEffect(() => {
    if (selectedSession || sessions.length === 0) return;
    const active = sessions.find(s => s.isActive);
    setSelectedSession(active?._id || sessions[0]?._id || '');
  }, [sessions]);

  /* ── Auto-select first CT class ──────────────────────────────────────── */
  useEffect(() => {
    if (selectedClass || ctAssignments.length === 0) return;
    const first = ctAssignments[0];
    if (first?.classId?._id) {
      setSelectedClass(String(first.classId._id));
      if (first.sectionId?._id) setSelectedSection(String(first.sectionId._id));
    }
  }, [ctAssignments]);

  /* ── When class changes, reset section ──────────────────────────────── */
  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedSection('');
    setLoadParams(null);
    setSaveMsg('');
    setErrorMsg('');
    const secs = [...ctAssignments, ...subjectAssignments]
      .filter(a => String(a.classId?._id) === classId && a.sectionId?._id)
      .map(a => a.sectionId);
    const unique = [...new Map(secs.map(s => [String(s._id), s])).values()];
    if (unique.length === 1) setSelectedSection(String(unique[0]._id));
  };

  /* ── Skills — fetched from template (NOT manual input) ───────────────── */
  const {
    data:      skillsData,
    isLoading: skillsLoading,
  } = useGetCoScholasticSkillsQuery(
    { classId: selectedClass },
    { skip: !selectedClass }
  );

  // Skills come from the template API — fall back to DEFAULT_SKILLS if API returns nothing
  const rawSkills    = skillsData?.skills;
  const templateSkills = (Array.isArray(rawSkills) && rawSkills.length > 0)
    ? rawSkills
    : DEFAULT_SKILLS;
  const templateName   = skillsData?.templateName || '';
  const skillsSource   = skillsData?.source || '';   // 'database' | 'template_loop' | 'template' | 'defaults'
  // skillsReady: just wait for the query to finish — never block on skill count
  const skillsReady    = !skillsLoading;

  /* ── Load handler ───────────────────────────────────────────────────── */
  const [loadParams, setLoadParams] = useState(null);
  const [errorMsg,   setErrorMsg]   = useState('');

  const {
    data: marksData,
    isFetching,
    refetch,
    error: fetchError,
  } = useGetCoScholasticMarksQuery(loadParams, { skip: !loadParams });

  const students = marksData?.students || [];

  useEffect(() => {
    if (!fetchError) { setErrorMsg(''); return; }
    setErrorMsg(fetchError?.data?.message || 'Failed to load students. Check your network.');
  }, [fetchError]);

  const handleLoad = () => {
    setErrorMsg('');
    if (!selectedClass)    { setErrorMsg('Please select a class first.');   return; }
    if (skillsLoading)     { setErrorMsg('Skills still loading — please wait a moment.'); return; }
    setLoadParams({
      classId:   selectedClass,
      ...(selectedSection ? { sectionId: selectedSection } : {}),
      ...(selectedSession ? { session:   selectedSession } : {}),
      skills:    templateSkills.join(','),   // ← always template-driven
    });
  };

  /* ── Local grade state ─────────────────────────────────────────────── */
  const [grades, setGrades] = useState({});
  const [dirty,  setDirty]  = useState(false);

  useEffect(() => {
    if (!students.length) return;
    const initial = {};
    students.forEach(st => {
      const sid = String(st.studentId);
      initial[sid] = {};
      (st.coScholastic || []).forEach(c => {
        if (c.skillName) {
          initial[sid][c.skillName] = {
            grade:   c.grade   || '',
            t1Grade: c.t1Grade || '',
            t2Grade: c.t2Grade || '',
          };
        }
      });
    });
    setGrades(initial);
    setDirty(false);
  }, [students]);

  const handleGradeChange = (studentId, skill, field, value) => {
    setGrades(prev => {
      const existing = prev[studentId]?.[skill] || { grade: '', t1Grade: '', t2Grade: '' };
      const updated  = { ...existing, [field]: value };
      if (field === 'grade')   { updated.t1Grade = ''; updated.t2Grade = ''; }
      if (field === 't1Grade' || field === 't2Grade') {
        updated.grade = updated.t1Grade || updated.t2Grade || '';
      }
      return { ...prev, [studentId]: { ...prev[studentId], [skill]: updated } };
    });
    setDirty(true);
  };

  /* ── Save handler ──────────────────────────────────────────────────── */
  const [saveMarks, { isLoading: saving }] = useSaveCoScholasticMarksMutation();
  const [saveMsg, setSaveMsg] = useState('');

  const handleSave = async () => {
    setSaveMsg('');
    const entries = [];
    students.forEach(st => {
      const sid = String(st.studentId);
      templateSkills.forEach(skill => {          // ← only template skills, never extra
        const g = grades[sid]?.[skill] || {};
        entries.push({
          studentId: sid,
          skillName: skill,
          grade:     g.grade   ?? '',
          t1Grade:   g.t1Grade ?? '',
          t2Grade:   g.t2Grade ?? '',
        });
      });
    });
    try {
      await saveMarks({
        classId:   selectedClass,
        ...(selectedSection ? { sectionId: selectedSection } : {}),
        ...(selectedSession ? { session:   selectedSession } : {}),
        entries,
      }).unwrap();
      setSaveMsg('✓ Grades saved successfully!');
      setDirty(false);
      refetch();
    } catch (err) {
      setSaveMsg(`✗ ${err?.data?.message || 'Save failed. Please try again.'}`);
    }
  };

  const isCtForSelectedClass = ctByClass.has(selectedClass);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="csk-page">

      {/* ── Header ── */}
      <div className="csk-header">
        <div>
          <h1 className="csk-title">Co-Scholastic Marks</h1>
          <p className="csk-subtitle">
            Co-scholastic grades are linked to your school's report card template.
            {templateName && (
              <span className="csk-template-badge">📋 {templateName}</span>
            )}
          </p>
        </div>
        <div className="csk-header-actions">
          {/* Grade-mode toggle */}
          <div className="csk-mode-toggle" role="group" aria-label="Grade entry mode">
            {MODES.map(m => (
              <button
                key={m.key}
                className={`csk-mode-btn${gradeMode === m.key ? ' active' : ''}`}
                onClick={() => setGradeMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {dirty && isCtForSelectedClass && (
            <button className="csk-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving…' : '💾 Save All Grades'}
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
      {saveMsg && (
        <div className={`csk-alert ${saveMsg.startsWith('✓') ? 'csk-alert-success' : 'csk-alert-error'}`}>
          {saveMsg}
        </div>
      )}
      {errorMsg && <div className="csk-alert csk-alert-error">{errorMsg}</div>}
      {selectedClass && !isCtForSelectedClass && (
        <div className="csk-alert csk-alert-warn">
          ⚠️ Only the designated class teacher can enter co-scholastic marks.
        </div>
      )}

      {/* ── Filter row (no manual skills input) ── */}
      <div className="csk-filters">

        {/* SESSION */}
        <div className="csk-field">
          <label className="csk-label">SESSION</label>
          <select className="csk-select" value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
            <option value="">-- Select Session --</option>
            {sessions.map(s => (
              <option key={s._id} value={s._id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>
            ))}
          </select>
        </div>

        {/* CLASS */}
        <div className="csk-field">
          <label className="csk-label">CLASS *</label>
          <select className="csk-select" value={selectedClass} onChange={e => handleClassChange(e.target.value)}>
            <option value="">-- Select Class --</option>
            {allClasses.map(cls => (
              <option key={cls._id} value={String(cls._id)}>
                {cls.name}{ctByClass.has(String(cls._id)) ? ' ★' : ''}
              </option>
            ))}
          </select>
          {allClasses.length === 0 && <span className="csk-hint">No classes assigned yet</span>}
        </div>

        {/* SECTION */}
        <div className="csk-field">
          <label className="csk-label">SECTION</label>
          <select className="csk-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
            <option value="">All Sections</option>
            {sectionOptions.map(s => (
              <option key={String(s._id)} value={String(s._id)}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* SKILLS PILL ROW — read-only, sourced from template */}
        {selectedClass && (
          <div className="csk-field csk-field-skills">
            <label className="csk-label">
              SKILLS FROM TEMPLATE
              {skillsSource === 'template'
                ? <span className="csk-auto-badge">auto-detected</span>
                : <span className="csk-auto-badge csk-badge-default">defaults</span>
              }
            </label>
            <div className="csk-skill-pills">
              {skillsLoading
                ? <span className="csk-hint">Loading skills…</span>
                : templateSkills.length > 0
                  ? templateSkills.map(s => <span key={s} className="csk-skill-pill">{s}</span>)
                  : <span className="csk-hint">No skills detected — check your template</span>
              }
            </div>
          </div>
        )}

        <button
          className="csk-load-btn"
          onClick={handleLoad}
          disabled={isFetching || !selectedClass || !skillsReady}
        >
          {isFetching ? '⏳ Loading…' : 'Load Students'}
        </button>
      </div>

      {/* ── Table / states ── */}
      {isFetching ? (
        <div className="csk-loading">
          <div className="csk-spinner" />
          <p>Fetching students…</p>
        </div>
      ) : students.length === 0 && loadParams && !errorMsg ? (
        <div className="csk-empty">
          <div className="csk-empty-icon">🔍</div>
          <p>No students found.<br />Check that students are enrolled in this class &amp; session.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="csk-empty">
          <div className="csk-empty-icon">🎓</div>
          <p>Select a class and click <strong>Load Students</strong> to begin.</p>
        </div>
      ) : (
        <>
          <div className="csk-mode-info">
            {gradeMode === 'split'
              ? '📊 T1 / T2 Split Mode — enter separate Term 1 and Term 2 grades for each skill.'
              : '📋 Combined Mode — enter a single overall grade per skill.'}
          </div>

          <div className="csk-table-wrap">
            <table className="csk-table">
              <thead>
                <tr>
                  <th className="csk-th csk-th-fixed">#</th>
                  <th className="csk-th csk-th-student">Student</th>
                  <th className="csk-th">Roll No</th>
                  {templateSkills.map(skill => (
                    gradeMode === 'split' ? (
                      <th key={skill} className="csk-th csk-th-split" colSpan={2}>
                        {skill}
                        <div className="csk-th-sub"><span>T1</span><span>T2</span></div>
                      </th>
                    ) : (
                      <th key={skill} className="csk-th">{skill}</th>
                    )
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((st, idx) => {
                  const sid    = String(st.studentId);
                  const stName = st.name || `${st.firstName || ''} ${st.lastName || ''}`.trim() || '—';
                  return (
                    <tr key={sid} className={idx % 2 === 0 ? 'csk-tr-even' : 'csk-tr-odd'}>
                      <td className="csk-td csk-td-center">{idx + 1}</td>
                      <td className="csk-td csk-td-student">
                        <div className="csk-student-name">{stName}</div>
                      </td>
                      <td className="csk-td csk-td-center">{st.rollNo || '—'}</td>
                      {templateSkills.map(skill => {
                        const g = grades[sid]?.[skill] || { grade: '', t1Grade: '', t2Grade: '' };
                        return gradeMode === 'split' ? (
                          <React.Fragment key={skill}>
                            <td className="csk-td csk-td-center csk-td-split">
                              <GradeCell value={g.t1Grade} disabled={!isCtForSelectedClass}
                                onChange={v => handleGradeChange(sid, skill, 't1Grade', v)} />
                            </td>
                            <td className="csk-td csk-td-center csk-td-split">
                              <GradeCell value={g.t2Grade} disabled={!isCtForSelectedClass}
                                onChange={v => handleGradeChange(sid, skill, 't2Grade', v)} />
                            </td>
                          </React.Fragment>
                        ) : (
                          <td key={skill} className="csk-td csk-td-center">
                            <GradeCell value={g.grade} disabled={!isCtForSelectedClass}
                              onChange={v => handleGradeChange(sid, skill, 'grade', v)} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="csk-footer">
            <span className="csk-count">
              {students.length} student{students.length !== 1 ? 's' : ''} loaded
              {marksData?.sessionName ? ` · ${marksData.sessionName}` : ''}
            </span>
            {isCtForSelectedClass ? (
              <button className="csk-save-btn" onClick={handleSave} disabled={saving || !dirty}>
                {saving ? '⏳ Saving…' : dirty ? '💾 Save All Grades' : '✓ All Saved'}
              </button>
            ) : (
              <span className="csk-readonly-badge">👁 View Only — not class teacher</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}