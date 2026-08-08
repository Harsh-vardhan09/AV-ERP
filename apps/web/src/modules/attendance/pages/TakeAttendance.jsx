import React, { useState, useMemo } from 'react';
import {
  useGetMyAssignmentsQuery,
  useTakeAttendanceMutation,
  useGetStudentsForAttendanceQuery,
  useGetAttendanceRecordsQuery,
} from '@modules/people/api/teacherApi';
import { useGetActiveSessionQuery } from '@shared/lib/api/adminApi';
import toast from 'react-hot-toast';
import {
  FileText, History, Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, ChevronUp, ArrowLeft, Search, LayoutGrid, List, Users, Check, X, ShieldAlert, Sparkles
} from 'lucide-react';

const TODAY = new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusConfig = {
  present: { label: 'Present', short: 'P', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', active: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
  absent: { label: 'Absent', short: 'A', cls: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', active: 'bg-rose-600 text-white border-rose-600 shadow-xs' },
  late: { label: 'Late', short: 'L', cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', active: 'bg-amber-500 text-white border-amber-500 shadow-xs' },
  leave: { label: 'Leave', short: 'Off', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', active: 'bg-indigo-600 text-white border-indigo-600 shadow-xs' },
};

export default function TakeAttendance() {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: assignData } = useGetMyAssignmentsQuery();
  const myAssignments = assignData?.data || [];
  const [takeAttendance, { isLoading: submitting }] = useTakeAttendanceMutation();

  const [tab, setTab] = useState('take');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'present', 'absent', 'late', 'leave'

  // ── TAKE ATTENDANCE STATE ──
  const [step, setStep] = useState(1); // 1=select slot, 2=mark students
  const [sel, setSel] = useState({ classId: '', sectionId: '', subjectId: '' });

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

  // Quick preset cards from teacher's active assignments
  const assignmentSlots = useMemo(() => {
    return myAssignments.map(a => ({
      key: `${a.classId?._id}_${a.sectionId?._id}_${a.subjectId?._id}`,
      classId: a.classId?._id,
      className: a.classId?.name,
      sectionId: a.sectionId?._id,
      sectionName: a.sectionId?.name,
      subjectId: a.subjectId?._id,
      subjectName: a.subjectId?.name,
    }));
  }, [myAssignments]);

  const handleSelectSlot = (slot) => {
    setSel({
      classId: slot.classId,
      sectionId: slot.sectionId,
      subjectId: slot.subjectId,
    });
  };

  const handleLoadStudents = () => {
    if (!sel.subjectId) { toast.error('Please select a subject'); return; }
    const init = students.map(s => ({
      studentId: s._id,
      name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
      rollNo: s.rollNo || '—',
      onLeave: s.onLeave,
      leaveId: s.leaveId,
      status: s.onLeave ? 'leave' : 'present',
      avatarInitial: (s.firstName ? s.firstName[0] : 'S').toUpperCase(),
    }));
    setRecords(init);
    setStep(2);
  };

  const setStudentStatus = (studentId, status) => {
    setRecords(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
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

  // Stats calculation
  const totalCount = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;
  const presentPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Filtered list for marking step
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(r.rollNo).includes(searchTerm);
      const matchFilter = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchFilter;
    });
  }, [records, searchTerm, filterStatus]);

  // Selected slot info text
  const currentSlotInfo = useMemo(() => {
    const cls = classes.find(c => c._id === sel.classId)?.name || '';
    const sec = sectionsForClass.find(s => s._id === sel.sectionId)?.name || '';
    const sub = subjectsForSlot.find(s => s._id === sel.subjectId)?.name || '';
    return { cls, sec, sub };
  }, [classes, sectionsForClass, subjectsForSlot, sel]);

  // ── HISTORY STATE ──
  const [hFilter, setHFilter] = useState({ classId: '', sectionId: '', subjectId: '', from: '', to: '' });
  const { data: histData } = useGetAttendanceRecordsQuery(hFilter, { skip: tab !== 'history' });
  const histRecords = histData?.data || [];
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="max-w-6xl mx-auto space-y-5 px-2 sm:px-4 pb-12">
      {/* Page Header & Top Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Workstation</h1>
          <p className="text-xs text-slate-500 mt-0.5">Mark daily subject attendance with instant visual feedback</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setTab('take')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'take' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Take Attendance
          </button>
          <button
            onClick={() => setTab('history')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Attendance Logs
          </button>
        </div>
      </div>

      {/* ======================== TAKE ATTENDANCE TAB ======================== */}
      {tab === 'take' && (
        <div className="space-y-4">
          
          {/* Today Date Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-white">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-medium">Session Date</p>
                <p className="text-sm font-bold tracking-wide">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-300" />
              <span>Subject Attendance Entry</span>
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-5">
              {/* Quick Assigned Slot Cards */}
              {assignmentSlots.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Your Assigned Classes & Subjects</h2>
                    <span className="text-[11px] text-slate-500 font-medium">Tap a class card to select</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {assignmentSlots.map((slot) => {
                      const isSelected = sel.classId === slot.classId && sel.sectionId === slot.sectionId && sel.subjectId === slot.subjectId;
                      return (
                        <div
                          key={slot.key}
                          onClick={() => handleSelectSlot(slot)}
                          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 shadow-xs relative overflow-hidden ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 mb-1.5">
                                Class {slot.className} • Sec {slot.sectionName}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                                {slot.subjectName}
                              </h3>
                            </div>
                            <div className={`p-2 rounded-xl border transition ${
                              isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:text-indigo-600 group-hover:bg-indigo-50'
                            }`}>
                              <Users className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                            <span>Ready to mark</span>
                            <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform font-bold">Select →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Class & Subject Selector Form */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs max-w-xl space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Custom Class Selection</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
                    <select
                      value={sel.classId}
                      onChange={e => setSel({ classId: e.target.value, sectionId: '', subjectId: '' })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                    >
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Section *</label>
                    <select
                      value={sel.sectionId}
                      onChange={e => setSel(s => ({ ...s, sectionId: e.target.value, subjectId: '' }))}
                      disabled={!sel.classId}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400 disabled:bg-slate-50"
                    >
                      <option value="">Select section</option>
                      {sectionsForClass.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                    <select
                      value={sel.subjectId}
                      onChange={e => setSel(s => ({ ...s, subjectId: e.target.value }))}
                      disabled={!sel.sectionId}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400 disabled:bg-slate-50"
                    >
                      <option value="">Select subject</option>
                      {subjectsForSlot.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleLoadStudents}
                  disabled={!canLoadStudents || !sel.subjectId}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer disabled:opacity-40 shadow-xs mt-2"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Start Taking Attendance</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Top Context & Live Counter Bar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setStep(1); setRecords([]); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Class {currentSlotInfo.cls} • Sec {currentSlotInfo.sec} ({currentSlotInfo.sub})
                      </h2>
                      <p className="text-[11px] text-slate-500">{records.length} registered students in section</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => markAll('present')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Present
                    </button>
                    <button
                      onClick={() => markAll('absent')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Mark All Absent
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Summary Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Live Class Attendance Rate</span>
                    <span className="text-indigo-600 tabular-nums">{presentPct}% Present</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(presentCount / totalCount) * 100}%` }} />
                    <div className="bg-amber-400 h-full transition-all duration-300" style={{ width: `${(lateCount / totalCount) * 100}%` }} />
                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${(leaveCount / totalCount) * 100}%` }} />
                    <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${(absentCount / totalCount) * 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold pt-1">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">✓ {presentCount} Present</span>
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">✕ {absentCount} Absent</span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">⏰ {lateCount} Late</span>
                    <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">🏥 {leaveCount} Leave</span>
                  </div>
                </div>
              </div>

              {/* Controls: Search, Filter, View Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search student name or roll no..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium outline-none bg-white focus:border-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                  >
                    <option value="all">All Statuses ({records.length})</option>
                    <option value="present">Present ({presentCount})</option>
                    <option value="absent">Absent ({absentCount})</option>
                    <option value="late">Late ({lateCount})</option>
                    <option value="leave">Leave ({leaveCount})</option>
                  </select>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Marking Board */}
              {viewMode === 'grid' ? (
                /* Grid View (Cards) */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredRecords.map((r) => {
                    const statusTheme = {
                      present: 'border-emerald-300 bg-emerald-50/20',
                      absent: 'border-rose-300 bg-rose-50/20',
                      late: 'border-amber-300 bg-amber-50/20',
                      leave: 'border-indigo-300 bg-indigo-50/20',
                    }[r.status];

                    return (
                      <div
                        key={r.studentId}
                        className={`bg-white border-2 rounded-2xl p-3.5 shadow-xs space-y-3 transition ${statusTheme}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${
                              r.status === 'present' ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'absent' ? 'bg-rose-100 text-rose-800'
                              : r.status === 'late' ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {r.avatarInitial}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-900 leading-snug">{r.name}</p>
                              <span className="text-[10px] font-semibold text-slate-500">Roll: {r.rollNo}</span>
                            </div>
                          </div>
                          {r.onLeave && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              Approved Leave
                            </span>
                          )}
                        </div>

                        {/* Status Quick Pill Buttons */}
                        <div className="grid grid-cols-4 gap-1 pt-1">
                          {Object.entries(statusConfig).map(([stKey, cfg]) => {
                            const isActive = r.status === stKey;
                            return (
                              <button
                                key={stKey}
                                onClick={() => setStudentStatus(r.studentId, stKey)}
                                className={`py-1 rounded-xl text-[11px] font-extrabold border transition cursor-pointer text-center ${
                                  isActive ? cfg.active : cfg.cls
                                }`}
                              >
                                {cfg.short}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View (Rows) */
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
                  {filteredRecords.map((r) => (
                    <div key={r.studentId} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/50 transition">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-slate-400 w-8 tabular-nums">#{r.rollNo}</span>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {r.avatarInitial}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900">{r.name}</span>
                          {r.onLeave && (
                            <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                              On Leave
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Pills */}
                      <div className="flex items-center gap-1">
                        {Object.entries(statusConfig).map(([stKey, cfg]) => {
                          const isActive = r.status === stKey;
                          return (
                            <button
                              key={stKey}
                              onClick={() => setStudentStatus(r.studentId, stKey)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                isActive ? cfg.active : cfg.cls
                              }`}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredRecords.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-10 bg-white border border-slate-200/80 rounded-2xl">
                  No students found matching current filters.
                </div>
              )}

              {/* Submit CTA */}
              <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                <div>
                  <p className="text-xs font-bold text-slate-900">Ready to submit attendance?</p>
                  <p className="text-[11px] text-slate-500">Attendance records will be locked and saved for session analytics</p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || records.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {submitting ? 'Saving...' : 'Confirm & Save Attendance'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================== ATTENDANCE LOGS TAB ======================== */}
      {tab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <p className="text-xs font-bold text-slate-900">Filter Attendance Logs</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                <select
                  value={hFilter.classId}
                  onChange={e => setHFilter(f => ({ ...f, classId: e.target.value, sectionId: '' }))}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={hFilter.subjectId}
                  onChange={e => setHFilter(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                >
                  <option value="">All Subjects</option>
                  {[...new Map(myAssignments.map(a => [a.subjectId._id, a.subjectId])).values()]
                    .map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={hFilter.from}
                  onChange={e => setHFilter(f => ({ ...f, from: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={hFilter.to}
                  onChange={e => setHFilter(f => ({ ...f, to: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* History Records List */}
          <div className="space-y-3">
            {histRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                No attendance records found.
              </div>
            ) : histRecords.map(r => (
              <div key={r._id} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs transition">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition"
                  onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                >
                  <div>
                    <p className="font-bold text-xs text-slate-900">
                      {r.subjectId?.name || 'Hall Attendance'} — Class {r.classId?.name} • Sec {r.sectionId?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(r.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 text-[10px] font-bold">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">✓ {r.summary?.present} Present</span>
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">✕ {r.summary?.absent} Absent</span>
                    </div>
                    {expandedId === r._id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {expandedId === r._id && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/30">
                    {r.records.map((rec, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                        <span className="font-semibold text-slate-800">
                          {rec.studentId?.firstName} {rec.studentId?.lastName}
                          <span className="text-[11px] text-slate-400 ml-1.5 font-normal">(Roll #{rec.studentId?.rollNo})</span>
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          rec.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : rec.status === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : rec.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {rec.status}
                        </span>
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
