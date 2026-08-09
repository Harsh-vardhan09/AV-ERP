// ══════════════════════════════════════════════════════════════════
// OASES — All Exams List (Phase 3)
// Route: /admin/oases/exams
//
// Features:
//   • Filter tabs: All | Draft | Active | In Progress | Approved | Closed
//   • Search by exam name
//   • Status badge per exam
//   • Smart action button based on status
//   • Loading skeleton + empty state + error state
// ══════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardList, Plus, ArrowLeft, Search,
  FileText, ChevronRight, AlertCircle, Loader2,
} from 'lucide-react';
import { useExamList } from '../hooks/queries/useExams';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import { OASES_ROLES } from '../utils/oasesConstants';

// ── Status config ─────────────────────────────────────────────────
const STATUS_META = {
  draft:      { label: 'Draft',       tabLabel: 'Draft',       color: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400'    },
  active:     { label: 'Active',      tabLabel: 'Active',      color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500'    },
  evaluation: { label: 'In Progress', tabLabel: 'In Progress', color: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
  locked:     { label: 'Locked',      tabLabel: 'Locked',      color: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500'  },
  approved:   { label: 'Approved',    tabLabel: 'Approved',    color: 'bg-green-100 text-green-700',    dot: 'bg-green-500'   },
  closed:     { label: 'Closed',      tabLabel: 'Closed',      color: 'bg-gray-100 text-gray-500',      dot: 'bg-gray-300'    },
  archived:   { label: 'Archived',    tabLabel: 'Archived',    color: 'bg-gray-100 text-gray-400',      dot: 'bg-gray-200'    },
};

const STATUS_ACTION = {
  draft:      { label: 'Continue Setup',   step: 1 },
  active:     { label: 'Upload Copies',    step: 2 },
  evaluation: { label: 'Monitor',          step: 4 },
  locked:     { label: 'Review & Approve', step: 5 },
  approved:   { label: 'View Results',     step: null, to: '/admin/oases/admin/reports' },
  closed:     { label: 'View Results',     step: null, to: '/admin/oases/admin/reports' },
};

const TABS = [
  { key: 'all',        label: 'All' },
  { key: 'draft',      label: 'Draft' },
  { key: 'active',     label: 'Active' },
  { key: 'evaluation', label: 'In Progress' },
  { key: 'locked',     label: 'Locked' },
  { key: 'approved',   label: 'Approved' },
  { key: 'closed',     label: 'Closed' },
];

// ── Status Badge ──────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

// ── Table row skeleton ────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[120, 80, 80, 60, 80, 80, 100].map((w, i) => (
      <td key={i} className="px-4 py-3">
        <div className={`h-4 bg-gray-100 rounded`} style={{ width: w }} />
      </td>
    ))}
  </tr>
);

// ── Main Component ────────────────────────────────────────────────
const ExamListPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]   = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: examData, isLoading, isError, refetch } = useExamList({ limit: 200 });
  const allExams = examData?.configs ?? [];

  // Filter by tab + search
  const filtered = useMemo(() => {
    let list = activeTab === 'all'
      ? allExams.filter(e => e.status !== 'archived')
      : allExams.filter(e => e.status === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(e =>
        e.examName?.toLowerCase().includes(q) ||
        e.subjectName?.toLowerCase().includes(q) ||
        e.subjectCode?.toLowerCase().includes(q) ||
        e.className?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allExams, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: 0 };
    allExams.forEach(e => {
      if (e.status !== 'archived') counts.all = (counts.all || 0) + 1;
      counts[e.status] = (counts[e.status] || 0) + 1;
    });
    return counts;
  }, [allExams]);

  const handleAction = (exam) => {
    const action = STATUS_ACTION[exam.status];
    if (!action) return;
    if (action.to) {
      navigate(action.to);
    } else {
      navigate(`/admin/oases/exam/${exam._id}?step=${action.step}`);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.SUPER_ADMIN]}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-start sm:items-center justify-between mb-6 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/oases')}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
                title="Back to Dashboard"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <ClipboardList size={20} className="text-indigo-600" />
                  All Exams
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {isLoading ? 'Loading…' : `${tabCounts.all ?? 0} exam${tabCounts.all !== 1 ? 's' : ''} total`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/oases/exam/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
            >
              <Plus size={16} />
              New Exam
            </button>
          </div>

          {/* ── Search + Filter tabs ────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">

            {/* Search */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search exams, subjects, classes…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50"
                />
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-0 overflow-x-auto px-4 pt-3 border-b border-gray-100">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition mr-1 ${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tabCounts[tab.key] != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Table ──────────────────────────────────────────── */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Marks</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    [0,1,2,3,4].map(i => <SkeletonRow key={i} />)
                  ) : isError ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <AlertCircle size={28} className="opacity-40" />
                          <p className="text-sm">Failed to load exams.</p>
                          <button onClick={() => refetch()} className="text-xs text-indigo-500 hover:underline">
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <FileText size={32} className="opacity-20" />
                          <p className="text-sm font-medium">
                            {searchQuery ? 'No exams match your search' : `No ${activeTab === 'all' ? '' : activeTab + ' '}exams yet`}
                          </p>
                          {activeTab === 'all' && !searchQuery && (
                            <button
                              onClick={() => navigate('/admin/oases/exam/new')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                            >
                              <Plus size={12} /> Create First Exam
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map(exam => {
                      const action = STATUS_ACTION[exam.status];
                      return (
                        <tr key={exam._id} className="hover:bg-gray-50 transition">
                          {/* Exam name */}
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800 text-sm">{exam.examName}</span>
                          </td>

                          {/* Class */}
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {exam.className || '—'}
                          </td>

                          {/* Subject */}
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {exam.subjectName || exam.subjectCode || '—'}
                          </td>

                          {/* Marks */}
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {exam.totalMarks ?? '—'}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={exam.status} />
                          </td>

                          {/* Created */}
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {formatDate(exam.createdAt)}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 text-right">
                            {action ? (
                              <button
                                onClick={() => handleAction(exam)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition whitespace-nowrap"
                              >
                                {action.label}
                                <ChevronRight size={12} />
                              </button>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            {!isLoading && !isError && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                Showing {filtered.length} of {tabCounts[activeTab] ?? tabCounts.all ?? 0} exam{filtered.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            )}
          </div>

        </div>
      </div>
    </OasesRoleGuard>
  );
};

export default ExamListPage;
