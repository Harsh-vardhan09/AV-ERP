import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FileText, CheckCircle2, Clock, BarChart2,
  Upload, Users, AlertCircle, BookOpen, Lock,
  ClipboardCheck, ChevronDown, Loader2, ListOrdered,
} from 'lucide-react';
import {
  useGetExamsQuery,
  useGetActiveSessionQuery,
  useStartExamEvaluationMutation,
  useCompleteExamEvaluationMutation,
} from '@shared/lib/api/adminApi';
import { setSelectedExamId } from './store/examSlice';
import useOasesAuth from './hooks/useOasesAuth';
import OasesRoleGuard from './shared/OasesRoleGuard';
import { OASES_ROLES, SHEET_STATUS_LABELS, SHEET_STATUS_COLORS } from './utils/oasesConstants';
import { useCheckedSheets } from './hooks/queries/useCheckedSheets';
import toast from 'react-hot-toast';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:     { label: 'Pending',     color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400'  },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, isLoading }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      {isLoading
        ? <div className="h-6 w-10 bg-gray-100 rounded animate-pulse mt-1" />
        : <p className="text-2xl font-bold text-gray-800 mt-0.5">{value ?? 0}</p>
      }
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

const QuickAction = ({ icon: Icon, label, to, color }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition hover:shadow-sm ${color}`}
  >
    <Icon size={16} />
    {label}
  </Link>
);

// ── Sheet status pill ─────────────────────────────────────────────────────────
const SheetPill = ({ status }) => {
  const label = SHEET_STATUS_LABELS[status] || status;
  const cls   = SHEET_STATUS_COLORS[status]  || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
};

// ── Checked Copies Tab ────────────────────────────────────────────────────────
const CheckedCopiesTab = ({ selectedExamId, allExams }) => {
  const [filterExam, setFilterExam] = useState(selectedExamId || '');

  const { data, isLoading, isFetching } = useCheckedSheets(
    filterExam ? { examId: filterExam, limit: 50 } : { limit: 50 }
  );

  const sheets = data?.sheets || [];
  const total  = data?.total  || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-green-600" />
          <h3 className="font-semibold text-gray-800">Checked Copies</h3>
          {total > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              {total}
            </span>
          )}
          {isFetching && <Loader2 size={14} className="text-gray-400 animate-spin" />}
        </div>
        {/* Filter by exam */}
        <div className="relative">
          <select
            value={filterExam}
            onChange={(e) => setFilterExam(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 pr-7 appearance-none bg-gray-50 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <option value="">All Exams</option>
            {allExams.map((e) => (
              <option key={e._id} value={e._id}>{e.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading checked copies…</div>
      ) : sheets.length === 0 ? (
        <div className="p-10 text-center">
          <ClipboardCheck size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No checked copies yet.</p>
          <p className="text-xs text-gray-300 mt-1">Sheets will appear here once teachers submit evaluations.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Exam</th>
                <th className="px-5 py-3 text-left">Class · Section</th>
                <th className="px-5 py-3 text-left">Subject</th>
                <th className="px-5 py-3 text-left">Evaluator</th>
                <th className="px-5 py-3 text-right">Marks</th>
                <th className="px-5 py-3 text-left">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sheets.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-semibold text-indigo-700">
                      {s.anonymousCode || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <SheetPill status={s.status} />
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-gray-700 text-xs font-medium">{s.examName || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-gray-600 text-xs">
                      {s.classId?.name || '—'}
                      {s.sectionId?.name ? ` · ${s.sectionId.name}` : ''}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-gray-600 text-xs">{s.subjectId?.name || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-gray-700 text-xs">{s.teacherName || '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {s.marks != null
                      ? <span className="font-bold text-green-700">{s.marks}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-gray-400 text-xs">
                      {s.submittedAt
                        ? new Date(s.submittedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' })
                        : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Main OasesDashboard
// ══════════════════════════════════════════════════════════════════
const OasesDashboard = () => {
  const dispatch = useDispatch();
  const { isAdmin, isEvaluator, isHeadExaminer } = useOasesAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'checked'

  const { data: activeSessionData } = useGetActiveSessionQuery();
  const sessionId = activeSessionData?.data?._id;

  const {
    data: examResponse,
    isLoading,
    isError,
  } = useGetExamsQuery({ session: sessionId }, { skip: !sessionId });

  const allExams = Array.isArray(examResponse?.data) ? examResponse.data : [];

  const selectedExamId = useSelector(state => state.exam.selectedExamId);
  const selectedExam   = allExams.find(e => e._id === selectedExamId) ?? null;

  const [startEvaluation,    { isLoading: isStarting }]   = useStartExamEvaluationMutation();
  const [completeEvaluation, { isLoading: isCompleting }] = useCompleteExamEvaluationMutation();

  // Redirect evaluator roles away from this dashboard view
  if (isEvaluator || isHeadExaminer) {
    return <Navigate to="evaluator/queue" replace />;
  }

  // Derived counts
  const totalExams      = allExams.length;
  const pendingExams    = allExams.filter(e => e.evaluationStatus === 'pending').length;
  const inProgressExams = allExams.filter(e => e.evaluationStatus === 'in_progress').length;
  const completedExams  = allExams.filter(e => e.evaluationStatus === 'completed').length;

  const handleStartEvaluation = async () => {
    if (!selectedExam) return;
    try {
      await startEvaluation(selectedExam._id).unwrap();
      toast.success('Evaluation started');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to start evaluation');
    }
  };

  const handleCompleteEvaluation = async () => {
    if (!selectedExam) return;
    if (!window.confirm('Mark evaluation as complete? This will lock the exam and cannot be undone.')) return;
    try {
      await completeEvaluation(selectedExam._id).unwrap();
      toast.success('Evaluation completed and locked');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to complete evaluation');
    }
  };

  const classNamesStr = selectedExam
    ? (selectedExam.classIds || []).map(c => c?.name || '').filter(Boolean).join(', ') || '—'
    : '';

  // ── Tab bar labels ──────────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'Overview',        icon: BarChart2 },
    { id: 'checked',  label: 'Checked Copies',  icon: ClipboardCheck },
  ];

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.SUPER_ADMIN, OASES_ROLES.EVALUATOR, OASES_ROLES.HEAD_EXAMINER, OASES_ROLES.SCAN_OPERATOR]}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1200px] mx-auto px-6 py-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                OASES — Answer Sheet Evaluation
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Centralized evaluation workflow and status management
              </p>
            </div>
          </div>

          {/* ── No session warning ── */}
          {!sessionId && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ No active session found. Please activate a session first.
            </div>
          )}

          {/* ── Tabs (admin only) ── */}
          {isAdmin && (
            <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white shadow-sm text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: OVERVIEW
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <>
              {/* ── Stats Cards (admin only) ── */}
              {isAdmin && sessionId && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard icon={FileText}     label="Total Exams" value={totalExams}       color="bg-indigo-50 text-indigo-600" isLoading={isLoading} />
                  <StatCard icon={Clock}        label="Pending"     value={pendingExams}     color="bg-gray-50 text-gray-500"     isLoading={isLoading} />
                  <StatCard icon={AlertCircle}  label="In Progress" value={inProgressExams}  color="bg-amber-50 text-amber-500"   isLoading={isLoading} />
                  <StatCard icon={CheckCircle2} label="Completed"   value={completedExams}   color="bg-green-50 text-green-600"   isLoading={isLoading} />
                </div>
              )}

              {/* ── Exam Selection Dropdown (admin only) ── */}
              {isAdmin && sessionId && (
                <div className="mb-8 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Exam to Manage
                  </label>

                  {isLoading ? (
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-1/2" />
                  ) : isError ? (
                    <p className="text-sm text-red-500">Failed to load exams. Please refresh.</p>
                  ) : allExams.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      No exams found for the active session. Create exams from the{' '}
                      <a href="/admin/exams" className="text-indigo-600 underline">Exams page</a>.
                    </p>
                  ) : (
                    <select
                      className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      value={selectedExamId || ''}
                      onChange={e => dispatch(setSelectedExamId(e.target.value || null))}
                    >
                      <option value="">-- Select an Exam --</option>
                      {allExams.map(exam => (
                        <option key={exam._id} value={exam._id}>
                          {exam.name} ({(exam.type || '').replace(/_/g, ' ')}) — {(exam.evaluationStatus || 'pending').replace(/_/g, ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* ── Contextual Action Area ── */}
                  {selectedExam && (
                    <div className="mt-6 p-5 border border-indigo-100 rounded-lg bg-indigo-50/50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-indigo-900">{selectedExam.name}</h3>
                          <p className="text-sm text-indigo-700 opacity-80 mt-1 capitalize">
                            {(selectedExam.type || '').replace(/_/g, ' ')}
                            {classNamesStr ? ` • ${classNamesStr}` : ''}
                          </p>
                        </div>
                        <StatusBadge status={selectedExam.evaluationStatus} />
                      </div>

                      {/* PENDING */}
                      {selectedExam.evaluationStatus === 'pending' && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-200 rounded-lg bg-white">
                          <AlertCircle size={32} className="text-indigo-300 mb-2" />
                          <p className="text-gray-600 text-sm mb-4 text-center">
                            This exam's evaluation has not started yet.<br />
                            Start the evaluation process to enable answer sheet uploading and marking.
                          </p>
                          <div className="flex gap-3 flex-wrap justify-center">
                            <button
                              onClick={handleStartEvaluation}
                              disabled={isStarting}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                              {isStarting ? 'Starting...' : 'Start Evaluation'}
                            </button>
                            <Link
                              to={`/admin/oases/admin/scheme/${selectedExam._id}`}
                              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition shadow-sm flex items-center gap-2"
                            >
                              <ListOrdered size={16} />
                              Setup Question Scheme
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* IN PROGRESS */}
                      {selectedExam.evaluationStatus === 'in_progress' && (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            Evaluation is currently active. You can manage uploads and assignments.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                            <QuickAction icon={Upload}         label="Upload Queue"    to="/admin/oases/scan-operator/upload"  color="bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50" />
                            <QuickAction icon={Users}          label="Assignments"     to="/admin/oases/admin/assignments"     color="bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50" />
                            <QuickAction icon={BarChart2}      label="Progress"        to="/admin/oases/admin/reports"         color="bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50" />
                            <QuickAction icon={ListOrdered}    label="Question Scheme" to={`/admin/oases/admin/scheme/${selectedExam._id}`} color="bg-white border-violet-200 text-violet-700 hover:bg-violet-50" />
                            <button
                              onClick={() => setActiveTab('checked')}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium bg-white border-green-200 text-green-700 hover:bg-green-50 transition"
                            >
                              <ClipboardCheck size={16} />
                              Checked Copies
                            </button>
                          </div>
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-amber-800">Complete Evaluation</p>
                              <p className="text-xs text-amber-700">
                                Once complete, exam marks are locked and report cards become available.
                              </p>
                            </div>
                            <button
                              onClick={handleCompleteEvaluation}
                              disabled={isCompleting}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition shadow-sm whitespace-nowrap ml-4 disabled:opacity-50"
                            >
                              {isCompleting ? 'Completing...' : 'Mark as Completed'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* COMPLETED */}
                      {selectedExam.evaluationStatus === 'completed' && (
                        <div>
                          <div className="flex items-center justify-center p-6 bg-green-50 border border-green-200 rounded-lg text-green-800 mb-4">
                            <div className="flex items-center gap-3">
                              <Lock size={24} className="text-green-600" />
                              <div>
                                <p className="font-bold">Evaluation Completed</p>
                                <p className="text-sm text-green-700 opacity-90 mt-0.5">
                                  All editing actions are locked. Report cards are now available for generation.
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('checked')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                          >
                            <ClipboardCheck size={14} />
                            View All Checked Copies
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: CHECKED COPIES
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'checked' && isAdmin && (
            <CheckedCopiesTab selectedExamId={selectedExamId} allExams={allExams} />
          )}

        </div>
      </div>
    </OasesRoleGuard>
  );
};

export default OasesDashboard;
