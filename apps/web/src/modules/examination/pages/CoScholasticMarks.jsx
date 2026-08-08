import React, { useState, useEffect } from 'react';
import {
  useGetMyClassTeacherQuery,
  useGetMyAssignmentsQuery,
  useGetCoScholasticSkillsQuery,
  useGetCoScholasticMarksQuery,
  useSaveCoScholasticMarksMutation,
} from '@modules/people/api/teacherApi';
import { useGetSessionsQuery } from '../../../redux/api/adminApi';
import { Save, Check, AlertCircle, Sparkles, BookOpen } from 'lucide-react';

const DEFAULT_SKILLS = ['Discipline', 'Activity', 'Games', 'Drawing', 'Music'];

const GRADE_META = {
  'A+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  A:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  B:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  C:   'bg-amber-50 text-amber-700 border-amber-200',
  D:   'bg-orange-50 text-orange-700 border-orange-200',
  E:   'bg-rose-50 text-rose-700 border-rose-200',
  '':  'bg-slate-100 text-slate-500 border-slate-200',
};
const GRADE_OPTIONS = ['', 'A+', 'A', 'B', 'C', 'D', 'E'];

function GradeCell({ value, onChange, disabled }) {
  const meta = GRADE_META[value] || GRADE_META[''];
  return (
    <select
      className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer transition ${meta} disabled:opacity-50`}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    >
      {GRADE_OPTIONS.map(opt => (
        <option key={opt} value={opt}>{opt || '—'}</option>
      ))}
    </select>
  );
}

const MODES = [
  { key: 'combined', label: 'Combined Grade' },
  { key: 'split',    label: 'T1 / T2 Split'  },
];

export default function CoScholasticMarks() {
  const { data: ctData }       = useGetMyClassTeacherQuery();
  const { data: myData }       = useGetMyAssignmentsQuery();
  const { data: sessionsData } = useGetSessionsQuery();

  const ctAssignments      = ctData?.data  || [];
  const subjectAssignments = myData?.data  || [];
  const sessions           = sessionsData?.data || [];

  const classMap = new Map();
  [...ctAssignments, ...subjectAssignments].forEach(a => {
    if (a.classId?._id) classMap.set(String(a.classId._id), a.classId);
  });
  const allClasses = [...classMap.values()].sort(
    (a, b) => (a.numericOrder ?? 99) - (b.numericOrder ?? 99)
  );

  const ctByClass = new Map();
  ctAssignments.forEach(a => {
    if (a.classId?._id) ctByClass.set(String(a.classId._id), a);
  });

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass,   setSelectedClass]   = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [gradeMode,       setGradeMode]        = useState('combined');

  const sectionMap = new Map();
  [...ctAssignments, ...subjectAssignments]
    .filter(a => selectedClass && String(a.classId?._id) === selectedClass)
    .forEach(a => {
      const sec = a.sectionId;
      if (sec?._id) sectionMap.set(String(sec._id), { _id: sec._id, name: sec.name });
    });
  const sectionOptions = [...sectionMap.values()];

  useEffect(() => {
    if (selectedSession || sessions.length === 0) return;
    const active = sessions.find(s => s.isActive);
    setSelectedSession(active?._id || sessions[0]?._id || '');
  }, [sessions]);

  useEffect(() => {
    if (selectedClass || ctAssignments.length === 0) return;
    const first = ctAssignments[0];
    if (first?.classId?._id) {
      setSelectedClass(String(first.classId._id));
      if (first.sectionId?._id) setSelectedSection(String(first.sectionId._id));
    }
  }, [ctAssignments]);

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

  const {
    data:      skillsData,
    isLoading: skillsLoading,
  } = useGetCoScholasticSkillsQuery(
    { classId: selectedClass },
    { skip: !selectedClass }
  );

  const rawSkills      = skillsData?.skills;
  const templateSkills = (Array.isArray(rawSkills) && rawSkills.length > 0)
    ? rawSkills
    : DEFAULT_SKILLS;
  const templateName   = skillsData?.templateName || '';
  const skillsSource   = skillsData?.source || '';
  const skillsReady    = !skillsLoading;

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
      skills:    templateSkills.join(','),
    });
  };

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

  const [saveMarks, { isLoading: saving }] = useSaveCoScholasticMarksMutation();
  const [saveMsg, setSaveMsg] = useState('');

  const handleSave = async () => {
    setSaveMsg('');
    const entries = [];
    students.forEach(st => {
      const sid = String(st.studentId);
      templateSkills.forEach(skill => {
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
      setSaveMsg('Grades saved successfully!');
      setDirty(false);
      refetch();
    } catch (err) {
      setSaveMsg(err?.data?.message || 'Save failed. Please try again.');
    }
  };

  const isCtForSelectedClass = ctByClass.has(selectedClass);

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Co-Scholastic Marks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Co-scholastic grades linked to school report card template
            {templateName && (
              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold border border-slate-200">
                {templateName}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setGradeMode(m.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  gradeMode === m.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {dirty && isCtForSelectedClass && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving…' : 'Save All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {saveMsg && (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {selectedClass && !isCtForSelectedClass && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs font-semibold text-amber-800">
          Note: Only designated class teachers can edit co-scholastic grades for this class.
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Session</label>
          <select
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          >
            <option value="">-- Select Session --</option>
            {sessions.map(s => (
              <option key={s._id} value={s._id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
          <select
            value={selectedClass}
            onChange={e => handleClassChange(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          >
            <option value="">-- Select Class --</option>
            {allClasses.map(cls => (
              <option key={cls._id} value={String(cls._id)}>
                {cls.name}{ctByClass.has(String(cls._id)) ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
          <select
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          >
            <option value="">All Sections</option>
            {sectionOptions.map(s => (
              <option key={String(s._id)} value={String(s._id)}>{s.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleLoad}
          disabled={isFetching || !selectedClass || !skillsReady}
          className="w-full bg-slate-900 text-white py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer disabled:opacity-40 shadow-xs"
        >
          {isFetching ? 'Loading…' : 'Load Students'}
        </button>
      </div>

      {/* Main Content Area */}
      {isFetching ? (
        <div className="flex justify-center py-14">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs bg-white border border-slate-200/80 rounded-2xl">
          Select class and click Load Students to evaluate co-scholastic grades.
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          {/* Mobile Card View */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {students.map((st, idx) => {
              const sid = String(st.studentId);
              const stName = st.name || `${st.firstName || ''} ${st.lastName || ''}`.trim() || '—';
              return (
                <div key={sid} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{stName}</span>
                    <span className="text-[11px] font-semibold text-slate-500">Roll: {st.rollNo || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {templateSkills.map(skill => {
                      const g = grades[sid]?.[skill] || { grade: '', t1Grade: '', t2Grade: '' };
                      return (
                        <div key={skill} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                          <span className="text-[10px] font-semibold text-slate-600">{skill}</span>
                          <GradeCell
                            value={g.grade}
                            disabled={!isCtForSelectedClass}
                            onChange={v => handleGradeChange(sid, skill, 'grade', v)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="py-2.5 px-4 w-12">#</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Roll No</th>
                  {templateSkills.map(skill => (
                    <th key={skill} className="py-2.5 px-4 text-center">{skill}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {students.map((st, idx) => {
                  const sid = String(st.studentId);
                  const stName = st.name || `${st.firstName || ''} ${st.lastName || ''}`.trim() || '—';
                  return (
                    <tr key={sid} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{stName}</td>
                      <td className="py-3 px-4 text-slate-600">{st.rollNo || '—'}</td>
                      {templateSkills.map(skill => {
                        const g = grades[sid]?.[skill] || { grade: '', t1Grade: '', t2Grade: '' };
                        return (
                          <td key={skill} className="py-3 px-4 text-center">
                            <GradeCell
                              value={g.grade}
                              disabled={!isCtForSelectedClass}
                              onChange={v => handleGradeChange(sid, skill, 'grade', v)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}