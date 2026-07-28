import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGetMyReportQuery, useGetMyStudentAssignmentsQuery } from '../../redux/api/studentApi';
import { 
  Calendar, 
  BookOpen, 
  ClipboardList, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Bookmark,
  CheckCircle
} from 'lucide-react';
import LibraryReminder from '../../components/library/LibraryReminder';

// ── SVG Donut Ring Component for Attendance ──────────────────────────────────
const AttendanceDonutRing = ({ present = 0, total = 0 }) => {
  const absent = Math.max(0, total - present);
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  // SVG dimensions & math
  const radius = 38;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const presentStroke = total > 0 ? (present / total) * circumference : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Donut Ring Visual */}
      <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Red/Absent Ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={0}
          />
          {/* Green/Present Ring */}
          {present > 0 && (
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

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">{percentage}%</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Present</span>
        </div>
      </div>

      {/* Legend & Stat Breakdowns */}
      <div className="space-y-2 flex-1 w-full">
        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/80 border border-emerald-100/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-xs font-semibold text-emerald-900">Present</span>
          </div>
          <span className="text-xs font-bold text-emerald-700 tabular-nums">{present} days</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/80 border border-red-100/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="text-xs font-semibold text-red-900">Absent</span>
          </div>
          <span className="text-xs font-bold text-red-700 tabular-nums">{absent} days</span>
        </div>
      </div>
    </div>
  );
};

// ── Grade Badge Helper ────────────────────────────────────────────────────────
const getGradeBadge = (score, max = 100) => {
  const percentage = Math.round((score / max) * 100);
  if (percentage >= 90) return { label: 'Grade A+', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (percentage >= 80) return { label: 'Grade A', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (percentage >= 70) return { label: 'Grade B+', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  if (percentage >= 60) return { label: 'Grade B', style: 'bg-sky-50 text-sky-700 border-sky-200' };
  if (percentage >= 50) return { label: 'Grade C', style: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Grade D', style: 'bg-red-50 text-red-700 border-red-200' };
};

// ── Clean Class Name Formatter ────────────────────────────────────────────────
const formatClassName = (cls, sec) => {
  if (!cls) return '';
  const cleanClass = cls.toString().replace(/^class\s+/i, '').trim();
  return `Class ${cleanClass}${sec ? ` – Section ${sec}` : ''}`;
};

const StudentDashboard = () => {
  const { data: reportData, isLoading } = useGetMyReportQuery();
  const { data: assignmentsData } = useGetMyStudentAssignmentsQuery();

  const report = reportData?.data || {};
  const assignmentList = assignmentsData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="erp-spinner" />
      </div>
    );
  }

  const { student, attendance, assignments: assignStats, marks, leaves } = report;

  // Exam Marks Average Math
  const totalMarksObtained = marks?.reduce((acc, m) => acc + (m.marksObtained || 0), 0) || 0;
  const avgMark = marks?.length > 0 ? Math.round(totalMarksObtained / marks.length) : 0;
  const overallGrade = getGradeBadge(avgMark);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* ── Top Header Banner & Student Metadata ──────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Welcome Back, {student?.name || 'Student'} 👋
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Active Student
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            {formatClassName(student?.class, student?.section)} &nbsp;•&nbsp; Roll No: <span className="font-semibold text-slate-700 tabular-nums">{student?.rollNo}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NavLink
            to="/student/apply-leave"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Apply Leave
          </NavLink>
          <NavLink
            to="/student/report-card"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            Report Card
          </NavLink>
        </div>
      </div>

      {/* Library overdue / due-soon reminder alert */}
      <LibraryReminder />

      {/* ── 70 / 30 Two-Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── MAIN COLUMN (70% = 8 cols) ─────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Top Row: Attendance Donut Ring Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Attendance Record
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {attendance?.totalClasses || 0} Total Classes
              </span>
            </div>
            <AttendanceDonutRing present={attendance?.present || 0} total={attendance?.totalClasses || 0} />
          </div>

          {/* ── Recent Assignments Section (Replaced generic vibe-coded progress bar) ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Assignments</h2>
                  <p className="text-xs text-slate-500">Track homework, tasks & submission status</p>
                </div>
              </div>
              <NavLink 
                to="/student/assignments" 
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="divide-y divide-slate-100">
              {assignmentList?.length > 0 ? (
                assignmentList.slice(0, 4).map((item) => {
                  const isSubmitted = item.isSubmitted;
                  const isExpired = item.isExpired;
                  const dueDateFormatted = item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No Due Date';

                  return (
                    <div key={item._id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase tracking-wider">
                            {item.subjectId?.name || 'Subject'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due {dueDateFormatted}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 truncate">
                          {item.title || item.topic || 'Class Assignment'}
                        </h4>
                      </div>

                      <div className="shrink-0">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Submitted
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3 text-red-500" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs font-medium">
                  No active assignments found for your class.
                </div>
              )}
            </div>
          </div>

          {/* Recent Marks Table Section */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Academic Performance</h2>
                  <p className="text-xs text-slate-500">Latest recorded examination marks & grades</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${overallGrade.style}`}>
                Avg {avgMark}% ({overallGrade.label})
              </span>
            </div>

            {marks?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-5">Exam Name</th>
                      <th className="py-3.5 px-5">Subject</th>
                      <th className="py-3.5 px-5 text-center">Score</th>
                      <th className="py-3.5 px-5 text-right">Grade Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {marks.slice(0, 8).map((m, i) => {
                      const grade = getGradeBadge(m.marksObtained || 0);
                      return (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            {m.examId?.name || 'Standard Test'}
                          </td>
                          <td className="py-3.5 px-5">
                            {m.subjectId?.name || 'General'}
                          </td>
                          <td className="py-3.5 px-5 text-center font-bold text-slate-900 tabular-nums">
                            {m.marksObtained} <span className="text-slate-400 font-normal text-[11px]">/ 100</span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${grade.style}`}>
                              {grade.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No exam marks recorded yet for this session.
              </div>
            )}
          </div>

        </div>

        {/* ── SIDEBAR PANEL (30% = 4 cols) ────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Quick Actions Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2.5">
              Quick Shortcuts
            </h3>
            <div className="space-y-2">
              <NavLink
                to="/student/attendance"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/60 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  <span>Full Attendance Sheet</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </NavLink>

              <NavLink
                to="/student/assignments"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/60 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  <span>View All Assignments</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </NavLink>

              <NavLink
                to="/student/notices"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/60 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  <span>School Bulletin Board</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </NavLink>
            </div>
          </div>

          {/* Leave Status Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Leave Requests
              </h3>
              <span className="text-xs font-bold text-indigo-600">
                {leaves?.reduce((acc, l) => acc + l.count, 0) || 0} Total
              </span>
            </div>

            <div className="space-y-2">
              {leaves?.length > 0 ? (
                leaves.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-medium text-slate-700 capitalize">{l._id || 'Pending'}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{l.count} day(s)</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-1">No leave records submitted.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default StudentDashboard;
