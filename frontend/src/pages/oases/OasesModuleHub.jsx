// ══════════════════════════════════════════════════════════════════
// OASES — OasesModuleHub (Module Entry Point)
// Wraps the entire OASES feature tree with its own QueryClientProvider
// so the OASES cache is fully isolated from existing Redux state.
// Pattern: identical to FeeModuleHub.jsx
// ══════════════════════════════════════════════════════════════════
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import oasesQueryClient from './lib/queryClient';
import { useOasesSocket } from './hooks/useSocket';
import useOasesAuth from './hooks/useOasesAuth';
import { OASES_ROLES } from './utils/oasesConstants';

// ── Lazy-load all OASES pages ─────────────────────────────────────
const OasesDashboard    = lazy(() => import('./OasesDashboard'));

// New wizard pages (Phase 2+)
const ExamListPage      = lazy(() => import('./admin/ExamListPage'));    // Phase 3
const ExamWizardPage    = lazy(() => import('./admin/ExamWizardPage'));  // Phase 4–8
const TeacherOasesPage  = lazy(() => import('./evaluator/TeacherOasesPage')); // Phase 9

// Admin pages
const ExamSetup              = lazy(() => import('./admin/ExamSetup'));
const QuestionSchemePage     = lazy(() => import('./admin/QuestionSchemePage'));  // Sprint 1
const SheetManagementPage    = lazy(() => import('./admin/SheetManagementPage')); // Sprint 2
const AssignmentManager      = lazy(() => import('./admin/AssignmentManager'));
const ReportsDashboard       = lazy(() => import('./admin/ReportsDashboard'));    // Sprint 6

// Scan Operator pages
const UploadQueue       = lazy(() => import('./scan-operator/UploadQueue'));

// Evaluator pages
// EvalQueue is legacy (hardcoded absolute paths) — TeacherOasesPage is the current component
const SheetViewer       = lazy(() => import('./evaluator/SheetViewer'));

// Head Examiner pages
const ConflictResolutionPage = lazy(() => import('./head-examiner/ConflictResolutionPage'));

// ── Loading fallback ──────────────────────────────────────────────
const OasesLoader = () => (
  <div className="flex items-center justify-center h-64 text-indigo-400">
    <Loader2 className="w-8 h-8 animate-spin" />
    <span className="ml-3 text-sm">Loading OASES…</span>
  </div>
);

// ── Socket initialiser (inner component — inside provider) ────────
const OasesSocketBridge = () => {
  useOasesSocket(true); // connects and wires React Query invalidations
  return null;
};

// ── Role-aware index — Admin gets dashboard, Teacher gets queue ───
const OasesIndex = () => {
  // Belt-and-suspenders: check BOTH sources
  const erpUser    = useSelector(state => state?.user?.user?.user);
  const erpRole    = erpUser?.role;     // 'admin' | 'teacher'
  const { isEvaluator, isHeadExaminer } = useOasesAuth();

  // Teachers identified by ERP role OR mapped OASES role go to their queue
  if (erpRole === 'teacher' || isEvaluator || isHeadExaminer) {
    return <TeacherOasesPage />;
  }
  return <OasesDashboard />;
};

// ── Main Hub Component ────────────────────────────────────────────
const OasesModuleHub = () => {
  const isOasesEnabled = useSelector((state) => state?.oasesSettings?.isOasesEnabled ?? false);

  useEffect(() => {
    if (!isOasesEnabled) {
      oasesQueryClient.clear();
    }
  }, [isOasesEnabled]);

  if (!isOasesEnabled) {
    return (
      <div className="p-8 rounded-xl bg-red-50 border border-red-200 text-red-700 text-center mx-auto max-w-2xl mt-10">
        <h2 className="text-lg font-semibold">OASES module is disabled</h2>
        <p className="mt-2 text-sm text-red-600">Enable OASES from School Settings to access evaluation workflows.</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={oasesQueryClient}>
      {/* Socket bridge — runs inside QueryClientProvider so it can call useQueryClient() */}
      <OasesSocketBridge />

      <Suspense fallback={<OasesLoader />}>
        <Routes>
          {/* Index: Admin → dashboard, Teacher/Evaluator → queue */}
          <Route index element={<OasesIndex />} />

          {/* /admin/oases/dashboard — kept for backward compat */}
          <Route path="dashboard"                    element={<OasesDashboard />} />

          {/* New wizard flow (Phases 2–8) */}
          <Route path="exams"                        element={<ExamListPage />} />
          <Route path="exam/new"                     element={<ExamWizardPage />} />
          <Route path="exam/:examId"                 element={<ExamWizardPage />} />

          {/* Admin */}
          <Route path="admin/exam-setup"             element={<ExamSetup />} />
          <Route path="admin/scheme/:examId"         element={<QuestionSchemePage />} />
          <Route path="admin/sheets/:examId"         element={<SheetManagementPage />} />  {/* Sprint 2 */}
          <Route path="admin/assignments"            element={<AssignmentManager />} />
          <Route path="admin/reports"                element={<ReportsDashboard />} />
          <Route path="admin/conflicts"              element={<ConflictResolutionPage />} />
          <Route path="admin/audit"                  element={<ReportsDashboard />} />

          {/* Scan Operator */}
          <Route path="scan-operator/upload"         element={<UploadQueue />} />

          {/* Evaluator — P2 fix: use TeacherOasesPage (correct relative routing) */}
          <Route path="evaluator/queue"              element={<TeacherOasesPage />} />
          <Route path="evaluator/sheet/:sheetId"     element={<SheetViewer />} />

          {/* Head Examiner */}
          <Route path="head-examiner/conflicts"      element={<ConflictResolutionPage />} />
          <Route path="head-examiner/final"          element={<ReportsDashboard />} />
        </Routes>
      </Suspense>

      {/* React Query Devtools — only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default OasesModuleHub;
