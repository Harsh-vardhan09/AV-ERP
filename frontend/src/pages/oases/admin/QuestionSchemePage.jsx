// ══════════════════════════════════════════════════════════════════
// OASES — Admin: QuestionSchemePage
// Native HTML5 drag-and-drop reorder · live marks counter · MCQ fields ·
// CSV answer key import · save via React Query mutation
// ══════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import {
  GripVertical, Plus, Trash2, Upload, Save,
  Loader2, AlertTriangle, ChevronDown, ChevronUp, ArrowLeft,
} from 'lucide-react';
import { useSchemeQuery } from '../hooks/queries/useSchemeQuery';
import { useSaveScheme, useUploadAnswerKey } from '../hooks/queries/useSchemeQuery';
import { useGetExamQuery } from '@/redux/api/adminApi';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import { OASES_ROLES } from '../utils/oasesConstants';
import toast from 'react-hot-toast';

// ── Default question template ─────────────────────────────────────
const newQuestion = (order) => ({
  questionNo:         order,
  section:            'A',
  questionType:       'subjective',
  maxMarks:           0,
  steps:              [],
  isOptional:         false,
  optionGroup:        null,
  optionGroupAllowed: null,
  correctOption:      null,
  negativeMarks:      0,
  displayOrder:       order,
});

// ── Marks total helper ────────────────────────────────────────────
const mandatoryTotal = (questions) =>
  questions.filter((q) => !q.isOptional).reduce((s, q) => s + Number(q.maxMarks || 0), 0);

// ── Section options ───────────────────────────────────────────────
const SECTIONS    = ['A', 'B', 'C', 'D'];
const QTYPES      = ['subjective', 'mcq', 'fill_in_blank', 'short_answer'];
const MCQ_OPTIONS = ['A', 'B', 'C', 'D'];

// ── Single question row ───────────────────────────────────────────
const QuestionRow = ({
  q, idx, onChange, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
  isDragging,
}) => {
  const [open, setOpen] = useState(false);
  const update = (field, val) => onChange(idx, { ...q, [field]: val });
  const addStep = () =>
    update('steps', [...q.steps, { stepNo: q.steps.length + 1, maxStepMarks: 0 }]);
  const updateStep = (si, field, val) => {
    const steps = q.steps.map((s, i) =>
      i === si ? { ...s, [field]: Number(val) } : s
    );
    update('steps', steps);
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
      onDrop={() => onDrop(idx)}
      onDragEnd={onDragEnd}
      className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-150 ${
        isDragging ? 'opacity-40 border-indigo-400 border-dashed scale-[0.98]' : 'border-gray-200'
      }`}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="text-gray-300 cursor-grab active:cursor-grabbing select-none">
          <GripVertical className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold text-indigo-600 w-6 flex-shrink-0">Q{q.questionNo}</span>

        {/* Section */}
        <select
          value={q.section}
          onChange={(e) => update('section', e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none"
        >
          {SECTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Type */}
        <select
          value={q.questionType}
          onChange={(e) => update('questionType', e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none flex-1"
        >
          {QTYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>

        {/* Max marks */}
        <input
          type="number"
          min={0}
          value={q.maxMarks}
          onChange={(e) => update('maxMarks', Number(e.target.value))}
          className="w-16 text-xs border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
        <span className="text-xs text-gray-400">marks</span>

        {/* Optional toggle */}
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={q.isOptional}
            onChange={(e) => update('isOptional', e.target.checked)}
            className="w-3 h-3"
          />
          Optional
        </label>

        <button
          onClick={() => setOpen(!open)}
          className="p-1 rounded hover:bg-gray-100"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        <button onClick={() => onDelete(idx)} className="p-1 rounded hover:bg-red-50 text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-10 pb-4 space-y-3 bg-gray-50 border-t border-gray-100">
          {/* MCQ fields */}
          {q.questionType === 'mcq' && (
            <div className="flex gap-4 items-center">
              <div>
                <label className="text-xs text-gray-500">Correct Option</label>
                <select
                  value={q.correctOption || ''}
                  onChange={(e) => update('correctOption', e.target.value)}
                  className="ml-2 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none"
                >
                  <option value="">--</option>
                  {MCQ_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Negative Marks</label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={q.negativeMarks}
                  onChange={(e) => update('negativeMarks', Number(e.target.value))}
                  className="ml-2 w-14 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Optional group */}
          {q.isOptional && (
            <div className="flex gap-4 items-center">
              <div>
                <label className="text-xs text-gray-500">Option Group</label>
                <input
                  type="text"
                  value={q.optionGroup || ''}
                  onChange={(e) => update('optionGroup', e.target.value)}
                  placeholder="e.g. G1"
                  className="ml-2 w-16 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Attempt Any</label>
                <input
                  type="number"
                  min={1}
                  value={q.optionGroupAllowed || ''}
                  onChange={(e) => update('optionGroupAllowed', Number(e.target.value))}
                  className="ml-2 w-14 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500">Step Marks</span>
              <button
                onClick={addStep}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>
            {q.steps.map((step, si) => (
              <div key={si} className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 w-14">Step {step.stepNo}</span>
                <input
                  type="number"
                  min={0}
                  value={step.maxStepMarks}
                  onChange={(e) => updateStep(si, 'maxStepMarks', e.target.value)}
                  className="w-16 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                />
                <span className="text-xs text-gray-400">marks</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
const QuestionSchemePage = () => {
  const { examId }  = useParams();
  const navigate    = useNavigate();
  const csvInputRef = useRef(null);

  // ── Data fetching ─────────────────────────────────────────────
  // useGetExamQuery now exists in adminApi (single exam by ID)
  const { data: examData } = useGetExamQuery(examId, { skip: !examId });
  const { data: existing, isLoading, isError } = useSchemeQuery(examId);
  const saveMutation = useSaveScheme();
  const answerKeyMut = useUploadAnswerKey();

  const [questions, setQuestions] = useState([newQuestion(1)]);
  const [set,       setSet]       = useState('single');

  // ── Drag state ────────────────────────────────────────────────
  const dragIndexRef = useRef(null);
  const [draggingIdx, setDraggingIdx] = useState(null);

  const handleDragStart = useCallback((idx) => {
    dragIndexRef.current = idx;
    setDraggingIdx(idx);
  }, []);

  const handleDragOver = useCallback((idx) => {
    if (dragIndexRef.current === null || dragIndexRef.current === idx) return;
    setQuestions((prev) => {
      const reordered = Array.from(prev);
      const [removed] = reordered.splice(dragIndexRef.current, 1);
      reordered.splice(idx, 0, removed);
      dragIndexRef.current = idx;
      setDraggingIdx(idx);
      return reordered.map((q, i) => ({ ...q, questionNo: i + 1, displayOrder: i + 1 }));
    });
  }, []);

  const handleDrop = useCallback(() => {
    dragIndexRef.current = null;
    setDraggingIdx(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDraggingIdx(null);
  }, []);

  // ── Populate from existing scheme ─────────────────────────────
  useEffect(() => {
    if (existing?.questions) {
      setQuestions(existing.questions);
      setSet(existing.set || 'single');
    }
  }, [existing]);

  // ── Live marks counter ────────────────────────────────────────
  const total  = mandatoryTotal(questions);
  const target = examData?.data?.totalMarks ?? 0;
  const diff   = target > 0 ? target - total : null;

  const addQuestion = () =>
    setQuestions((prev) => [...prev, newQuestion(prev.length + 1)]);

  const deleteQuestion = (idx) =>
    setQuestions((prev) =>
      prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, questionNo: i + 1, displayOrder: i + 1 }))
    );

  const updateQuestion = (idx, updated) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? updated : q)));

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (diff !== null && diff !== 0) {
      toast.error(`Marks total (${total}) must equal max marks (${target}). Difference: ${diff}`);
      return;
    }
    if (diff === null && target === 0) {
      toast('ℹ️ Saving scheme without a max marks target. Set max marks in Exam → Subject Config first.', { duration: 4000 });
    }
    saveMutation.mutate({ examId, set, questions });
  };

  // ── CSV import for answer key ─────────────────────────────────
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const answerKey = data.map((row) => ({
          questionNo:    Number(row.questionNo || row.QuestionNo || row.q_no),
          correctOption: (row.correctOption || row.CorrectOption || row.answer || '').trim().toUpperCase(),
        })).filter((k) => k.questionNo && k.correctOption);

        if (answerKey.length === 0) {
          toast.error('CSV must have questionNo and correctOption columns');
          return;
        }
        answerKeyMut.mutate({ examId, answerKey });
        e.target.value = '';
      },
      error: () => toast.error('Failed to parse CSV'),
    });
  };

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN]}>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Exam Configs
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Question Scheme</h2>
            {examData?.data && (
              <p className="text-sm text-gray-500 mt-0.5">
                {examData.data.name}
                {target > 0 ? ` · Max marks: ${target}` : ''}
              </p>
            )}
          </div>

          {/* Marks counter */}
          <div className={`text-center px-5 py-3 rounded-xl border-2 ${
            diff === 0 ? 'border-green-400 bg-green-50'
            : diff === null ? 'border-gray-200 bg-gray-50'
            : 'border-amber-400 bg-amber-50'
          }`}>
            <p className={`text-2xl font-bold ${
              diff === 0 ? 'text-green-600' : diff === null ? 'text-gray-500' : 'text-amber-600'
            }`}>
              {total}{target > 0 ? ` / ${target}` : ''}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {diff === 0 ? '✅ Marks balanced'
               : diff === null ? 'No max marks configured'
               : `${Math.abs(diff)} marks ${diff > 0 ? 'short' : 'over'}`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-5">
          <button
            onClick={addQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
          >
            <Plus className="w-4 h-4 text-indigo-600" /> Add Question
          </button>

          {/* CSV import */}
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
          >
            <Upload className="w-4 h-4 text-cyan-600" />
            {answerKeyMut.isPending ? 'Importing…' : 'Import Answer Key (CSV)'}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />

          <div className="flex-1" />

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
          >
            {saveMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            Save Scheme
          </button>
        </div>

        {/* Warning if no exam config */}
        {isError && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            No existing scheme. You're creating a new one.
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center h-40 items-center text-indigo-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <QuestionRow
                key={`q-${idx}-${q.questionNo}`}
                q={q}
                idx={idx}
                onChange={updateQuestion}
                onDelete={deleteQuestion}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragging={draggingIdx === idx}
              />
            ))}
          </div>
        )}

        {questions.length === 0 && !isLoading && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No questions yet. Click "Add Question" to get started.</p>
          </div>
        )}
      </div>
    </OasesRoleGuard>
  );
};

export default QuestionSchemePage;
