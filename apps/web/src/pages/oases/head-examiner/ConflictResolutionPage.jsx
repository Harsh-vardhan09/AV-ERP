// ══════════════════════════════════════════════════════════════════
// OASES — ConflictResolutionPage (Head Examiner Panel, Sprint 5)
// Top: exam selector + conflict queue table
// Bottom: sidebar sheet viewer + 3-column marks comparison
// P4 fix: exam selector upgraded from raw text input → proper dropdown
// ══════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { GitMerge, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { useConflictList } from '../hooks/useModerate';
import { useExamList } from '../hooks/queries/useExams'; // P4 fix
import ConflictDetailPanel from './ConflictDetailPanel';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import { OASES_ROLES } from '../utils/oasesConstants';

// ── Difference badge ──────────────────────────────────────────────
const DiffBadge = ({ diff }) => {
  const color = diff > 10 ? 'text-red-600 bg-red-50' : diff > 5 ? 'text-amber-600 bg-amber-50' : 'text-green-700 bg-green-50';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      Δ {diff?.toFixed(1) ?? '—'}
    </span>
  );
};

// ── Conflict queue row ────────────────────────────────────────────
const ConflictRow = ({ sheet, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition rounded-xl
      ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-50'}`}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-800 truncate">{sheet.anonymousCode}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        E1: <strong>{sheet.e1Total ?? '—'}</strong> · E2: <strong>{sheet.e2Total ?? '—'}</strong>
      </p>
    </div>
    {sheet.difference !== null && <DiffBadge diff={sheet.difference} />}
    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
  </button>
);

// ── Main page ─────────────────────────────────────────────────────
const ConflictResolutionPage = () => {
  const [examId,          setExamId]          = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState(null);

  // P4 fix: load exam list for dropdown — was previously a raw text input
  const { data: examListData, isLoading: examsLoading } = useExamList({ limit: 200 });
  const examConfigs = examListData?.configs ?? [];
  const selectedExam = examConfigs.find(e => e._id === examId);

  const { data, isLoading } = useConflictList(examId);
  const sheets = data?.sheets || [];

  return (
    <OasesRoleGuard roles={[OASES_ROLES.HEAD_EXAMINER, OASES_ROLES.SCHOOL_ADMIN]}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">

        {/* ── Left sidebar: queue ─────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <GitMerge className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold text-gray-800">Conflict Queue</h2>
            </div>

            {/* P4 fix: exam dropdown — previously was a raw <input> for exam ID */}
            <div className="relative">
              <select
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-gray-700
                  disabled:opacity-50 cursor-pointer"
                value={examId}
                onChange={(e) => { setExamId(e.target.value); setSelectedSheetId(null); }}
                disabled={examsLoading}
              >
                <option value="">{examsLoading ? 'Loading exams…' : '— Select Exam —'}</option>
                {examConfigs.map((ec) => (
                  <option key={ec._id} value={ec._id}>
                    {ec.examName} · {ec.subjectCode || ec.subjectName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Selected exam metadata pill */}
            {selectedExam && (
              <p className="text-[10px] text-indigo-500 mt-1.5 truncate">
                {selectedExam.classLevel} · {selectedExam.totalMarks} marks · {selectedExam.academicYear}
              </p>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {isLoading ? (
              <div className="flex justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : !examId ? (
              <p className="text-xs text-center text-gray-400 py-8">Select an exam to load conflicts.</p>
            ) : sheets.length === 0 ? (
              <div className="text-center py-8">
                <GitMerge className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No conflicts found for this exam.</p>
              </div>
            ) : (
              sheets.map((s) => (
                <ConflictRow
                  key={s.sheetId}
                  sheet={s}
                  isSelected={selectedSheetId === s.sheetId}
                  onClick={() => setSelectedSheetId(s.sheetId)}
                />
              ))
            )}
          </div>

          {/* Count footer */}
          {sheets.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              {sheets.length} conflict{sheets.length !== 1 ? 's' : ''} pending
            </div>
          )}
        </aside>

        {/* ── Right: detail panel ──────────────────────────────── */}
        <main className="flex-1 overflow-hidden">
          {selectedSheetId ? (
            <ConflictDetailPanel
              sheetId={selectedSheetId}
              examId={examId}
              onResolved={() => setSelectedSheetId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <GitMerge className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm">Select a conflict sheet from the queue</p>
              <p className="text-xs mt-1 opacity-60">You'll see both evaluators' marks side by side</p>
            </div>
          )}
        </main>
      </div>
    </OasesRoleGuard>
  );
};

export default ConflictResolutionPage;
