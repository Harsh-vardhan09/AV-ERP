

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, ZoomIn, ZoomOut, RotateCw, Clock,
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle,
  Save, Send, FileText, Eye, EyeOff, X, Check,
  ChevronDown, ChevronUp, Flag, Ban, ClipboardList,
  MousePointer2, Pen, PanelRight,
} from 'lucide-react';
import { useSheetData, usePageUrl, useEvalDraft } from '../hooks/queries/useEvalQueue';
import {
  useSaveMark, useSaveDraft, useSubmitEvaluation, useMarkPageReviewed,
} from '../hooks/mutations/useSubmitMarks';
import useEvaluationStore from '../store/evaluationStore';
import { oasesKeys } from '../lib/queryKeys';
import { evalService } from '../services/sheetService';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import useOasesAuth from '../hooks/useOasesAuth';
import SheetStatusBadge from '../shared/SheetStatusBadge';
import AuditTrailDrawer from '../shared/AuditTrailDrawer';
import MCQQuestionRow from './MCQQuestionRow';
import { validateAllMarks } from '../utils/marksValidation';
import { OASES_ROLES } from '../utils/oasesConstants';
import { idbWrite, idbRead, idbClear } from '../lib/idbBackup'; // Sprint 7: IndexedDB backup
import toast from 'react-hot-toast';

const AutoSaveIndicator = ({ lastSaved, isDirty, isSaving }) => {
  if (isSaving) return (
    <span className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
    </span>
  );
  if (isDirty) return (
    <span className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" /> Unsaved changes
    </span>
  );
  if (lastSaved) return (
    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
      <Check className="w-3 h-3" />
      Saved {new Date(lastSaved).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
  return null;
};

const SessionTimer = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
      <Clock className="w-3 h-3" />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
};

// â€â‚¬â€â‚¬ PageThumbnails (sidebar) — Problem #6 fix: bigger, clearer â€â‚¬â€â‚¬â€â‚¬
const PageThumbnails = React.memo(({ totalPages, currentPage, pagesReviewed, onSelect }) => (
  <div className="w-16 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto py-3 flex flex-col items-center gap-2.5">
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
      const reviewed = (pagesReviewed || []).includes(pg);
      const active = pg === currentPage;
      return (
        <button
          key={pg}
          onClick={() => onSelect(pg)}
          className="relative flex flex-col items-center gap-1 group"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all
            ${active
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : reviewed
                ? 'bg-green-50 text-green-700 ring-2 ring-green-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {pg}
          </div>
          <div className={`w-1.5 h-1.5 rounded-full transition-all
            ${reviewed ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-gray-300'}`}
          />
        </button>
      );
    })}
  </div>
));
PageThumbnails.displayName = 'PageThumbnails';

const SECTION_COLORS = {
  A: 'border-l-blue-500',
  B: 'border-l-teal-500',
  C: 'border-l-purple-500',
  D: 'border-l-amber-500',
};
const SECTION_DOT_COLOR = {
  A: 'bg-blue-500',
  B: 'bg-teal-500',
  C: 'bg-purple-500',
  D: 'bg-amber-500',
};

const TYPE_BADGE = {
  subjective: { label: 'SUB', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  mcq: { label: 'MCQ', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  fill_in_blank: { label: 'FIB', cls: 'bg-blue-100  text-blue-700  border-blue-200' },
  short_answer: { label: 'SA', cls: 'bg-teal-100  text-teal-700  border-teal-200' },
};

const QuestionRow = ({ question, markData, onSave, disabled, hasError, isSelected, onSelect }) => {
  const { questionNo, maxMarks, questionType, steps, isOptional } = question;

  // Dispatch MCQ questions to dedicated pill-select component
  if (questionType === 'mcq') {
    return (
      <MCQQuestionRow
        question={question}
        markData={markData}
        onSave={onSave}
        disabled={disabled}
        hasError={hasError}
      />
    );
  }

  const [localValue, setLocalValue] = useState('');
  const [isNALocal, setIsNALocal] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (markData) {
      setLocalValue(markData.isNA ? '' : (markData.marksGiven ?? ''));
      setIsNALocal(!!markData.isNA);
    }
  }, [markData?.marksGiven, markData?.isNA]);

  const handleBlur = () => {
    const val = parseFloat(localValue);
    if (isNALocal || (localValue !== '' && !isNaN(val))) {
      onSave({ questionNo, marksGiven: isNALocal ? 0 : val, isNA: isNALocal });
    }
  };

  const handleNA = () => {
    const next = !isNALocal;
    setIsNALocal(next);
    if (next) {
      setLocalValue('');
      onSave({ questionNo, marksGiven: 0, isNA: true });
    }
  };

  const isOver = !isNALocal && localValue !== '' && parseFloat(localValue) > maxMarks;
  const hasValue = markData && (markData.marksGiven > 0 || markData.isNA);
  const pct = (isNALocal || localValue === '') ? 0 : Math.min(100, (parseFloat(localValue) / maxMarks) * 100);
  const badge = TYPE_BADGE[questionType] || { label: 'Q', cls: 'bg-gray-100 text-gray-700 border-gray-200' };

  // Problem #4: 1-mark questions use button trio
  const isOneMark = maxMarks === 1;
  const setMark = (val) => {
    if (disabled) return;
    setLocalValue(String(val));
    onSave({ questionNo, marksGiven: val, isNA: false });
  };

  const parsedVal = parseFloat(localValue);

  return (
    <div
      className={`px-4 py-3 border-b border-gray-100 transition-colors
        ${isSelected ? 'bg-purple-50 ring-2 ring-inset ring-purple-300' : hasError ? 'bg-red-50' : isNALocal ? 'bg-gray-50/70' : hasValue ? 'bg-green-50/20' : 'hover:bg-gray-50/50'}
        ${onSelect && !disabled ? 'cursor-pointer' : ''}
        ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={onSelect && !disabled ? () => onSelect(questionNo) : undefined}
    >

      <div className="flex items-center gap-2 mb-2.5">
        <span className="flex-shrink-0 w-7 h-7 rounded-md bg-gray-800 text-white text-xs font-bold flex items-center justify-center">
          {questionNo}
        </span>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}>
          {badge.label}
        </span>
        {isOptional && (
          <span className="text-xs text-amber-600 font-medium">Optional</span>
        )}
        <span className="ml-auto text-xs text-gray-400 font-medium">max {maxMarks}</span>
      </div>


      {isOneMark ? (
        /* Problem #4: button trio for 1-mark questions */
        <div className="flex items-center gap-2">
          <button
            disabled={disabled}
            onClick={() => setMark(maxMarks)}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold border-2 transition-all
              ${!isNALocal && localValue !== '' && parsedVal === maxMarks
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50'}`}
          >
            <Check size={14} /><span className="ml-1">+{maxMarks}</span>
          </button>
          <button
            disabled={disabled}
            onClick={() => setMark(0)}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold border-2 transition-all
              ${!isNALocal && localValue !== '' && parsedVal === 0
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50'}`}
          >
            <X size={14} /><span className="ml-1">0</span>
          </button>
          <button
            disabled={disabled}
            onClick={handleNA}
            className={`px-4 h-9 rounded-lg text-sm font-semibold border-2 transition-all
              ${isNALocal
                ? 'bg-gray-500 border-gray-500 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-50'}`}
          >
            NA
          </button>
        </div>
      ) : (
        /* Problem #3: number input + progress bar + NA for multi-mark */
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="number"
            min={0}
            max={maxMarks}
            step={0.5}
            value={localValue}
            onChange={(e) => { setLocalValue(e.target.value); }}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
            disabled={isNALocal || disabled}
            placeholder="—"
            className={`w-20 h-10 text-center text-base font-semibold rounded-lg border-2 transition-all outline-none
              ${isNALocal
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : isOver
                  ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500'
                  : hasValue && !isOver
                    ? 'border-green-400 bg-green-50 text-green-800 focus:border-green-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
          />
          <span className="text-gray-300 font-light text-lg">/</span>
          <span className="text-sm font-semibold text-gray-600 w-5 flex-shrink-0">{maxMarks}</span>

          {/* Progress bar */}
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-red-400' : 'bg-green-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* NA toggle — spacer before it prevents accidental click */}
          <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 ml-1">
            <input
              type="checkbox"
              checked={isNALocal}
              onChange={handleNA}
              className="w-4 h-4 rounded accent-gray-600"
            />
            <span className="text-xs text-gray-500 font-medium select-none">NA</span>
          </label>
        </div>
      )}

      {/* Inline error */}
      {(isOver || hasError) && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {isOver ? `Maximum is ${maxMarks}` : 'Please verify this mark'}
        </p>
      )}
    </div>
  );
};
const QuestionRowMemo = React.memo(QuestionRow);
QuestionRowMemo.displayName = 'QuestionRow';

const SectionAccordion = ({ section, marksMap, onSaveMark, disabled, errorMap = {}, selectedQNo, onSelectQ }) => {
  const [open, setOpen] = useState(true);

  // LOGIC UNCHANGED
  const subtotal = useMemo(() => {
    return section.questions.reduce((sum, q) => {
      const m = marksMap[q.questionNo];
      if (m && !m.isNA) return sum + (m.marksGiven || 0);
      return sum;
    }, 0);
  }, [section.questions, marksMap]);

  const maxTotal = section.questions.reduce((s, q) => s + q.maxMarks, 0);
  const answered = section.questions.filter((q) => marksMap[q.questionNo]).length;
  const hasErrors = section.questions.some((q) => errorMap[q.questionNo]);

  const dotColor = SECTION_DOT_COLOR[section.name] || 'bg-gray-500';
  const borderColor = SECTION_COLORS[section.name] || 'border-l-gray-400';

  return (
    <div className={`border-l-4 ${borderColor} mb-1.5 overflow-hidden rounded-r-xl bg-white shadow-sm border-t border-r border-b border-gray-100`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-3 hover:bg-gray-50 transition-colors
          ${hasErrors ? 'bg-red-50' : 'bg-gray-50/80'}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
          <span className="text-sm font-semibold text-gray-800 flex-shrink-0">Sec {section.name}</span>
          <span className="text-xs text-gray-400 truncate">{answered}/{section.questions.length} done</span>
          {hasErrors && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded-full border border-red-200 flex-shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />
              Err
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <span className={`text-base font-bold ${subtotal > maxTotal ? 'text-red-600' : 'text-gray-900'}`}>
              {subtotal}
            </span>
            <span className="text-xs text-gray-400 ml-0.5">/{maxTotal}</span>
          </div>
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          }
        </div>
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {section.questions.map((q) => (
            <QuestionRowMemo
              key={q.questionNo}
              question={q}
              markData={marksMap[q.questionNo]}
              onSave={onSaveMark}
              disabled={disabled}
              hasError={!!errorMap[q.questionNo]}
              isSelected={selectedQNo === q.questionNo}
              onSelect={onSelectQ}
            />
          ))}
        </div>
      )}
    </div>
  );
};
const SectionAccordionMemo = React.memo(SectionAccordion);
SectionAccordionMemo.displayName = 'SectionAccordion';

const TotalBar = ({ sectionTotals, grandTotal, totalMarks, onSaveDraft, onSubmit, isSaving, isDraftSaving, sections, pagesReviewed, totalPages, isAdmin }) => {
  // Compute section max from sections prop (needed for progress bars)
  const sectionMaxMap = {};
  (sections || []).forEach(sec => {
    sectionMaxMap[sec.name] = sec.questions.reduce((s, q) => s + q.maxMarks, 0);
  });

  const totalAnswered = (sections || []).reduce(
    (s, sec) => s + sec.questions.filter(q => (sectionTotals[sec.name] !== undefined || false)).length, 0
  );
  const totalQuestions = (sections || []).reduce((s, sec) => s + sec.questions.length, 0);
  const pagesReviewedCount = (pagesReviewed || []).length;

  const ZONE_COLORS = { A: 'bg-blue-400', B: 'bg-teal-400', C: 'bg-purple-400', D: 'bg-amber-400' };

  return (
    <div className="flex-shrink-0 bg-white border-t-2 border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">

      <div className="flex border-b border-gray-100">
        {Object.entries(sectionTotals || {}).map(([sec, val]) => {
          const max = sectionMaxMap[sec] || 0;
          const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
          const bar = ZONE_COLORS[sec] || 'bg-gray-400';
          return (
            <div key={sec} className="flex-1 flex flex-col items-center py-2 border-r border-gray-100 last:border-r-0 min-w-0">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{sec}</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-sm font-bold text-gray-900 leading-none">{val ?? '—'}</span>
                <span className="text-[9px] text-gray-400 leading-none">/{max}</span>
              </div>
              <div className="w-full px-1.5 mt-1">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-1 ${bar} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ZONE 2: Grand total + completion info */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Grand Total</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-2xl font-black ${grandTotal > totalMarks ? 'text-red-600' : grandTotal === totalMarks ? 'text-green-600' : 'text-gray-900'
              }`}>{grandTotal ?? '—'}</span>
            <span className="text-sm text-gray-400 font-medium">/ {totalMarks}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-400">Pages reviewed</span>
          <p className={`text-sm font-semibold mt-0.5 ${pagesReviewedCount === totalPages ? 'text-green-600' : 'text-amber-600'
            }`}>{pagesReviewedCount} / {totalPages}</p>
        </div>
      </div>

      {/* ZONE 3: Action buttons */}
      <div className="flex gap-3 px-4 py-3">
        <button
          onClick={onSaveDraft}
          disabled={isDraftSaving}
          className="flex-1 h-10 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDraftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isDraftSaving ? 'Saving...' : 'Save Draft'}
        </button>
        {/* Admin cannot submit — read-only view */}
        {!isAdmin && (
          <button
            onClick={onSubmit}
            className="flex-[2] h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSaving ? 'Submitting...' : 'Submit Evaluation'}
          </button>
        )}
      </div>
    </div>
  );
};

const SimpleTotalEntry = ({ totalMarks, simpleTotal, onChange, disabled }) => {
  const [localVal, setLocalVal] = useState(String(simpleTotal || ''));

  // Sync when parent restores draft value
  useEffect(() => { setLocalVal(String(simpleTotal || '')); }, [simpleTotal]);

  const parsed = parseFloat(localVal);
  const isOver = localVal !== '' && !isNaN(parsed) && parsed > totalMarks;

  const handleChange = (e) => {
    const raw = e.target.value;
    setLocalVal(raw);
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 0) onChange(v);
  };

  const handleBlur = () => {
    const v = parseFloat(localVal);
    if (!isNaN(v) && v >= 0) onChange(v);
    else if (localVal === '' || isNaN(v)) onChange(0);
  };

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <ClipboardList className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">No question scheme configured</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Enter total marks below. Ask admin to set up a question scheme for question-wise entry.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Marks Awarded</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={totalMarks}
            step={0.5}
            value={localVal}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            disabled={disabled}
            placeholder="—"
            className={`w-24 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
              ${disabled
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : isOver
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : localVal !== ''
                    ? 'border-green-400 bg-green-50 text-green-800'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
          />
          <span className="text-gray-300 font-light text-xl">/</span>
          <span className="text-xl font-bold text-gray-600">{totalMarks}</span>
        </div>
        {isOver && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Exceeds maximum of {totalMarks}
          </p>
        )}
      </div>

      {!isOver && localVal !== '' && !isNaN(parsed) && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round((parsed / totalMarks) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (parsed / totalMarks) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};



const SubmitConfirmDialog = ({ sections, marksMap, sectionTotals, grandTotal, totalMarks, unreviewedPages, onConfirm, onClose, isSubmitting, validation }) => {
  const [confirmed, setConfirmed] = useState(false);
  const hasScheme = sections.length > 0;

  const totalAnswered = hasScheme
    ? sections.reduce((s, sec) => s + sec.questions.filter((q) => marksMap[q.questionNo]).length, 0)
    : (grandTotal > 0 ? 1 : 0);
  const totalQuestions = hasScheme
    ? sections.reduce((s, sec) => s + sec.questions.length, 0)
    : 1;
  const unanswered = totalQuestions - totalAnswered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Confirm Submission</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {/* Summary table */}
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray-500">Section</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(sectionTotals || {}).map(([sec, val]) => (
                <tr key={sec}>
                  <td className="px-3 py-2 font-medium text-gray-700">Section {sec}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-indigo-700">{val}</td>
                </tr>
              ))}
              <tr className="bg-indigo-50">
                <td className="px-3 py-2 font-bold text-gray-800">Grand Total</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-xl text-indigo-700">
                  {grandTotal} / {totalMarks}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Warnings */}
        {(unanswered > 0 || unreviewedPages > 0 || validation?.warnings?.length > 0) && (
          <div className="space-y-2 mb-4">
            {unanswered > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {unanswered} question(s) not marked.
              </div>
            )}
            {unreviewedPages > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {unreviewedPages} page(s) not reviewed.
              </div>
            )}
            {validation?.warnings?.map((w, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {w.msg}
              </div>
            ))}
          </div>
        )}

        {/* Confirmation */}
        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-600">
            I have reviewed all pages and confirm the marks are correct. This action cannot be undone.
          </span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirm Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// MAIN: SheetViewer (EvaluationPanel)
// Phase 2: Marking mode sub-components 

// 3-way mode toggle rendered in the header
const MARK_MODES = [
  { mode: 'click', Icon: MousePointer2, label: 'Click', tip: 'Click on the page to drop marks' },
  { mode: 'annotate', Icon: Pen, label: 'Annotate', tip: 'Select a question, then click the page' },
  { mode: 'panel', Icon: PanelRight, label: 'Panel', tip: 'Enter marks in the right panel (default)' },
];
const ModeToggle = ({ markingMode, onChange, disabled }) => (
  <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
    {MARK_MODES.map(({ mode, Icon, label, tip }) => (
      <button
        key={mode}
        onClick={() => !disabled && onChange(mode)}
        title={tip}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all select-none
          ${markingMode === mode
            ? 'bg-white text-gray-800 shadow-sm shadow-black/10'
            : 'text-gray-500 hover:text-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Icon size={13} className="flex-shrink-0" />
        <span className="hidden md:inline leading-none">{label}</span>
      </button>
    ))}
  </div>
);

// Confirmation dialog for removing a mark annotation
const RemoveMarkConfirmDialog = ({ annotation, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <X className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800">Remove Mark?</h3>
          <p className="text-sm text-gray-500 mt-1">
            Remove <span className="font-semibold text-gray-700">+{annotation.marksGiven}</span> mark
            {annotation.questionNo ? ` for Q${annotation.questionNo}` : ''} from this position?
          </p>
          <p className="text-xs text-amber-600 mt-1.5 font-medium">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
          >
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Floating badge positioned on the answer-sheet canvas
const AnnotationBadge = ({ annotation, onRemove, disabled }) => {
  const [hovered, setHovered] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isAnnotate = !!annotation.questionNo;
  return (
    <>
      <div
        className="absolute z-20 flex items-center justify-center"
        style={{
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'all',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => e.stopPropagation()}
      >
        {hovered && !disabled ? (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
            className="w-10 h-10 rounded-full bg-red-500 text-white shadow-xl flex items-center justify-center hover:bg-red-600 transition ring-4 ring-red-200"
            title="Remove mark"
          ><X size={16} /></button>
        ) : (
          <div className={`min-w-[40px] h-10 px-2 rounded-full shadow-xl flex items-center justify-center gap-1 text-sm font-bold text-white leading-none select-none ring-2 ring-white
            ${isAnnotate ? 'bg-purple-500 border-2 border-purple-300' : 'bg-green-500 border-2 border-green-300'}`}
          >
            {isAnnotate && <span className="text-[10px] opacity-90">Q{annotation.questionNo}</span>}
            <span>+{annotation.marksGiven}</span>
          </div>
        )}
      </div>
      {confirmRemove && (
        <RemoveMarkConfirmDialog
          annotation={annotation}
          onConfirm={() => { setConfirmRemove(false); onRemove(annotation.id); }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </>
  );
};

// Floating popup that appears at the click-point for entering a mark value
const ClickMarkPopup = ({ popup, label, onConfirm, onClose }) => {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 40); }, []);
  const confirm = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) onConfirm(n);
    else onClose();
  };
  return (
    <div
      className="absolute z-30"
      style={{
        left: `${popup.x}%`,
        top: `${popup.y}%`,
        transform: 'translate(-50%, -115%)',
        pointerEvents: 'auto',  // must override overlay's pointerEvents:none
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex flex-col gap-2" style={{ minWidth: 148 }}>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          {label || 'Marks at this point'}
        </p>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="number"
            min={0}
            step={0.5}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onClose(); }}
            placeholder="0"
            className="w-16 h-8 text-center text-sm font-bold border-2 border-gray-200 rounded-lg outline-none focus:border-blue-400"
          />
          <button onClick={confirm} className="h-8 px-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition">✓</button>
          <button onClick={onClose} className="h-8 w-8 rounded-lg border border-gray-200 text-gray-400 text-xs flex items-center justify-center hover:bg-gray-50 transition"><X size={13} /></button>
        </div>
      </div>
      {/* downward caret */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
        style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid white' }} />
    </div>
  );
};
const SheetViewer = () => {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const store = useEvaluationStore();
  const { isAdmin } = useOasesAuth(); // Phase 1: admin read-only view

  const { data: sheetData, isLoading: sheetLoading, error: sheetError } = useSheetData(sheetId);
  const { data: draftData } = useEvalDraft(sheetId);

  const sheet = sheetData?.sheet;
  const examConfig = sheetData?.examConfig;
  const sections = sheetData?.scheme?.sections || [];
  const round = sheetData?.round || 1;

  // Current page image — hook must be called BEFORE totalPages so pageData is available
 
  const { data: rawPageData, isLoading: pageLoading, error: pageError } =
    usePageUrl(sheetId, store.currentPage, !!sheetId);

  // Derive isPdf from the URL — the backend never sends this flag explicitly.
  // Cloudinary raw PDFs have /raw/upload/ in their URL; local files end with .pdf
  const pageData = rawPageData
    ? {
      ...rawPageData,
      isPdf:
        rawPageData.isPdf === true ||
        /\.pdf($|\?|#)/i.test(rawPageData.url || '') ||
        /\/raw\/upload\//i.test(rawPageData.url || ''),
    }
    : rawPageData;

  // CRITICAL: sheet.totalPages from DB can be stale (default 1 set at upload time).
  // pageData.totalPages comes from images.length on the backend — always accurate.
  // We take the maximum so navigation is never incorrectly disabled.
  const dbTotalPages = sheet?.totalPages || 1;
  const totalPages = Math.max(dbTotalPages, pageData?.totalPages || 1);

  useEffect(() => {
    if (!sheetId || !totalPages) return;
    const pg = store.currentPage;
    if (pg < totalPages) {
      qc.prefetchQuery({
        queryKey: oasesKeys.sheetPage(sheetId, pg + 1),
        queryFn: () => evalService.getPageUrl(sheetId, pg + 1),
        staleTime: 1000 * 60 * 12,
      });
    }
    if (pg > 1) {
      qc.prefetchQuery({
        queryKey: oasesKeys.sheetPage(sheetId, pg - 1),
        queryFn: () => evalService.getPageUrl(sheetId, pg - 1),
        staleTime: 1000 * 60 * 12,
      });
    }
  }, [sheetId, store.currentPage, totalPages, qc]);

  const saveMarkMut = useSaveMark(sheetId);
  const saveDraftMut = useSaveDraft(sheetId);
  const submitMut = useSubmitEvaluation(sheetId);
  const pageReviewMut = useMarkPageReviewed(sheetId);

  const marksMap = useMemo(() => {
    const map = {};
    // Merge: sheetData.draft.marks †’ draftData.marks (draftData is more recent via optimistic updates)
    const source = draftData?.marks || sheetData?.draft?.marks || [];
    (Array.isArray(source) ? source : []).forEach((m) => {
      map[m.questionNo] = m;
    });
    return map;
  }, [draftData?.marks, sheetData?.draft?.marks]);

  const sectionTotals = draftData?.sectionTotals || sheetData?.draft?.sectionTotals || {};
  const grandTotal = draftData?.grandTotal ?? sheetData?.draft?.grandTotal ?? 0;
  const pagesReviewed = draftData?.pagesReviewed || sheetData?.draft?.pagesReviewed || [];

  useEffect(() => {
    if (sheetId) store.openSheet(sheetId);
    return () => store.closeSheet();
  }, [sheetId]);

  useEffect(() => {
    if (pagesReviewed?.length) {
      pagesReviewed.forEach((pg) => store.markPageReviewed(pg));
    }
  }, [pagesReviewed]);

  // If the server draft is empty but IndexedDB has data (e.g. page
  // was closed mid-session), offer to restore from local backup.
  useEffect(() => {
    if (!sheetId) return;
    idbRead(sheetId).then((backup) => {
      if (!backup?.marks?.length) return;
      const serverDraft = qc.getQueryData(oasesKeys.evalDraft(sheetId));
      const serverHasData = (serverDraft?.marks?.length || 0) > 0;
      if (!serverHasData) {
        // Seed React Query cache with local backup so UI shows restored marks
        qc.setQueryData(oasesKeys.evalDraft(sheetId), (old) => ({
          ...(old || {}),
          marks: backup.marks,
        }));
        store.setDirty(true);
        toast('Restored from local backup.', { icon: '✏' });
      }
    });
  }, [sheetId]); // eslint-disable-line

  useEffect(() => {
    const flush = async () => {
      if (!sheetId) return;
      const backup = await idbRead(sheetId);
      if (!backup?.marks?.length) return;
      const draft = qc.getQueryData(oasesKeys.evalDraft(sheetId));
      if (draft) {
        saveDraftMut.mutate(
          { marks: backup.marks, pagesReviewed: draft?.pagesReviewed || [] },
          { onSuccess: () => { idbClear(sheetId); store.setDirty(false); } }
        );
      }
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [sheetId]); // eslint-disable-line

  useEffect(() => {
    const interval = setInterval(() => {
      if (store.isDirty && sheetId) {
        const draft = qc.getQueryData(oasesKeys.evalDraft(sheetId));
        if (draft) {
          // Read mode from localStorage — markingMode state is declared later
          // in the body so we cannot reference it in the deps array (TDZ).
          // annotationsRef.current is safe inside the callback (not in deps).
          const currentMode = localStorage.getItem('oases.markingMode') || 'panel';
          saveDraftMut.mutate({
            marks: draft.marks || [],
            pagesReviewed: draft.pagesReviewed || [],
            clickMarks: annotationsRef.current,
            markingMode: currentMode,
          }, {
            onSuccess: (data) => store.setLastSaved(data.savedAt),
          });
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [sheetId, store.isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (store.isDirty && sheetId) {
        const draft = qc.getQueryData(oasesKeys.evalDraft(sheetId));
        if (draft) {
          evalService.saveDraftSync(sheetId, {
            marks: draft.marks || [],
            pagesReviewed: draft.pagesReviewed || [],
            clickMarks: annotationsRef.current,
            markingMode,
          });
        }
      }
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && store.currentPage > 1) {
        store.setPage(store.currentPage - 1);
      } else if (e.key === 'ArrowRight' && store.currentPage < totalPages) {
        store.setPage(store.currentPage + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store.currentPage, totalPages]);

  const handleSaveMark = useCallback((payload) => {
    store.setDirty(true);
    saveMarkMut.mutate(payload, {
      onSuccess: () => {
        // Sprint 7: mirror every mark change to IndexedDB
        const draft = qc.getQueryData(oasesKeys.evalDraft(sheetId));
        if (draft?.marks) idbWrite(sheetId, draft.marks);
      },
    });
  }, [saveMarkMut, sheetId, qc]);

  const [markingMode, setMarkingMode] = useState(
    () => localStorage.getItem('oases.markingMode') || 'panel'
  );
  const [annotations, setAnnotations] = useState([]);
  // Ref keeps a stable copy of annotations for use inside setInterval / unmount
  const annotationsRef = useRef(annotations);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  const [clickPopup, setClickPopup] = useState(null);
  const [selectedQNo, setSelectedQNo] = useState(null);

  // Restore click-mark badges from saved draft on load
  useEffect(() => {
    const src = draftData?.clickMarks || sheetData?.draft?.clickMarks;
    if (Array.isArray(src) && src.length) setAnnotations(src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetData?.draft?.clickMarks, draftData?.clickMarks]);

  // ── Sprint 4 + Phase 1: validation & schemaless-mode state ─────
  // IMPORTANT: declared HERE (before handleManualSave) to avoid TDZ crash.
  const [errorMap, setErrorMap] = useState({});
  const [auditOpen, setAuditOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [clientValidation, setClientValidation] = useState(null);
  // Phase 1: simple total for schemaless mode (no question scheme)
  const [simpleTotal, setSimpleTotal] = useState(0);
  // Phase 5: submit success screen
  const [submitSuccess, setSubmitSuccess] = useState(false);
  // Phase 5: admin override mode — unlocks editing for SCHOOL_ADMIN
  const [overrideMode, setOverrideMode] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Restore simpleTotal from draft when draft loads
  useEffect(() => {
    if (sections.length === 0 && marksMap['TOTAL']?.marksGiven != null) {
      setSimpleTotal(marksMap['TOTAL'].marksGiven);
    }
  }, [marksMap['TOTAL']?.marksGiven, sections.length]); // eslint-disable-line

  const handleModeChange = useCallback((mode) => {
    setMarkingMode(mode);
    localStorage.setItem('oases.markingMode', mode);
    setClickPopup(null);
    if (mode !== 'annotate') setSelectedQNo(null);
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (sheet?.status === 'locked' || isAdmin || markingMode === 'panel') return;
    // If a popup is already open, a click anywhere on the canvas closes it
    if (clickPopup) { setClickPopup(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (markingMode === 'annotate' && !selectedQNo) {
      toast('👉 Select a question in the panel first', { duration: 2000 });
      return;
    }
    setClickPopup({ x, y, pageNo: store.currentPage, questionNo: selectedQNo || null });
  }, [sheet?.status, isAdmin, markingMode, selectedQNo, store.currentPage, clickPopup]);

  const handleConfirmMark = useCallback((marksGiven) => {
    if (!clickPopup) return;
    const ann = {
      id: Math.random().toString(36).slice(2, 9),
      x: clickPopup.x,
      y: clickPopup.y,
      pageNo: clickPopup.pageNo,
      marksGiven,
      questionNo: clickPopup.questionNo || null,
      mode: markingMode,
    };
    setAnnotations(prev => [...prev, ann]);
    // Annotate mode: also update the panel mark for the selected question
    if (markingMode === 'annotate' && clickPopup.questionNo) {
      handleSaveMark({ questionNo: clickPopup.questionNo, marksGiven, isNA: false });
    }
    setClickPopup(null);
    store.setDirty(true);
  }, [clickPopup, markingMode, handleSaveMark, store]);

  const handleRemoveAnnotation = useCallback((id) => {
    if (sheet?.status === 'locked' || isAdmin) return;
    setAnnotations(prev => prev.filter(a => a.id !== id));
    store.setDirty(true);
  }, [sheet?.status, isAdmin, store]);

  const handleManualSave = useCallback(() => {
    const draft = qc.getQueryData(oasesKeys.evalDraft(sheetId));
    let marks;
    if (markingMode === 'click') {
      const clickTotal = annotations.filter(a => a.mode === 'click')
        .reduce((sum, a) => sum + (a.marksGiven || 0), 0);
      marks = [{ questionNo: 'TOTAL', marksGiven: clickTotal, isNA: false }];
    } else if (sections.length === 0) {
      marks = [{ questionNo: 'TOTAL', marksGiven: simpleTotal, isNA: false }];
    } else {
      marks = draft?.marks || [];
    }
    saveDraftMut.mutate({
      marks,
      pagesReviewed: draft?.pagesReviewed || [],
      clickMarks: annotations,
      markingMode,
    }, {
      onSuccess: (data) => {
        store.setLastSaved(data.savedAt);
        toast.success('Draft saved.');
      },
    });
  }, [sheetId, saveDraftMut, qc, sections.length, simpleTotal, markingMode, annotations]);

  const handleMarkPageReviewed = useCallback(() => {
    pageReviewMut.mutate(store.currentPage);
    store.markPageReviewed(store.currentPage);
  }, [store.currentPage, pageReviewMut]);

  // Effective grand total: use simpleTotal when no scheme exists
  const effectiveGrandTotal = sections.length === 0 ? simpleTotal : grandTotal;
  // Click mode: grand total is the sum of all click-annotation marks
  const annotationGrandTotal = annotations
    .filter(a => a.mode === 'click')
    .reduce((sum, a) => sum + (a.marksGiven || 0), 0);
  // displayGrandTotal: what's shown in TotalBar & SubmitConfirm
  const displayGrandTotal = (markingMode === 'click' && annotations.some(a => a.mode === 'click'))
    ? annotationGrandTotal
    : effectiveGrandTotal;

  const handleSubmit = useCallback(() => {
    // ─ Click mode validation ─
    if (markingMode === 'click') {
      if (!annotations.some(a => a.mode === 'click')) {
        toast.error('Click on the sheet to place at least one mark before submitting.');
        return;
      }
      const max = examConfig?.totalMarks || 0;
      if (max > 0 && annotationGrandTotal > max) {
        toast.error(`Total (${annotationGrandTotal}) exceeds maximum (${max}). Remove some marks.`);
        return;
      }
      setSubmitOpen(true);
      return;
    }
    // ─ Schemaless mode: simple total validation ─
    if (sections.length === 0) {
      if (simpleTotal <= 0) {
        toast.error('Please enter total marks before submitting.');
        return;
      }
      const max = examConfig?.totalMarks || 0;
      if (max > 0 && simpleTotal > max) {
        toast.error(`Total marks (${simpleTotal}) exceeds maximum (${max}). Please review.`);
        return;
      }
      setSubmitOpen(true);
      return;
    }
    // â€â‚¬ Scheme mode: question-wise validation â€â‚¬
    const answered = Object.keys(marksMap).length;
    if (answered === 0) {
      toast.error('Please mark at least one question before submitting.');
      return;
    }
    const validation = validateAllMarks(marksMap, sections, examConfig, pagesReviewed, totalPages);
    setErrorMap(validation.errorMap || {});
    setClientValidation(validation);
    if (!validation.isValid) {
      toast.error(`${validation.errors.length} error(s). Fix highlighted questions first.`);
      return;
    }
    setSubmitOpen(true);
  }, [sections, marksMap, simpleTotal, examConfig, markingMode, annotations, annotationGrandTotal]);

  const handleConfirmSubmit = useCallback(() => {
    const draft = qc.getQueryData(oasesKeys.evalDraft(sheetId));
    let marks;
    if (markingMode === 'click') {
      marks = annotations.filter(a => a.mode === 'click')
        .map((a, i) => ({ questionNo: i + 1, marksGiven: a.marksGiven || 0, isNA: false }));
      if (!marks.length) marks = [{ questionNo: 'TOTAL', marksGiven: 0, isNA: false }];
    } else if (sections.length === 0) {
      marks = [{ questionNo: 'TOTAL', marksGiven: simpleTotal, isNA: false }];
    } else {
      marks = draft?.marks || Object.entries(marksMap).map(([qno, val]) => ({
        questionNo: Number(qno),
        marksGiven: val.marksGiven || 0,
        isNA: !!val.isNA,
      }));
    }
    submitMut.mutate({ marks, annotations }, {
      onSuccess: () => {
        idbClear(sheetId);
        setSubmitOpen(false);
        // Phase 5: show success screen instead of navigating away
        setSubmitSuccess(true);
      },
    });
  }, [sheetId, marksMap, submitMut, qc, sections.length, simpleTotal, markingMode, annotations]);

  // Phase 5: Admin approve handler
  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      await evalService.approveSheet(sheetId);
      toast.success('Sheet approved successfully!');
      qc.invalidateQueries({ queryKey: oasesKeys.sheets() });
      navigate(-1);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Approval failed.');
    } finally {
      setIsApproving(false);
    }
  }, [sheetId, qc, navigate]);

  // Phase 5: Admin override — unlocks editing
  const handleStartOverride = useCallback(() => {
    setOverrideMode(true);
    toast('Override mode — you can now edit marks. Save Draft when done.', { icon: '✏️' });
  }, []);

  if (sheetLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-indigo-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin" />
        <span className="text-sm">Loading evaluation...</span>
      </div>
    );
  }

  if (sheetError || !sheet) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-400 gap-3">
        <AlertTriangle className="w-10 h-10 text-red-300" />
        <p className="text-sm">Sheet not found or not assigned to you.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 underline">â€ Â Back to queue</button>
      </div>
    );
  }

  const rotation = store.rotations[store.currentPage] || 0;
  const unreviewedPages = totalPages - pagesReviewed.length;
  const isLocked = sheet.status === 'locked';
  // Phase 5: admin read-only by default; overrideMode unlocks editing
  const disableInput = isLocked || (isAdmin && !overrideMode);

  // Phase 5: submit success screen — shown after teacher submits
  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-10 max-w-md w-full mx-4 flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Submitted Successfully!</h2>
            <p className="text-sm text-gray-500 mt-1">Your evaluation has been sent to the admin for review.</p>
          </div>
          <div className="w-full bg-gray-50 rounded-xl border border-gray-100 p-4 text-left space-y-1.5">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Sheet:</span> {sheet?.anonymousCode}
            </p>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Subject:</span>{' '}
              {examConfig?.subjectName}<span className="mx-1 opacity-40">|</span>{examConfig?.examName}
            </p>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Grand Total:</span>{' '}
              <span className="font-bold text-indigo-700">
                {displayGrandTotal} / {examConfig?.totalMarks || 0}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Copies
          </button>
        </div>
      </div>
    );
  }

  return (
    <OasesRoleGuard roles={[OASES_ROLES.EVALUATOR, OASES_ROLES.HEAD_EXAMINER, OASES_ROLES.SCHOOL_ADMIN]}>
      {/* 
        Layout note: SheetViewer lives inside OasesLayout <main> which has padding:28px and a 60px topbar.
        We use negative margins to cancel the padding, and calc(100vh - 60px) for exact height.
        This keeps the TotalBar always visible without changing any parent layout logic.
      */}
      <div
        style={{
          margin: '-28px',
          height: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#f3f4f6',
        }}
      >

        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0" style={{ height: 56 }}>
          {/* Left */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {sheet.anonymousCode}
            </span>
            <span className="text-xs text-gray-500 hidden sm:block">
              {examConfig?.subjectName}<span className="mx-1 opacity-40">|</span>{examConfig?.examName}
            </span>
            <SheetStatusBadge status={sheet.status} />
          </div>

          {/* Center — 3-mode marking toggle */}
          <ModeToggle
            markingMode={markingMode}
            onChange={handleModeChange}
            disabled={disableInput}
          />

          {/* Right — auto-save + timer + zoom + rotate */}
          <div className="flex items-center gap-2">
            <AutoSaveIndicator
              lastSaved={store.lastSaved}
              isDirty={store.isDirty}
              isSaving={saveDraftMut.isPending}
            />
            <SessionTimer startedAt={store.sessionStartedAt} />
            <button onClick={() => setAuditOpen(true)} className="text-[10px] text-gray-400 hover:text-indigo-600 px-2">Audit</button>
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => store.setZoom(store.zoomLevel - 0.25)} className="p-1 rounded hover:bg-gray-100">
                <ZoomOut className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <span className="text-[10px] font-mono text-gray-400 w-8 text-center">
                {Math.round(store.zoomLevel * 100)}%
              </span>
              <button onClick={() => store.setZoom(store.zoomLevel + 0.25)} className="p-1 rounded hover:bg-gray-100">
                <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => store.rotatePage(store.currentPage)} className="p-1 rounded hover:bg-gray-100 ml-1">
                <RotateCw className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          <PageThumbnails
            totalPages={totalPages}
            currentPage={store.currentPage}
            pagesReviewed={pagesReviewed}
            onSelect={(pg) => store.setPage(pg)}
          />

          {/* Sub-flex: left + right split. Percentage calc EXCLUDES thumbnail.
              Without this wrapper, flex-basis % includes thumbnail width,
              causing the right panel to be clipped from 334px â€ â€™ ~271px. */}
          <div className="flex flex-1 overflow-hidden">

            <div className="flex flex-col overflow-hidden" style={{ flex: `0 0 ${store.splitRatio}%` }}>

              {/* Image area */}
              <div className="flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-4">
                {pageLoading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : pageError ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <AlertTriangle className="w-8 h-8" />
                    <p className="text-sm">Page unavailable</p>
                    <button
                      onClick={() => qc.invalidateQueries({ queryKey: oasesKeys.sheetPage(sheetId, store.currentPage) })}
                      className="text-xs text-indigo-600 underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : pageData?.url ? (
                  pageData.isPdf ? (() => {
                    // If URL is a full remote URL (Cloudinary), use it directly.
                    // For legacy localhost paths, rewrite via Vite proxy to avoid CSP blocks.
                    const [baseHref] = pageData.url.split('#');
                    const isRemote = /^https?:\/\/(?!localhost)/i.test(baseHref);
                    const proxyUrl = isRemote
                      ? `${baseHref}#page=${store.currentPage}`
                      : (() => {
                        const relPath = baseHref.replace(/^https?:\/\/[^/]+\/uploads/, '');
                        return `/oases-file${relPath}#page=${store.currentPage}`;
                      })();
                    return (
                      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '600px' }}>
                        <iframe
                          key={proxyUrl}
                          src={proxyUrl}
                          title={`Page ${store.currentPage}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            minHeight: '600px',
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                            transform: `scale(${store.zoomLevel})`,
                            transformOrigin: 'top left',
                            // Disable pointer events on iframe in click/annotate mode
                            // so our overlay can capture clicks cleanly.
                            pointerEvents: (markingMode !== 'panel' && !disableInput) ? 'none' : 'auto',
                          }}
                          onLoad={() => store.markPageReviewed(store.currentPage)}
                        />

                        {/* Click-capture overlay — ONLY active in click/annotate mode.
                            In panel mode: pointerEvents:none so PDF controls work normally.
                            In click/annotate mode: pointerEvents:all intercepts clicks for mark placement.
                            IMPORTANT: The overlay is only shown in click/annotate mode. Page navigation
                            is handled by the bottom nav bar (Prev/Next buttons), NOT the PDF toolbar. */}
                        {(markingMode !== 'panel' && !disableInput) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              pointerEvents: 'all',
                              cursor: 'crosshair',
                              background: 'rgba(59,130,246,0.04)',
                              zIndex: 10,
                            }}
                            onClick={handleCanvasClick}
                          >
                            {annotations
                              .filter(a => a.pageNo === store.currentPage)
                              .map(ann => (
                                <AnnotationBadge
                                  key={ann.id}
                                  annotation={ann}
                                  onRemove={handleRemoveAnnotation}
                                  disabled={disableInput}
                                />
                              ))
                            }
                            {clickPopup && clickPopup.pageNo === store.currentPage && (
                              <ClickMarkPopup
                                popup={clickPopup}
                                label={
                                  clickPopup.questionNo
                                    ? `Q${clickPopup.questionNo} — enter marks`
                                    : `Enter marks (max ${examConfig?.totalMarks ?? '—'})`
                                }
                                onConfirm={handleConfirmMark}
                                onClose={() => setClickPopup(null)}
                              />
                            )}
                          </div>
                        )}
                        {/* In panel mode, show badges without overlay (no click capture) */}
                        {markingMode === 'panel' && annotations.filter(a => a.pageNo === store.currentPage).length > 0 && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                            {annotations
                              .filter(a => a.pageNo === store.currentPage)
                              .map(ann => (
                                <AnnotationBadge
                                  key={ann.id}
                                  annotation={ann}
                                  onRemove={handleRemoveAnnotation}
                                  disabled={true}
                                />
                              ))
                            }
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    /* badge-overlay wrapper */
                    <div
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        transform: `rotate(${rotation}deg) scale(${store.zoomLevel})`,
                        transformOrigin: 'top center',
                      }}
                      className={`shadow-xl rounded transition-transform duration-200${(markingMode !== 'panel' && !disableInput) ? ' cursor-crosshair' : ''}`}
                      onClick={handleCanvasClick}
                    >
                      <img
                        src={pageData.url}
                        alt={`Page ${store.currentPage}`}
                        style={{
                          display: 'block',
                          maxWidth: rotation % 180 === 0 ? '100%' : undefined,
                        }}
                        className="rounded"
                        onLoad={() => store.markPageReviewed(store.currentPage)}
                      />

                      {/* Badge overlay — pointerEvents:none so clicks pass through to the wrapper */}
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        {annotations
                          .filter(a => a.pageNo === store.currentPage)
                          .map(ann => (
                            <AnnotationBadge
                              key={ann.id}
                              annotation={ann}
                              onRemove={handleRemoveAnnotation}
                              disabled={disableInput}
                            />
                          ))
                        }

                        {/* Click-to-mark popup — rendered inside overlay but pointerEvents:auto on itself */}
                        {clickPopup && clickPopup.pageNo === store.currentPage && (
                          <ClickMarkPopup
                            popup={clickPopup}
                            label={
                              clickPopup.questionNo
                                ? `Q${clickPopup.questionNo} — enter marks`
                                : `Enter marks (max ${examConfig?.totalMarks ?? '—'})`
                            }
                            onConfirm={handleConfirmMark}
                            onClose={() => setClickPopup(null)}
                          />
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
                    <FileText className="w-12 h-12 opacity-20" />
                    <p className="text-sm">No page image available.</p>
                  </div>
                )}
              </div>

              {/* Page navigation bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 flex-shrink-0" style={{ height: 44 }}>
                <button
                  onClick={() => store.setPage(Math.max(1, store.currentPage - 1))}
                  disabled={store.currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Page <span className="font-bold text-gray-700">{store.currentPage}</span> / {totalPages}
                  </span>
                  <button
                    onClick={handleMarkPageReviewed}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition ${pagesReviewed.includes(store.currentPage)
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                  >
                    {pagesReviewed.includes(store.currentPage)
                      ? <><CheckCircle2 className="w-3 h-3" /> Reviewed</>
                      : <><Eye className="w-3 h-3" /> Mark Reviewed</>}
                  </button>
                </div>

                <button
                  onClick={() => store.setPage(Math.min(totalPages, store.currentPage + 1))}
                  disabled={store.currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-col bg-white border-l border-gray-200 overflow-hidden" style={{ flex: `0 0 ${100 - store.splitRatio}%` }}>

              {/* Admin view banner — visible only when admin is reviewing */}
              {isAdmin && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex-shrink-0">
                  <Eye size={14} className="text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-800">
                    Admin View — Read only. You are reviewing this sheet as School Admin.
                  </p>
                </div>
              )}

              {/* Panel header */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    Mark Entry — Round {round}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {examConfig?.subjectName || examConfig?.subjectCode || ''}
                    {(examConfig?.subjectName || examConfig?.subjectCode) ? '  ·  ' : ''}
                    {examConfig?.examName || 'Loading…'}
                    {examConfig?.totalMarks
                      ? `  ·  Total: ${examConfig.totalMarks} marks`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <AutoSaveIndicator
                    lastSaved={store.lastSaved}
                    isDirty={store.isDirty}
                    isSaving={saveDraftMut.isPending}
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">Evaluator</span>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
              </div>

              {/* Scrollable sections / schemaless entry */}
              <div className="flex-1 overflow-y-auto py-2 px-2">

                {/* Annotate mode hint */}
                {markingMode === 'annotate' && sections.length > 0 && (
                  <div className="mx-1 mb-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
                    <span className="text-sm flex-shrink-0">✏️</span>
                    <p className="text-xs text-purple-700 font-medium flex-1">
                      {selectedQNo
                        ? `Q${selectedQNo} selected — click sheet to place mark`
                        : 'Tap a question to select it, then click on the sheet'}
                    </p>
                    {selectedQNo && (
                      <button
                        onClick={() => setSelectedQNo(null)}
                        className="text-[10px] text-purple-500 hover:text-purple-700 font-semibold flex-shrink-0"
                      >✕ Clear</button>
                    )}
                  </div>
                )}

                {/* Click mode summary */}
                {markingMode === 'click' && (
                  <div className="mx-1 mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                    <span className="text-sm flex-shrink-0">📍</span>
                    <p className="text-xs text-green-700 font-medium">
                      {annotations.filter(a => a.mode === 'click').length > 0
                        ? `${annotations.filter(a => a.mode === 'click').length} mark(s) placed · total ${annotationGrandTotal}`
                        : 'Click anywhere on the sheet to drop a mark'}
                    </p>
                  </div>
                )}

                {sections.length === 0 && markingMode !== 'click' ? (
                  <SimpleTotalEntry
                    totalMarks={examConfig?.totalMarks || 0}
                    simpleTotal={simpleTotal}
                    onChange={(v) => { setSimpleTotal(v); store.setDirty(true); }}
                    disabled={disableInput}
                  />
                ) : sections.length > 0 ? (
                  sections.map((sec) => (
                    <SectionAccordionMemo
                      key={sec.name}
                      section={sec}
                      marksMap={marksMap}
                      onSaveMark={handleSaveMark}
                      disabled={disableInput}
                      errorMap={errorMap}
                      selectedQNo={markingMode === 'annotate' ? selectedQNo : null}
                      onSelectQ={markingMode === 'annotate' ? setSelectedQNo : undefined}
                    />
                  ))
                ) : null}
              </div>

              {/* 3-zone TotalBar */}
              <TotalBar
                sectionTotals={sectionTotals}
                grandTotal={displayGrandTotal}
                totalMarks={examConfig?.totalMarks || 0}
                onSaveDraft={handleManualSave}
                onSubmit={handleSubmit}
                isSaving={saveDraftMut.isPending}
                isDraftSaving={saveDraftMut.isPending}
                sections={sections}
                pagesReviewed={pagesReviewed}
                totalPages={totalPages}
                isAdmin={isAdmin && !overrideMode}
              />

              {/* Phase 5: Admin action bar — Approve + Override */}
              {isAdmin && (
                <div className="flex-shrink-0 bg-amber-50 border-t-2 border-amber-200 px-4 py-3 flex flex-col gap-2">
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                    Admin Actions
                  </p>
                  {!overrideMode ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleStartOverride}
                        className="flex-1 h-10 rounded-xl border-2 border-amber-300 text-amber-800 text-sm font-semibold hover:bg-amber-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <Flag className="w-4 h-4" /> Override Marks
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="flex-[2] h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                      >
                        {isApproving
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle2 className="w-4 h-4" />}
                        {isApproving ? 'Approving…' : 'Approve Sheet'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOverrideMode(false)}
                        className="flex-1 h-10 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> Cancel Override
                      </button>
                      <button
                        onClick={() => {
                          handleManualSave();
                          toast.success('Override marks saved as draft.');
                        }}
                        disabled={saveDraftMut.isPending}
                        className="flex-[2] h-10 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                      >
                        {saveDraftMut.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Save className="w-4 h-4" />}
                        Save Override
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation dialog */}
      {submitOpen && (
        <SubmitConfirmDialog
          sections={sections}
          marksMap={marksMap}
          sectionTotals={sectionTotals}
          grandTotal={displayGrandTotal}
          totalMarks={examConfig?.totalMarks || 0}
          unreviewedPages={unreviewedPages}
          validation={clientValidation}
          onConfirm={handleConfirmSubmit}
          onClose={() => setSubmitOpen(false)}
          isSubmitting={submitMut.isPending}
        />
      )}

      {/* Audit trail drawer */}
      {auditOpen && (
        <AuditTrailDrawer
          entityId={sheetId}
          title={`Audit — ${sheet.anonymousCode}`}
          onClose={() => setAuditOpen(false)}
        />
      )}
    </OasesRoleGuard>
  );
};

export default SheetViewer;
