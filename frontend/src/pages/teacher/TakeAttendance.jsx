import React, { useState } from 'react';
import {
  useGetMyAssignmentsQuery,
  useTakeAttendanceMutation,
  useGetStudentsForAttendanceQuery,
  useGetAttendanceRecordsQuery,
} from '../../redux/api/teacherApi';
import { useGetActiveSessionQuery } from '../../redux/api/adminApi';
import toast from 'react-hot-toast';

const TODAY = new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusConfig = {
  present: { label: 'Present', cls: 'bg-green-100 text-green-700 border-green-300' },
  absent: { label: 'Absent', cls: 'bg-red-100 text-red-700 border-red-300' },
  late: { label: 'Late', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  leave: { label: 'Leave', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
};
const STATUS_CYCLE = ['present', 'absent', 'late', 'leave'];

const StatusBadge = ({ status }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig[status]?.cls || ''}`}>
    {statusConfig[status]?.label || status}
  </span>
);

export default function TakeAttendance() {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: assignData } = useGetMyAssignmentsQuery();
  const myAssignments = assignData?.data || [];
  const [takeAttendance, { isLoading: submitting }] = useTakeAttendanceMutation();

  const [tab, setTab] = useState('take');

  // ── TAKE ATTENDANCE STATE ──
  const [step, setStep] = useState(1); // 1=select, 2=mark
  const [sel, setSel] = useState({ classId: '', sectionId: '', subjectId: '' });

  // Derive unique classes, sections, subjects from my assignments
  const classes = [...new Map(myAssignments.map(a => [a.classId._id, a.classId])).values()];
  const sectionsForClass = myAssignments
    .filter(a => a.classId._id === sel.classId)
    .map(a => a.sectionId)
    .filter((s, i, arr) => arr.findIndex(x => x._id === s._id) === i);
  const subjectsForSlot = myAssignments
    .filter(a => a.classId._id === sel.classId && a.sectionId._id === sel.sectionId)
    .map(a => a.subjectId);

  const canLoadStudents = !!(sel.classId && sel.sectionId && sessionId);
  const { data: studentsData } = useGetStudentsForAttendanceQuery(
    { classId: sel.classId, sectionId: sel.sectionId, session: sessionId },
    { skip: !canLoadStudents }
  );
  const students = studentsData?.data || [];

  const [records, setRecords] = useState([]);

  const handleLoadStudents = () => {
    if (!sel.subjectId) { toast.error('Please select a subject'); return; }
    const init = students.map(s => ({
      studentId: s._id,
      name: `${s.firstName} ${s.lastName}`,
      rollNo: s.rollNo,
      onLeave: s.onLeave,
      leaveId: s.leaveId,
      status: s.onLeave ? 'leave' : 'present',
    }));
    setRecords(init);
    setStep(2);
  };

  const toggleStatus = (idx) => {
    setRecords(prev => {
      const updated = [...prev];
      const cur = STATUS_CYCLE.indexOf(updated[idx].status);
      updated[idx] = { ...updated[idx], status: STATUS_CYCLE[(cur + 1) % STATUS_CYCLE.length] };
      return updated;
    });
  };

  const markAll = (status) => setRecords(prev => prev.map(r => ({ ...r, status })));

  const handleSubmit = async () => {
    try {
      const sessionForSlot = myAssignments.find(
        a => a.classId._id === sel.classId && a.sectionId._id === sel.sectionId && a.subjectId._id === sel.subjectId
      )?.session?._id;
      const res = await takeAttendance({
        classId: sel.classId,
        sectionId: sel.sectionId,
        subjectId: sel.subjectId,
        session: sessionForSlot || sessionId,
        date: TODAY,
        attendanceType: 'subject',
        records: records.map(r => ({ studentId: r.studentId, status: r.status, leaveId: r.leaveId || undefined }))
      }).unwrap();
      
      if (res.alreadyExists) {
        toast.success('Attendance updated successfully!');
      } else {
        toast.success('Attendance saved!');
      }
      setStep(1);
      setRecords([]);
      setSel({ classId: '', sectionId: '', subjectId: '' });
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save attendance');
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;

  // ── HISTORY STATE ──
  const [hFilter, setHFilter] = useState({ classId: '', sectionId: '', subjectId: '', from: '', to: '' });
  const { data: histData } = useGetAttendanceRecordsQuery(hFilter, { skip: tab !== 'history' });
  const histRecords = histData?.data || [];
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
        <div className="flex gap-2">
          {(['take', 'history']).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {t === 'take' ? '📝 Take Attendance' : '📋 History'}
            </button>
          ))}
        </div>
      </div>

      {/* ======================== TAKE ATTENDANCE ======================== */}
      {tab === 'take' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 text-xs text-blue-700 flex items-center gap-2">
            📅 Attendance can only be taken for <strong>today ({new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})</strong>
          </div>

          {step === 1 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-5 max-w-md">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Select Class & Subject</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Class *</label>
                  <select value={sel.classId} onChange={e => setSel({ classId: e.target.value, sectionId: '', subjectId: '' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Section *</label>
                  <select value={sel.sectionId} onChange={e => setSel(s => ({ ...s, sectionId: e.target.value, subjectId: '' }))}
                    disabled={!sel.classId}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                    <option value="">Select section</option>
                    {sectionsForClass.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subject *</label>
                  <select value={sel.subjectId} onChange={e => setSel(s => ({ ...s, subjectId: e.target.value }))}
                    disabled={!sel.sectionId}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                    <option value="">Select subject</option>
                    {subjectsForSlot.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <button onClick={handleLoadStudents} disabled={!canLoadStudents || !sel.subjectId}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 mt-2">
                  Load Students
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Context bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <button onClick={() => { setStep(1); setRecords([]); }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  ← Back
                </button>
                <div className="flex gap-3 text-xs font-semibold">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">✓ {presentCount} Present</span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">✗ {absentCount} Absent</span>
                  {lateCount > 0 && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">⏰ {lateCount} Late</span>}
                  {leaveCount > 0 && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">🏖 {leaveCount} Leave</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => markAll('present')} className="text-xs border border-green-300 text-green-700 px-2 py-1 rounded hover:bg-green-50">All Present</button>
                  <button onClick={() => markAll('absent')} className="text-xs border border-red-300 text-red-700 px-2 py-1 rounded hover:bg-red-50">All Absent</button>
                </div>
              </div>

              {/* Hint */}
              <p className="text-xs text-gray-400 mb-3">Tap status badge to cycle: Present → Absent → Late → Leave</p>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="divide-y divide-gray-100">
                  {records.map((r, i) => (
                    <div key={r.studentId} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-8">{r.rollNo || i + 1}</span>
                        <div>
                          <span className="font-medium text-sm text-gray-900">{r.name}</span>
                          {r.onLeave && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">
                              🏖 On Leave
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => toggleStatus(i)}>
                        <StatusBadge status={r.status} />
                      </button>
                    </div>
                  ))}
                  {records.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">No students found for this class/section.</p>
                  )}
                </div>
              </div>

              {records.length > 0 && (
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 max-w-md">
                  {submitting ? 'Saving...' : 'Submit Attendance'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================== HISTORY ======================== */}
      {tab === 'history' && (
        <div>
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filter History</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Class</label>
                <select value={hFilter.classId} onChange={e => setHFilter(f => ({ ...f, classId: e.target.value, sectionId: '' }))}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subject</label>
                <select value={hFilter.subjectId} onChange={e => setHFilter(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Subjects</option>
                  {[...new Map(myAssignments.map(a => [a.subjectId._id, a.subjectId])).values()]
                    .map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={hFilter.from} onChange={e => setHFilter(f => ({ ...f, from: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={hFilter.to} onChange={e => setHFilter(f => ({ ...f, to: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none" />
              </div>
            </div>
          </div>

          {/* History list */}
          <div className="space-y-3">
            {histRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">
                <p className="text-sm">No attendance records found.</p>
              </div>
            ) : histRecords.map(r => (
              <div key={r._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {r.subjectId?.name || 'Hall Attendance'} — {r.classId?.name} {r.sectionId?.name}
                      </p>
                      <p className="text-xs text-gray-500">{fmtDate(r.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 text-xs">
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">✓ {r.summary?.present}</span>
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded">✗ {r.summary?.absent}</span>
                      {r.summary?.late > 0 && <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">⏰ {r.summary?.late}</span>}
                      {r.summary?.leave > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">🏖 {r.summary?.leave}</span>}
                    </div>
                    <span className="text-gray-400 text-sm">{expandedId === r._id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedId === r._id && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {r.records.map((rec, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-gray-700">
                          {rec.studentId?.firstName} {rec.studentId?.lastName}
                          <span className="text-xs text-gray-400 ml-2">({rec.studentId?.rollNo})</span>
                        </span>
                        <StatusBadge status={rec.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
