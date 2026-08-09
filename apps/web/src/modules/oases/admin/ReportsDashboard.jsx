// ══════════════════════════════════════════════════════════════════
// OASES — ReportsDashboard (Sprint 6)
// 4 Recharts charts + summary cards + generate/publish actions
// Uses useExamReport, useGenerateResults, usePublishResults
// ══════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import {
  BarChart2, Users, Lock, CheckCircle2, TrendingUp,
  Loader2, RefreshCw, Send, Download, AlertTriangle, ChevronDown,
} from 'lucide-react';
import {
  useExamReport, useGenerateResults, usePublishResults,
} from '../hooks/useReports';
import { useExamList } from '../hooks/queries/useExams';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import ResultsTable from './ResultsTable';
import { OASES_ROLES } from '../utils/oasesConstants';

// ── Colour palettes ───────────────────────────────────────────────
const GRADE_COLORS = {
  A1: '#10b981', A2: '#34d399', B1: '#60a5fa', B2: '#818cf8',
  B3: '#a78bfa',  C1: '#fbbf24', C2: '#fb923c', D: '#f87171', E: '#ef4444',
};
const STATUS_COLORS = {
  uploaded: '#94a3b8', assigned: '#60a5fa', in_progress: '#fbbf24',
  eval1_done: '#a78bfa', eval2_done: '#818cf8', conflict: '#f87171',
  locked: '#10b981', rejected: '#ef4444', ufm_flagged: '#f97316',
};
const LINE_COLOR = '#6366f1';

// ── Summary card ──────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
  const palette = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50 text-amber-600',
    blue:   'bg-blue-50 text-blue-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`rounded-xl p-3 ${palette[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ── Skeleton card ─────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
    <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
    <div className="h-8 bg-gray-200 rounded w-16" />
  </div>
);

const SkeletonChart = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
    <div className="h-4 bg-gray-100 rounded w-40 mb-4" />
    <div className="h-48 bg-gray-100 rounded-xl" />
  </div>
);

// ── Chart 1: Evaluation Progress (stacked bar by status) ──────────
const EvalProgressChart = ({ data = {} }) => {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count,
    fill: STATUS_COLORS[status] || '#94a3b8',
  }));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-4">Evaluation Progress by Status</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="status" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            <LabelList dataKey="count" position="top" style={{ fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Chart 2: Marks Distribution (10-mark buckets bar chart) ───────
const MarksDistChart = ({ data = {} }) => {
  const sorted = Object.entries(data)
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => {
      const aStart = parseInt(a.bucket);
      const bStart = parseInt(b.bucket);
      return aStart - bStart;
    });
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-4">Marks Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sorted} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="count" position="top" style={{ fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Chart 3: Grade Distribution (Pie chart) ───────────────────────
const GRADE_ORDER = ['A1','A2','B1','B2','C1','C2','D','E'];
const GradeChart = ({ data = {} }) => {
  const chartData = GRADE_ORDER
    .filter((g) => data[g] > 0)
    .map((g) => ({ name: g, value: data[g] }));
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
    const x = cx + (outerRadius + 18) * Math.cos(-midAngle * RADIAN);
    const y = cy + (outerRadius + 18) * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill={GRADE_COLORS[name]} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700 }}>
        {name}({value})
      </text>
    );
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-4">Grade Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={72}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={GRADE_COLORS[entry.name] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Chart 4: Daily Evaluator Activity (line chart) ────────────────
const ActivityChart = ({ data = [] }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <h3 className="text-sm font-bold text-gray-700 mb-4">Evaluator Activity (Daily Submissions)</h3>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d?.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line
          type="monotone"
          dataKey="count"
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// ══════════════════════════════════════════════════════════════════
// Main ReportsDashboard
// ══════════════════════════════════════════════════════════════════
const ReportsDashboard = () => {
  const [examId, setExamId] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data, isLoading, refetch } = useExamReport(examId);
  const generateMut   = useGenerateResults();
  const publishMut    = usePublishResults();

  // Exam config dropdown list
  const { data: examListData, isLoading: examsLoading } = useExamList({ limit: 100 });
  const examConfigs = examListData?.configs ?? examListData?.data ?? examListData?.examConfigs ?? [];

  const summary    = data?.summary      || {};
  const counts     = data?.counts       || {};
  const gradeData  = data?.gradeDistribution  || {};
  const marksData  = data?.marksDistribution  || {};
  const statusData = data?.statusDistribution || {};
  const dailyData  = data?.dailySubmissions   || [];

  const handleGenerate = useCallback(() => {
    if (!examId) return;
    generateMut.mutate(examId);
  }, [examId, generateMut]);

  const handlePublish = useCallback(() => {
    if (!examId) return;
    if (!window.confirm('Publishing results will reveal roll numbers. Proceed?')) return;
    publishMut.mutate(examId);
  }, [examId, publishMut]);

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.HEAD_EXAMINER]}>
      <div className="min-h-screen bg-gray-50 p-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">OASES Reports</h1>
              <p className="text-xs text-gray-400">Results, analytics & exports</p>
            </div>
          </div>
          {/* Exam selector dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 min-w-[240px] disabled:opacity-50 cursor-pointer"
                value={examId}
                onChange={(e) => { setExamId(e.target.value); setShowResults(false); }}
                disabled={examsLoading}
              >
                <option value="">{examsLoading ? 'Loading exams...' : '-- Select Exam --'}</option>
                {examConfigs.map((ec) => (
                  <option key={ec._id} value={ec._id}>
                    {ec.examName} · {ec.subjectCode || ec.subjectName} · {ec.academicYear}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              onClick={() => refetch()}
              disabled={!examId}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition"
              title="Refresh report"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {!examId ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            <BarChart2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm">Select an exam from the dropdown to load report data</p>
          </div>
        ) : (
          <>
            {/* ── Action buttons ──────────────────────────────────── */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleGenerate}
                disabled={generateMut.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {generateMut.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <TrendingUp className="w-4 h-4" />}
                Generate Grades &amp; Ranks
              </button>
              <button
                onClick={handlePublish}
                disabled={publishMut.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {publishMut.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
                Publish Results
              </button>
              <button
                onClick={() => setShowResults((s) => !s)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
              >
                <Users className="w-4 h-4" />
                {showResults ? 'Hide' : 'View'} Results Table
              </button>
            </div>

            {/* ── Summary cards ───────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  <SummaryCard icon={Users}        label="Total Sheets"  value={counts.totalSheets}   color="blue" />
                  <SummaryCard icon={Lock}         label="Locked"        value={counts.lockedSheets}  color="indigo" />
                  <SummaryCard icon={CheckCircle2} label="Published"     value={counts.publishedCount} color="green" />
                  <SummaryCard
                    icon={TrendingUp}
                    label="Pass Rate"
                    value={`${summary.passRate ?? '—'}%`}
                    sub={`Avg: ${summary.avg ?? '—'} · High: ${summary.highest ?? '—'}`}
                    color="amber"
                  />
                </>
              )}
            </div>

            {/* ── Generate results notice ─────────────────────────── */}
            {!isLoading && counts.total === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl mb-6">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                No result sheets found. Click "Generate Grades &amp; Ranks" after locking all sheets.
              </div>
            )}

            {/* ── 4 Charts ────────────────────────────────────────── */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <EvalProgressChart data={statusData} />
                <MarksDistChart    data={marksData} />
                <GradeChart        data={gradeData} />
                <ActivityChart     data={dailyData} />
              </div>
            )}

            {/* ── Results Table ────────────────────────────────────── */}
            {showResults && <ResultsTable examId={examId} />}
          </>
        )}
      </div>
    </OasesRoleGuard>
  );
};

export default ReportsDashboard;
