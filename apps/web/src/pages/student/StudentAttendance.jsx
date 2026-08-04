import React, { useState } from 'react';
import { useGetMyAttendanceQuery } from '../../redux/api/studentApi';
import { Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusConfig = {
  present: { label: 'Present', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  absent: { label: 'Absent', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  late: { label: 'Late', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  leave: { label: 'Leave', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
};

const StudentAttendance = () => {
  const [filterSubject, setFilterSubject] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data, isLoading } = useGetMyAttendanceQuery({ month });
  const attendance = data?.data || [];
  const summary = data?.summary || {};

  // Derive subjects from records
  const subjects = [...new Map(
    attendance.filter(a => a.subject).map(a => [a.subject._id, a.subject])
  ).values()];

  const filtered = attendance.filter(a =>
    !filterSubject || a.subject?._id === filterSubject || a.attendanceType === 'hall'
  );

  // SVG dimensions & math for overall Donut Ring
  const percentage = summary.percentage || 0;
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const presentStroke = summary.total > 0 ? ((summary.present || 0) / summary.total) * circumference : 0;
  const isGoodStanding = percentage >= 75;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-10">

      {/* Header Row: Title and Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Attendance</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track your attendance overview and daily logs</p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="relative shrink-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer w-full sm:w-auto justify-center sm:justify-start">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent border-none text-slate-700 text-xs font-semibold outline-none cursor-pointer flex-1 sm:flex-initial"
            />
          </div>
        </div>
      </div>

      {/* Unified Summary Card (3-Column Layout) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

        {/* Column 1: Overall Percentage & Standing */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 lg:border-r lg:border-slate-100 lg:pr-10">
          {/* Donut Ring Visual */}
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              {/* Absent/Background Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={0}
              />
              {/* Green/Present Ring */}
              {summary.present > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${presentStroke} ${circumference - presentStroke}`}
                  strokeDashoffset={0}
                  className="transition-all duration-700 ease-out"
                />
              )}
            </svg>

            {/* Center Percentage Display with increased spacing */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">{percentage}%</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Overall</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mt-0.5">Attendance</span>
            </div>
          </div>

          {/* Standing info */}
          <div className="space-y-1.5 text-center sm:text-left">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${isGoodStanding
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
              {isGoodStanding ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Good Standing
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Alert
                </>
              )}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {isGoodStanding ? "You're doing great!" : "Needs Improvement"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
              {isGoodStanding
                ? "Keep it up to maintain excellent attendance."
                : "Attend more classes to meet the 75% requirement."}
            </p>
          </div>
        </div>

        {/* Column 2: Breakdown Stats */}
        <div className="lg:col-span-4 lg:border-r lg:border-slate-100 lg:px-10 space-y-3 py-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Present</span>
            </div>
            <span className="text-slate-900 tabular-nums">{summary.present || 0}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Absent</span>
            </div>
            <span className="text-slate-900 tabular-nums">{summary.absent || 0}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Late</span>
            </div>
            <span className="text-slate-900 tabular-nums">{summary.late || 0}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
              <span>Leave</span>
            </div>
            <span className="text-slate-900 tabular-nums">{summary.leave || 0}</span>
          </div>
        </div>

        {/* Column 3: Month Total Card */}
        <div className="lg:col-span-3 lg:pl-10">
          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Classes</span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums block mt-0.5">
                {summary.total || 0}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">This Month</span>
            </div>
          </div>
        </div>

      </div>

      {/* Records Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Logs</h2>
            <span className="text-xs font-semibold text-slate-400">{filtered.length} records</span>
          </div>

          {/* Subject Filter dropdown */}
          {subjects.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Subject:</label>
              <select
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm font-medium">No attendance records found for this period.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filtered.map((a, i) => (
                <div key={i} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 tabular-nums">{fmtDate(a.date)}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig[a.status]?.cls || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {statusConfig[a.status]?.label || a.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="font-medium text-slate-700">
                      {a.attendanceType === 'hall' ? 'Hall Attendance' : (a.subject?.name || '—')}
                    </span>
                    {a.teacher && (
                      <span className="text-[11px] text-slate-400">{a.teacher.firstName} {a.teacher.lastName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-left text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Subject</th>
                    <th className="py-3.5 px-5">Teacher</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filtered.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 text-slate-800 whitespace-nowrap tabular-nums">{fmtDate(a.date)}</td>
                      <td className="py-3.5 px-5 text-slate-700">
                        {a.attendanceType === 'hall' ? (
                          <span className="text-indigo-600 font-semibold">Hall Attendance</span>
                        ) : (
                          a.subject?.name || '—'
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 text-xs">
                        {a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : '—'}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig[a.status]?.cls || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {statusConfig[a.status]?.label || a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;
