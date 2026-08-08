import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import {
  useGetMyReportQuery,
  useGetMyStudentAssignmentsQuery,
  useGetMyAttendanceQuery,
  useGetStudentNoticesQuery,
  useGetMyProfileQuery
} from '@modules/people/api/studentApi';
import {
  Calendar,
  BookOpen,
  ClipboardList,
  Award,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Bookmark,
  CheckCircle,
  GraduationCap,
  Sparkles,
  CircleUser,
  X,
  ChevronRight,
  ExternalLink,
  Bell,
  Pin,
  CreditCard
} from 'lucide-react';
import {
  MdBarChart,
  MdMenuBook,
  MdSchool,
  MdLocalLibrary,
  MdReportProblem,
  MdDescription,
  MdChevronRight,
  MdAutoAwesome
} from 'react-icons/md';
import {
  FaCalendarCheck,
  FaCreditCard,
  FaFileAlt,
  FaAward,
  FaBookOpen,
  FaGraduationCap,
  FaBookmark,
  FaExclamationCircle
} from 'react-icons/fa';
import { useGetStudentFeeSummaryQuery } from '@modules/fees/api/feeApi';
import { useGetReportCardExamsQuery } from '@modules/reportcards/api/reportCardApi';
import LibraryReminder from '@modules/library/components/LibraryReminder';

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
    <div className="flex flex-row items-center gap-2.5 sm:gap-4 w-full min-w-0 overflow-hidden">
      {/* Donut Ring Visual */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
        <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90" viewBox="0 0 100 100">
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
          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight tabular-nums">{percentage}%</span>
          <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-slate-500">Present</span>
        </div>
      </div>

      {/* Legend & Stat Breakdowns */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-900 truncate">Present</span>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-700 tabular-nums shrink-0 ml-1">{present}d</span>
        </div>

        <div className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-rose-50/80 border border-rose-100/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold text-rose-900 truncate">Absent</span>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-rose-700 tabular-nums shrink-0 ml-1">{absent}d</span>
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
  const cleanSec = sec ? sec.toString().replace(/^section\s+/i, '').trim() : '';
  return `Class ${cleanClass} ${cleanSec}`.trim();
};

// ── Attendance Breakdown Modal Component ─────────────────────────────────────
const AttendanceBreakdownModal = ({ isOpen, onClose }) => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterSubject, setFilterSubject] = useState('');

  const { data, isLoading } = useGetMyAttendanceQuery({ month }, { skip: !isOpen });
  const attendance = data?.data || [];
  const summary = data?.summary || {};

  if (!isOpen) return null;

  const subjects = Array.isArray(attendance)
    ? [...new Map(
      attendance
        .filter(a => a?.subject && typeof a.subject === 'object' && a.subject._id)
        .map(a => [a.subject._id, a.subject])
    ).values()]
    : [];

  const filteredRecords = Array.isArray(attendance)
    ? attendance.filter(a =>
      !filterSubject ||
      (typeof a?.subject === 'object' ? a.subject?._id === filterSubject : a.subject === filterSubject) ||
      a.attendanceType === 'hall'
    )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Attendance Breakdown</h3>
              <p className="text-xs text-slate-500">Detailed month-wise and subject-wise logs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Summary Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Classes</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums tracking-tight">{summary.total || 0}</p>
            </div>
            <div className="p-4 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Present</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums tracking-tight">{summary.present || 0}</p>
            </div>
            <div className="p-4 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Absent</span>
              <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums tracking-tight">{summary.absent || 0}</p>
            </div>
            <div className="p-4 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Overall Rate</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums tracking-tight">{summary.percentage || 0}%</p>
            </div>
          </div>

          {/* Month & Subject Filters */}
          <div className="grid grid-cols-1 sm:flex sm:items-center sm:justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-600">Month:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 flex-1 sm:flex-initial"
              />
            </div>

            {subjects.length > 0 && (
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <label className="text-xs font-bold text-slate-600">Subject:</label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 flex-1 sm:flex-initial"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Detailed Logs Table */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading attendance breakdown...
              </div>
            ) : filteredRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type / Subject</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 hidden sm:table-cell">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRecords.map((rec) => {
                      const status = rec.status?.toLowerCase() || 'present';
                      const badgeStyle = status === 'present'
                        ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/70'
                        : status === 'absent'
                          ? 'bg-rose-50/80 text-rose-700 border-rose-200/70'
                          : status === 'late'
                            ? 'bg-amber-50/80 text-amber-700 border-amber-200/70'
                            : 'bg-indigo-50/80 text-indigo-700 border-indigo-200/70';

                      return (
                        <tr key={rec._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800 tabular-nums">
                            {rec.date ? new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {rec.subject?.name || (rec.attendanceType === 'hall' ? 'General Attendance' : 'Class Session')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle} capitalize`}>
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] hidden sm:table-cell">
                            {rec.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                No attendance logs found for this period.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <NavLink
            to="/student/attendance"
            onClick={onClose}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
          >
            Open Full Attendance Sheet <ExternalLink className="w-3.5 h-3.5" />
          </NavLink>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Notice Board Sidebar Widget ──────────────────────────────────────────────
const NoticeBoardWidget = () => {
  const { data, isLoading } = useGetStudentNoticesQuery();
  const noticeList = data?.data || data || [];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden h-[265px] flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Bell className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
            Notice Board
          </h3>
        </div>
        <NavLink
          to="/student/notices"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 hover:underline"
        >
          View all <ArrowRight className="w-3 h-3" />
        </NavLink>
      </div>

      {/* Content List */}
      <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-400 my-auto">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading notices...
          </div>
        ) : noticeList?.length > 0 ? (
          noticeList.slice(0, 3).map((notice, idx) => (
            <div key={notice._id || idx} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {notice.title || notice.heading || 'Notice Announcement'}
                </h4>
                {notice.createdAt && (
                  <span className="text-[11px] font-medium text-slate-400 shrink-0 tabular-nums">
                    {new Date(notice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              {(notice.content || notice.description) && (
                <p className="text-xs text-slate-500 line-clamp-1 pl-5">
                  {notice.content || notice.description}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center space-y-3">
            <img
              src="/undraw_pin-to-board_eoie.svg"
              alt="No active notices"
              className="h-28 w-auto opacity-70 object-contain grayscale"
            />
            <p className="text-sm text-slate-400 font-medium">
              No active notices on the bulletin board.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Student Fees Status Widget ───────────────────────────────────────────────
const StudentFeeStatusCard = ({ studentProfileId }) => {
  const { data, isLoading } = useGetStudentFeeSummaryQuery(studentProfileId);
  const info = data?.data;

  const totalDue = info?.totalDue || 0;
  const status = totalDue > 0 ? 'pending' : 'paid';

  const fmtAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs h-[220px] flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <CreditCard className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
            Fees Status
          </h3>
        </div>
        <NavLink
          to="/student/fees"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 hover:underline"
        >
          Details <ArrowRight className="w-3 h-3" />
        </NavLink>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-sm text-slate-400 my-auto">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
          Loading status...
        </div>
      ) : status === 'paid' ? (
        <div className="flex items-center gap-3 my-auto">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wider block">Fully Paid</span>
            <span className="text-xs text-slate-500 font-medium">All dues cleared</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3 my-auto w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-sm font-semibold text-slate-600">Pending Dues:</span>
            </div>
            <span className="text-base font-bold text-rose-600 tabular-nums">
              {fmtAmount(totalDue)}
            </span>
          </div>
          <NavLink
            to="/student/fees"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition duration-150 cursor-pointer"
          >
            Pay Now <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      )}
    </div>
  );
};

// ── Upcoming Exams Widget ────────────────────────────────────────────────────
const UpcomingExamsWidget = ({ classId }) => {
  const { data, isLoading } = useGetReportCardExamsQuery({ classId }, { skip: !classId });
  const examList = data?.data || [];

  // Filter exams that are upcoming or ongoing
  const today = new Date();
  const upcomingExams = examList.filter(e => e.startDate && new Date(e.startDate) >= today)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden h-[220px] flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
            <Award className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Upcoming Exams</h2>
        </div>
        <NavLink
          to="/student/report-card"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 hover:underline"
        >
          Schedule <ArrowRight className="w-3 h-3" />
        </NavLink>
      </div>

      {/* Content List */}
      <div className="divide-y divide-slate-100 overflow-y-auto flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-400 my-auto">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading exams...
          </div>
        ) : upcomingExams?.length > 0 ? (
          <div className="divide-y divide-slate-100 w-full flex-1 overflow-y-auto">
            {upcomingExams.slice(0, 2).map((exam, idx) => {
              const startDateFormatted = exam.startDate
                ? new Date(exam.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'TBD';

              return (
                <div key={exam._id || idx} className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                      {exam.type ? exam.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Exam'}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                      {exam.name}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-medium text-slate-400 block">Starts On</span>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">{startDateFormatted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-4 text-center space-y-2.5">
            <img
              src="/undraw_grading-papers_7fpu.svg"
              alt="No upcoming exams"
              className="h-24 w-auto opacity-70 object-contain grayscale"
            />
            <p className="text-sm text-slate-400 font-medium">
              No upcoming exams scheduled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const user = useSelector((s) => s.user?.user?.user);
  const { data: reportData, isLoading } = useGetMyReportQuery();
  const { data: assignmentsData } = useGetMyStudentAssignmentsQuery();
  const { data: profileData } = useGetMyProfileQuery();
  const classId = profileData?.data?.classId?._id;

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
    <div className="space-y-4 sm:space-y-6 w-full max-w-7xl mx-auto px-0.5 sm:px-4 pb-32">

      {/* ── Top Header Banner & Student Metadata ──────────────────────────── */}
      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Student Profile Avatar Icon */}
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
            <CircleUser className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-0.5">
              <span className="hidden sm:inline">Welcome Back, </span>
              <span className="text-indigo-600">{student?.name || 'Student'}</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{formatClassName(student?.class, student?.section)}</span>
              <span>Roll No: <strong className="text-slate-700 font-semibold tabular-nums">{student?.rollNo || 'N/A'}</strong></span>
            </p>
          </div>
        </div>
      </div>

      {/* Library overdue / due-soon reminder alert */}
      <LibraryReminder />

      {/* ── Equal Height & Width Grid Row: Attendance & Notice Board ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Donut Ring Card */}
        <div
          onClick={() => setShowAttendanceModal(true)}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md border-transparent hover:border-indigo-200 transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[265px]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 group-hover:text-indigo-600 transition-colors truncate whitespace-nowrap">
                Attendance Record
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                Breakdown <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
          <div className="my-auto py-2">
            <AttendanceDonutRing present={attendance?.present || 0} total={attendance?.totalClasses || 0} />
          </div>
        </div>

        {/* Notice Board Widget */}
        <NoticeBoardWidget />
      </div>

      {/* ── Row 2: Recent Assignments & Upcoming Exams ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent Assignments Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden h-[220px] flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Assignments</h2>
            </div>
            <NavLink
              to="/student/assignments"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 hover:underline"
            >
              View all <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {assignmentList?.length > 0 ? (
              assignmentList.slice(0, 2).map((item) => {
                const isSubmitted = item.isSubmitted;
                const isExpired = item.isExpired;
                const dueDateFormatted = item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No Due Date';

                return (
                  <div key={item._id} className="p-3 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase tracking-wider">
                          {item.subjectId?.name || 'Subject'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Due {dueDateFormatted}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {item.title || item.topic || 'Class Assignment'}
                      </h4>
                    </div>

                    <div className="shrink-0">
                      {isSubmitted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Submitted
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-4 text-center space-y-2.5">
                <img
                  src="/assets/undraw_all-checked_d3u6.svg"
                  alt="No pending assignments"
                  className="h-24 w-auto opacity-70 object-contain grayscale"
                />
                <p className="text-sm text-slate-400 font-medium">
                  All caught up! No pending assignments.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Exams Card */}
        <UpcomingExamsWidget classId={classId} />

      </div>

      {/* ── Fees Status Card ────────────────────────────────── */}
      <div className="w-full">
        <StudentFeeStatusCard studentProfileId={user?._id} />
      </div>

      {/* ── Standalone Mobile-Only Quick Nav Modules (Hidden on PC desktop where sidebar exists) ── */}
      <div className="space-y-3.5 w-full md:hidden">
        {/* Apply Leave */}
        <NavLink
          to="/student/leave"
          className="flex items-center justify-between p-4 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-300 hover:bg-slate-50/70 transition-all group cursor-pointer w-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <MdDescription size={22} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              Apply Leave
            </span>
          </div>
          <div className="flex items-center text-slate-400 group-hover:text-amber-600 transition-colors">
            <MdChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </NavLink>

        {/* Marks & Performance */}
        <NavLink
          to="/student/marks"
          className="flex items-center justify-between p-4 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-300 hover:bg-slate-50/70 transition-all group cursor-pointer w-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
              <MdBarChart size={22} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Marks & Performance
            </span>
          </div>
          <div className="flex items-center text-slate-400 group-hover:text-purple-600 transition-colors">
            <MdChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </NavLink>

        {/* Knowledge Center */}
        <NavLink
          to="/student/materials"
          className="flex items-center justify-between p-4 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-sky-300 hover:bg-slate-50/70 transition-all group cursor-pointer w-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-105 transition-transform">
              <MdMenuBook size={22} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
              Knowledge Center
            </span>
          </div>
          <div className="flex items-center text-slate-400 group-hover:text-sky-600 transition-colors">
            <MdChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </NavLink>

        {/* Academic Report Cards */}
        <NavLink
          to="/student/report-card"
          className="flex items-center justify-between p-4 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-violet-300 hover:bg-slate-50/70 transition-all group cursor-pointer w-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-105 transition-transform">
              <MdSchool size={22} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
              Academic Report Cards
            </span>
          </div>
          <div className="flex items-center text-slate-400 group-hover:text-violet-600 transition-colors">
            <MdChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </NavLink>

        {/* Library & Books */}
        <NavLink
          to="/student/library"
          className="flex items-center justify-between p-4 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 hover:bg-slate-50/70 transition-all group cursor-pointer w-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl group-hover:scale-105 transition-transform">
              <MdLocalLibrary size={22} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
              Library & Books
            </span>
          </div>
          <div className="flex items-center text-slate-400 group-hover:text-teal-600 transition-colors">
            <MdChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </NavLink>

        {/* Helpdesk & Complaints */}
        <NavLink
          to="/student/complaints"
          className="flex items-center justify-between p-4 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-red-300 hover:bg-slate-50/70 transition-all group cursor-pointer w-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl group-hover:scale-105 transition-transform">
              <MdReportProblem size={22} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors">
              Helpdesk & Complaints
            </span>
          </div>
          <div className="flex items-center text-slate-400 group-hover:text-red-600 transition-colors">
            <MdChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </NavLink>
      </div>

      {/* Attendance Breakdown Modal */}
      <AttendanceBreakdownModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
      />

    </div>
  );
};

export default StudentDashboard;
