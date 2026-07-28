// ══════════════════════════════════════════════════════════════════
// OASES — ConflictDetailPanel (Head Examiner, Sprint 5)
// 3-column marks table: Eval1 | Eval2 | Your Decision
// Conflict rows highlighted red. Accept E1/E2 bulk-fill buttons.
// ══════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';
import {
  Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Copy, Send, FileText,
} from 'lucide-react';
import { useConflictSheetData, useResolveConflict } from '../hooks/useModerate';
import { validateAllMarks } from '../utils/marksValidation';
import toast from 'react-hot-toast';

// ── Marks cell ────────────────────────────────────────────────────
const MarkCell = ({ mark, maxMarks, isConflict }) => {
  if (mark === null || mark === undefined) return <span className="text-gray-300">—</span>;
  return (
    <span className={`font-semibold ${isConflict ? 'text-red-600' : 'text-gray-700'}`}>
      {mark.isNA ? <em className="font-normal text-gray-400">N/A</em> : `${mark.marksGiven ?? 0} / ${maxMarks}`}
    </span>
  );
};

// ── HE editable cell ──────────────────────────────────────────────
const HECell = ({ questionNo, maxMarks, isNA, value, onChange }) => {
  if (isNA) return <span className="text-xs text-gray-400 italic">N/A</span>;
  return (
    <input
      type="number"
      min={0}
      max={maxMarks}
      step={0.5}
      value={value ?? ''}
      onChange={(e) => onChange(questionNo, e.target.value === '' ? '' : Number(e.target.value))}
      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center"
    />
  );
};

// ── Section block ─────────────────────────────────────────────────
const SectionBlock = ({ section, e1Map, e2Map, heMap, onHeChange }) => {
  const [open, setOpen] = useState(true);

  const e1Total = section.questions.reduce((s, q) => {
    const m = e1Map[q.questionNo];
    return s + (m && !m.isNA ? (m.marksGiven || 0) : 0);
  }, 0);
  const e2Total = section.questions.reduce((s, q) => {
    const m = e2Map[q.questionNo];
    return s + (m && !m.isNA ? (m.marksGiven || 0) : 0);
  }, 0);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-bold text-gray-700"
      >
        <span>Section {section.name}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 font-normal">E1: {e1Total} · E2: {e2Total}</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase bg-gray-50/60">
                <th className="px-4 py-2 text-left w-10">Q</th>
                <th className="px-4 py-2 text-left">Max</th>
                <th className="px-4 py-2 text-center text-blue-600">Evaluator 1</th>
                <th className="px-4 py-2 text-center text-purple-600">Evaluator 2</th>
                <th className="px-4 py-2 text-center text-indigo-700 font-bold">Your Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {section.questions.map((q) => {
                const m1 = e1Map[q.questionNo];
                const m2 = e2Map[q.questionNo];
                const v1 = m1?.isNA ? 0 : (m1?.marksGiven ?? null);
                const v2 = m2?.isNA ? 0 : (m2?.marksGiven ?? null);
                const isConflict = v1 !== null && v2 !== null && v1 !== v2;
                const isNA = m1?.isNA && m2?.isNA;

                return (
                  <tr
                    key={q.questionNo}
                    className={`transition ${isConflict ? 'bg-red-50/60' : 'bg-white hover:bg-gray-50/40'}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {q.questionNo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{q.maxMarks}M</td>
                    <td className="px-4 py-2.5 text-center">
                      <MarkCell mark={m1} maxMarks={q.maxMarks} isConflict={isConflict} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <MarkCell mark={m2} maxMarks={q.maxMarks} isConflict={isConflict} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <HECell
                        questionNo={q.questionNo}
                        maxMarks={q.maxMarks}
                        isNA={isNA}
                        value={heMap[q.questionNo]}
                        onChange={onHeChange}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Main panel
// ══════════════════════════════════════════════════════════════════
const ConflictDetailPanel = ({ sheetId, examId, onResolved }) => {
  const { data, isLoading } = useConflictSheetData(sheetId);
  const resolveMut = useResolveConflict(examId);

  const [heMap,   setHeMap]   = useState({});    // { questionNo: marksGiven }
  const [remarks, setRemarks] = useState('');
  const [errors,  setErrors]  = useState([]);

  const { sheet, examConfig, sections = [], eval1, eval2 } = data || {};

  // Build E1/E2 mark maps
  const e1Map = useMemo(() => eval1?.markMap || {}, [eval1]);
  const e2Map = useMemo(() => eval2?.markMap || {}, [eval2]);

  const handleHeChange = useCallback((qno, val) => {
    setHeMap((prev) => ({ ...prev, [qno]: val }));
  }, []);

  // Bulk-fill from E1 or E2
  const acceptEvaluator = (evalMap) => {
    const filled = {};
    Object.entries(evalMap).forEach(([qno, m]) => {
      if (!m.isNA) filled[Number(qno)] = m.marksGiven || 0;
    });
    setHeMap(filled);
  };

  const handleSubmit = () => {
    if (!remarks || remarks.trim().length < 20) {
      toast.error('Remarks must be at least 20 characters.');
      return;
    }

    // Build marks array
    const marksArray = sections.flatMap((sec) =>
      sec.questions.map((q) => ({
        questionNo: q.questionNo,
        marksGiven: heMap[q.questionNo] ?? 0,
        isNA:       e1Map[q.questionNo]?.isNA && e2Map[q.questionNo]?.isNA,
      }))
    );

    // Client validation
    const heMarkMap = {};
    marksArray.forEach((m) => { heMarkMap[m.questionNo] = m; });
    const validation = validateAllMarks(heMarkMap, sections, examConfig, [], sheet?.totalPages || 0);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error(`${validation.errors.length} validation error(s).`);
      return;
    }
    setErrors([]);

    resolveMut.mutate({ sheetId, marks: marksArray, remarks: remarks.trim() }, {
      onSuccess: () => onResolved?.(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading conflict data…
      </div>
    );
  }

  if (!data) return null;

  const heTotal = Object.values(heMap).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <h3 className="text-base font-bold text-gray-800">
            {sheet?.anonymousCode} — Conflict Resolution
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {examConfig?.subjectName} · E1: {eval1?.grandTotal ?? '—'} · E2: {eval2?.grandTotal ?? '—'} · Δ {eval1 && eval2 ? Math.abs(eval1.grandTotal - eval2.grandTotal).toFixed(1) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => acceptEvaluator(e1Map)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <Copy className="w-3.5 h-3.5" /> Accept E1
          </button>
          <button
            onClick={() => acceptEvaluator(e2Map)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
          >
            <Copy className="w-3.5 h-3.5" /> Accept E2
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-100">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600"><AlertTriangle className="inline w-3 h-3 mr-1" />{e.msg}</p>
          ))}
        </div>
      )}

      {/* 3-column table scroll area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {sections.map((sec) => (
          <SectionBlock
            key={sec.name}
            section={sec}
            e1Map={e1Map}
            e2Map={e2Map}
            heMap={heMap}
            onHeChange={handleHeChange}
          />
        ))}
      </div>

      {/* Footer: remarks + submit */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0 space-y-3">
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-gray-400 mt-2.5 flex-shrink-0" />
          <textarea
            rows={2}
            maxLength={500}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (required, min 20 characters)…"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            HE Total: <span className="font-bold text-indigo-700">{heTotal}</span>
            {examConfig?.totalMarks ? ` / ${examConfig.totalMarks}` : ''}
          </div>
          <button
            onClick={handleSubmit}
            disabled={resolveMut.isPending || remarks.trim().length < 20}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {resolveMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Resolving…</>
              : <><Send className="w-4 h-4" /> Submit Resolution</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictDetailPanel;
