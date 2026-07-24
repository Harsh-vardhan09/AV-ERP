// ══════════════════════════════════════════════════════════════════
// OASES — MCQ QuestionRow (Sprint 5 — UI v2)
// Evaluator selects which option the student marked.
// Score is recorded as maxMarks (correct) or -negMarks (wrong).
// correctOption is hidden from client — server computes actual score.
// ══════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';

const OPTIONS = ['A', 'B', 'C', 'D'];

/**
 * MCQ row for SheetViewer — evaluator picks student's chosen option.
 * LAYOUT: 2-row card (identity top + buttons bottom) so buttons breathe
 * in the narrow 35% right panel without getting crushed.
 *
 * @param {object}   question   - { questionNo, maxMarks, negativeMarks }
 * @param {object}   markData   - existing mark from cache/draft
 * @param {Function} onSave     - (payload) => void
 * @param {boolean}  disabled
 * @param {boolean}  hasError
 * @param {boolean}  readOnly   - HE view: no interaction
 */
const MCQQuestionRow = ({ question, markData, onSave, disabled = false, hasError = false, readOnly = false }) => {
  const { questionNo, maxMarks, negativeMarks = 0 } = question;

  // ── LOGIC UNCHANGED ─────────────────────────────────────────────
  const [selected, setSelected] = useState(markData?.metadata?.studentOption || null);

  // Sync when markData changes (draft restore)
  useEffect(() => {
    setSelected(markData?.metadata?.studentOption || null);
  }, [markData?.metadata?.studentOption]);

  const handleSelect = (option) => {
    if (disabled || readOnly) return;
    const isNA = option === 'NA';
    const newSelected = selected === option ? null : option; // toggle off
    setSelected(newSelected);

    const marksGiven = isNA ? 0 : (newSelected ? maxMarks : 0);
    onSave?.({
      questionNo,
      marksGiven,
      isNA: newSelected === 'NA',
      metadata: { studentOption: newSelected },
    });
  };

  const hasValue    = !!selected;
  const scoreLabel  = selected === 'NA' ? '0'
    : selected
      ? `+${maxMarks}${negativeMarks > 0 ? ` / ‑${negativeMarks}` : ''}`
      : '—';
  // ── END LOGIC ───────────────────────────────────────────────────

  return (
    <div
      className={`px-4 py-3 border-b border-gray-100 transition-colors
        ${hasError   ? 'bg-red-50'      : ''}
        ${hasValue && !hasError ? (selected === 'NA' ? 'bg-gray-50/60' : 'bg-indigo-50/20') : ''}
        ${!hasValue && !hasError ? 'hover:bg-gray-50/50' : ''}
        ${disabled || readOnly ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {/* ── ROW TOP: identity ── */}
      <div className="flex items-center gap-2 mb-2.5">
        {/* Q number chip */}
        <span className="flex-shrink-0 w-7 h-7 rounded-md bg-gray-800 text-white text-xs font-bold flex items-center justify-center">
          {questionNo}
        </span>

        {/* MCQ type badge */}
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-purple-100 text-purple-700 border-purple-200">
          MCQ
        </span>

        {/* max marks */}
        <span className="text-xs text-gray-400 font-medium">max {maxMarks}</span>

        {/* Score preview — right aligned */}
        <span className={`ml-auto text-sm font-bold
          ${selected === 'NA' ? 'text-gray-400'
            : selected ? 'text-indigo-600'
            : 'text-gray-300'}`}
        >
          {scoreLabel}
        </span>
      </div>

      {/* ── ROW BOTTOM: option buttons — full width, equal flex ── */}
      <div className="flex gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={disabled || readOnly}
            className={`flex-1 h-9 rounded-lg text-sm font-bold transition-all
              ${selected === opt
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 active:scale-95'}
              ${disabled || readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {opt}
          </button>
        ))}

        {/* NA button */}
        <button
          onClick={() => handleSelect('NA')}
          disabled={disabled || readOnly}
          className={`px-3 h-9 rounded-lg text-xs font-semibold transition-all flex-shrink-0
            ${selected === 'NA'
              ? 'bg-gray-500 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95'}
            ${disabled || readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          NA
        </button>
      </div>
    </div>
  );
};

export default MCQQuestionRow;
