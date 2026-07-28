// ══════════════════════════════════════════════════════════════════
// TeacherOasesPage — Teacher Evaluation Queue (Polished, Phase 9)
// Route: /teacher/oases  OR  /admin/oases (if teacher accessed via admin path)
//
// Shows:
//   • Daily stats (pending, in-progress, done today)
//   • Sheets grouped by exam with progress bars
//   • Relative links → resolves to evaluator/sheet/:id
//     (works for both /teacher/oases/* and /admin/oases/*)
//
// Data: useEvalQueue → GET /api/v1/oases/evaluation/queue
// ══════════════════════════════════════════════════════════════════
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Loader2, ArrowRight,
  Clock, BookOpen, AlertCircle, CheckCircle2,
  TrendingUp, FileText,
} from 'lucide-react';
import { useEvalQueue } from '../hooks/queries/useEvalQueue';
import SheetStatusBadge from '../shared/SheetStatusBadge';
import { useSelector } from 'react-redux';

// ── Progress bar ──────────────────────────────────────────────────
const ProgressBar = ({ percent, size = 'md' }) => {
  const pct = Math.min(100, Math.max(0, percent || 0));
  const h   = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className={`bg-gray-100 rounded-full ${h} overflow-hidden`}
      style={{ width: size === 'sm' ? '60px' : '80px' }}>
      <div
        className={`h-full rounded-full transition-all ${
          pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-indigo-500' : 'bg-amber-400'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className={`rounded-xl border p-4 ${color}`}>
    <div className="flex items-center gap-2 mb-1">
      <Icon size={15} className="opacity-70" />
      <p className="text-xs font-semibold opacity-70">{label}</p>
    </div>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

// ── Exam group header ──────────────────────────────────────────────
const ExamGroupHeader = ({ examName, subjectName, done, total }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-700 truncate">{examName || 'Unknown Exam'}</p>
        {subjectName && <p className="text-xs text-gray-400 mt-0.5 truncate">{subjectName}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ProgressBar percent={pct} size="sm" />
        <span className="text-xs font-mono text-gray-400">{done}/{total}</span>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────
const TeacherOasesPage = () => {
  const { data, isLoading, isFetching, isError } = useEvalQueue();
  const erpUser = useSelector(state => state?.user?.user?.user);

  const sheets     = data?.sheets     || [];
  const total      = data?.total      || 0;
  const dailyCount = data?.dailyCount || 0;

  const inProgress = sheets.filter(s => s.progressPercent > 0 && s.progressPercent < 100).length;
  const completed  = sheets.filter(s => s.progressPercent >= 100).length;
  const pending    = total - completed;

  // Group sheets by exam
  const byExam = sheets.reduce((acc, sheet) => {
    const key = sheet.examConfigId || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        examName:    sheet.examName    || 'Unknown Exam',
        subjectName: sheet.subjectName || '',
        sheets:      [],
      };
    }
    acc[key].sheets.push(sheet);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-5 py-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen size={20} className="text-violet-600" />
              My Evaluation Queue
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {erpUser?.firstName ? `Welcome, ${erpUser.firstName}! ` : ''}
              {total > 0 ? `${total} sheet${total > 1 ? 's' : ''} assigned to you` : 'No sheets assigned yet'}
            </p>
          </div>
          {isFetching && !isLoading && (
            <Loader2 size={16} className="text-violet-400 animate-spin" />
          )}
        </div>

        {/* ── Stats strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Pending"     value={pending}    icon={Clock}         color="bg-amber-50 border-amber-100 text-amber-700" />
          <StatCard label="In Progress" value={inProgress} icon={TrendingUp}    color="bg-indigo-50 border-indigo-100 text-indigo-700" />
          <StatCard label="Done Today"  value={dailyCount} icon={CheckCircle2}  color="bg-green-50 border-green-100 text-green-700" />
        </div>

        {/* ── Sheet queue ─────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-violet-400">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm text-gray-400">Loading your queue…</p>
          </div>

        ) : isError ? (
          <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
            <AlertCircle size={32} className="text-red-300" />
            <p className="text-sm">Could not load your queue. Please refresh the page.</p>
          </div>

        ) : sheets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center gap-4 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
              <ClipboardList size={28} className="opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-gray-500">No sheets assigned to you</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                The admin will assign answer sheets to you once theyʼre uploaded and processed.
              </p>
            </div>
          </div>

        ) : (
          <div className="space-y-4">
            {/* All done banner */}
            {completed === total && total > 0 && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-2">
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                <p className="text-sm font-medium text-green-700">
                  All {total} sheets complete. Great work! 🎉
                </p>
              </div>
            )}

            {Object.entries(byExam).map(([examKey, group]) => {
              const groupDone = group.sheets.filter(s => s.progressPercent >= 100).length;
              return (
                <div key={examKey} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <ExamGroupHeader
                    examName={group.examName}
                    subjectName={group.subjectName}
                    done={groupDone}
                    total={group.sheets.length}
                  />

                  <div className="divide-y divide-gray-50">
                    {group.sheets.map(sheet => {
                      const pct    = sheet.progressPercent || 0;
                      const isDone = pct >= 100;
                      return (
                        <Link
                          key={sheet._id}
                          to={`evaluator/sheet/${sheet._id}`}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition group"
                        >
                          {/* Left: code + metadata */}
                          <div className="flex items-center gap-4 min-w-0">
                            {/* Anonymous code pill */}
                            <span className={`font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 transition ${
                              isDone
                                ? 'bg-green-100 text-green-700 group-hover:bg-green-200'
                                : 'bg-violet-50 text-violet-700 group-hover:bg-violet-100'
                            }`}>
                              {sheet.anonymousCode || '—'}
                            </span>

                            {/* Sheet info */}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">
                                {sheet.totalPages} page{sheet.totalPages !== 1 ? 's' : ''}
                                {sheet.draftSavedAt && (
                                  <span className="ml-2 text-xs text-green-600 font-normal">
                                    <Clock size={10} className="inline mr-0.5 -mt-0.5" />
                                    Draft saved
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Right: progress + status + arrow */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <ProgressBar percent={pct} />
                              <span className="text-xs font-mono text-gray-400 w-7 text-right">
                                {pct}%
                              </span>
                            </div>
                            <SheetStatusBadge status={sheet.status} />
                            <ArrowRight
                              size={14}
                              className={`transition ${
                                isDone
                                  ? 'text-green-400'
                                  : 'text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5'
                              }`}
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Footer count */}
            <p className="text-center text-xs text-gray-400 pt-2 pb-4">
              {total} total · {completed} completed · {inProgress} in progress
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherOasesPage;
