// ══════════════════════════════════════════════════════════════════
// ExamWizardPage — Full 5-Step Wizard (Phases 4–8)
// Routes:
//   /admin/oases/exam/new         → new exam (Step 1)
//   /admin/oases/exam/:examId     → continue exam at ?step=N
//
// Step state lives in URL (?step=1..5) — refresh-safe.
// ══════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Wand2, ArrowLeft, CheckCircle2, ChevronRight,
  FileText, Upload, Users, BarChart2, ShieldCheck,
  Loader2, AlertCircle, X, RefreshCw, Check,
  CloudUpload, ClipboardList, User as UserIcon,
  Eye, TrendingUp, Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCreateExam, useUpdateExam, useUpdateExamStatus } from '../hooks/mutations/useExamMutations';
import { useExam } from '../hooks/queries/useExams';
import { useSheetList } from '../hooks/queries/useSheets';
import { uploadService, assignmentService } from '../services/uploadService';
import { resultService } from '../services/adminService';
import { reportService } from '../services/reportService'; // P1: needed for grade computation + full publish
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import oasesAxios from '../lib/axios';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import { OASES_ROLES } from '../utils/oasesConstants';
import toast from 'react-hot-toast';
import {
  useGetSessionsQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSubjectsQuery,
  useGetClassSubjectsQuery,
} from '@shared/lib/api/adminApi';

// ── Wizard steps config ───────────────────────────────────────────
const STEPS = [
  { no: 1, label: 'Setup',   icon: FileText   },
  { no: 2, label: 'Upload',  icon: Upload     },
  { no: 3, label: 'Assign',  icon: Users      },
  { no: 4, label: 'Monitor', icon: BarChart2  },
  { no: 5, label: 'Approve', icon: ShieldCheck},
];

const EXAM_TYPES = [
  { value: 'theory', label: 'Theory' },
  { value: 'mcq',    label: 'MCQ' },
  { value: 'mixed',  label: 'Mixed (Theory + MCQ)' },
];

// ═════════════════════════════════════════════════════════════════
// Shared — Step Progress Bar
// ═════════════════════════════════════════════════════════════════
const StepBar = ({ currentStep }) => (
  <div className="bg-white border-b border-gray-100 px-6 py-4">
    <div className="flex items-center max-w-3xl">
      {STEPS.map((step, idx) => {
        const done   = step.no < currentStep;
        const active = step.no === currentStep;
        const Icon   = step.icon;
        return (
          <React.Fragment key={step.no}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                done   ? 'bg-indigo-600 border-indigo-600 text-white'
                : active ? 'bg-white border-indigo-500 text-indigo-600'
                : 'bg-white border-gray-200 text-gray-300'
              }`}>
                {done ? <CheckCircle2 size={16} /> : <Icon size={14} />}
              </div>
              <span className={`text-[11px] mt-1 font-semibold ${
                active ? 'text-indigo-600' : done ? 'text-indigo-400' : 'text-gray-300'
              }`}>{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mb-5 mx-1.5 transition-all"
                style={{ background: done ? '#6366f1' : '#f1f5f9' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════
// Shared — Reusable form primitives
// ═════════════════════════════════════════════════════════════════
const Field = ({ label, required, error, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Input = React.forwardRef(({ error, ...props }, ref) => (
  <input ref={ref} {...props}
    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition ${
      error ? 'border-red-300 focus:ring-red-200 bg-red-50'
            : 'border-gray-200 focus:ring-indigo-200 focus:border-indigo-400 bg-white'
    }`}
  />
));
Input.displayName = 'Input';

const Select = React.forwardRef(({ error, children, ...props }, ref) => (
  <select ref={ref} {...props}
    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition bg-white ${
      error ? 'border-red-300 focus:ring-red-200'
            : 'border-gray-200 focus:ring-indigo-200 focus:border-indigo-400'
    }`}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

// ═════════════════════════════════════════════════════════════════
// Shared — Exam info banner (shown on steps 2–5)
// ═════════════════════════════════════════════════════════════════
const ExamBanner = ({ exam }) => {
  if (!exam) return null;
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 mb-6">
      <p className="text-sm font-semibold text-indigo-800">{exam.examName}</p>
      <p className="text-xs text-indigo-500 mt-0.5">
        {exam.classLevel} · {exam.subjectName} ({exam.subjectCode}) · {exam.totalMarks} marks · {exam.academicYear}
      </p>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// STEP 1 — Exam Setup Form
// ═════════════════════════════════════════════════════════════════
// ─── Reusable small select style ─────────────────────────────────────────────
const SEL_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition bg-white border-gray-200 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

const Step1Form = ({ examId, existingData, onCreated }) => {
  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();
  const isEdit = !!examId;

  // ── Cascading selection IDs (not stored in form — used to drive child queries) ──
  const [selSessionId, setSelSessionId] = useState('');
  const [selClassId,   setSelClassId]   = useState('');
  const [selClassObj,  setSelClassObj]  = useState(null);

  // ── Reference data queries ────────────────────────────────────────────────────
  const { data: sessRes,    isLoading: sessLoading }    = useGetSessionsQuery();
  const { data: clsRes,     isLoading: clsLoading }     = useGetClassesQuery(selSessionId, { skip: !selSessionId });
  const { data: secRes,     isLoading: secLoading }     = useGetSectionsQuery({ classId: selClassId }, { skip: !selClassId });
  const { data: clsSubjRes, isLoading: clsSubjLoading } = useGetClassSubjectsQuery({ classId: selClassId }, { skip: !selClassId });
  const { data: allSubjRes, isLoading: allSubjLoading } = useGetSubjectsQuery();

  const sessions = sessRes?.data  || [];
  const classes  = clsRes?.data   || [];
  const sections = secRes?.data   || [];

  // Subjects: prefer class-mapped list when a class is chosen
  const subjects = selClassId
    ? (clsSubjRes?.data || []).map(m => m.subjectId).filter(Boolean)
    : (allSubjRes?.data || []);
  const subjectsLoading = selClassId ? clsSubjLoading : allSubjLoading;

  // ── Form ──────────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, watch, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { examType: 'theory', dailyEvalLimit: 20, ...existingData },
  });

  useEffect(() => {
    if (existingData) reset({ examType: 'theory', dailyEvalLimit: 20, ...existingData });
  }, [existingData, reset]);

  const totalMarks    = watch('totalMarks');
  const curClassLevel = watch('classLevel');
  const curSubjName   = watch('subjectName');
  const curSubjCode   = watch('subjectCode');
  const curAcYear     = watch('academicYear');

  // ── Cascade handlers ──────────────────────────────────────────────────────────
  const handleSessionChange = (e) => {
    const sid  = e.target.value;
    const sess = sessions.find(s => s._id === sid);
    setSelSessionId(sid);
    setSelClassId('');
    setSelClassObj(null);
    setValue('academicYear', sess?.name || '', { shouldValidate: true });
    setValue('classLevel',   '', { shouldValidate: false });
    setValue('subjectCode',  '', { shouldValidate: false });
    setValue('subjectName',  '', { shouldValidate: false });
  };

  const handleClassChange = (e) => {
    const cid = e.target.value;
    const cls = classes.find(c => c._id === cid);
    setSelClassId(cid);
    setSelClassObj(cls || null);
    setValue('classLevel',  cls?.name || '', { shouldValidate: true });
    setValue('subjectCode', '', { shouldValidate: false });
    setValue('subjectName', '', { shouldValidate: false });
  };

  const handleSectionChange = (e) => {
    const sid = e.target.value;
    if (!sid) {
      // No section — classLevel is just the class name
      setValue('classLevel', selClassObj?.name || '', { shouldValidate: true });
      return;
    }
    const sec   = sections.find(s => s._id === sid);
    const level = `${selClassObj?.name || ''}${sec?.name || ''}`;
    setValue('classLevel', level, { shouldValidate: true });
  };

  const handleSubjectChange = (e) => {
    const sid  = e.target.value;
    const subj = subjects.find(s => s._id === sid);
    if (subj) {
      setValue('subjectName', subj.name, { shouldValidate: true });
      setValue('subjectCode', subj.code, { shouldValidate: true });
    } else {
      setValue('subjectName', '', { shouldValidate: false });
      setValue('subjectCode', '', { shouldValidate: false });
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = async (values) => {
    const payload = {
      examName:       values.examName.trim(),
      subjectCode:    values.subjectCode.trim(),
      subjectName:    values.subjectName.trim(),
      classLevel:     values.classLevel.trim(),
      academicYear:   values.academicYear.trim(),
      examType:       values.examType,
      totalMarks:     Number(values.totalMarks),
      passingMarks:   Number(values.passingMarks),
      dailyEvalLimit: Number(values.dailyEvalLimit || 20),
    };
    if (values.evalDeadline) payload.evalDeadline = values.evalDeadline;
    if (values.instructions)  payload.instructions  = values.instructions.trim();

    if (payload.passingMarks > payload.totalMarks) {
      toast.error('Passing marks cannot exceed total marks'); return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: examId, ...payload });
        onCreated(examId);
      } else {
        const result = await createMutation.mutateAsync(payload);
        const newId  = result?._id || result?.id;
        if (!newId) { toast.error('Created but could not navigate — check exam list.'); return; }
        toast.success('Exam created! Now upload answer sheet copies.');
        onCreated(newId);
      }
    } catch { /* mutation onError shows toast */ }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const SkeletonRow = () => <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />;

  const DisabledPill = ({ text }) => (
    <div className={`${SEL_CLS} text-gray-400 cursor-not-allowed`}>{text}</div>
  );

  // In edit mode, key identity fields show as locked badges
  const LockedBadge = ({ value }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-sm text-gray-500 font-mono">{value || '—'}</span>
      <span className="ml-auto text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Locked</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Hidden registered fields — set programmatically via setValue */}
      <input type="hidden" {...register('academicYear', { required: 'Please select an academic session' })} />
      <input type="hidden" {...register('classLevel',   { required: 'Please select a class' })} />
      <input type="hidden" {...register('subjectCode',  { required: 'Please select a subject' })} />
      <input type="hidden" {...register('subjectName',  { required: 'Please select a subject' })} />

      {/* ── Exam Name ─────────────────────────────────────────────────────── */}
      <Field label="Exam Name" required error={errors.examName?.message}>
        <Input
          {...register('examName', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })}
          placeholder="e.g. Half Yearly Exam 2026"
          error={errors.examName}
        />
      </Field>

      {/* ── Academic Year  +  Exam Type ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Academic Year" required error={errors.academicYear?.message}>
          {isEdit ? (
            <LockedBadge value={existingData?.academicYear} />
          ) : sessLoading ? (
            <SkeletonRow />
          ) : (
            <select
              onChange={handleSessionChange}
              defaultValue=""
              className={SEL_CLS}
            >
              <option value="" disabled>Select session…</option>
              {sessions.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name}{s.isActive ? ' ✓ Active' : ''}
                </option>
              ))}
            </select>
          )}
          {errors.academicYear && (
            <p className="text-xs text-red-500 mt-1">{errors.academicYear.message}</p>
          )}
        </Field>

        <Field label="Exam Type" required>
          <Select {...register('examType')}>
            {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
      </div>

      {/* ── Class  +  Section ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Class */}
        <Field label="Class" required error={!isEdit ? errors.classLevel?.message : undefined}>
          {isEdit ? (
            <LockedBadge value={existingData?.classLevel} />
          ) : !selSessionId ? (
            <DisabledPill text="Select a session first" />
          ) : clsLoading ? (
            <SkeletonRow />
          ) : classes.length === 0 ? (
            <DisabledPill text="No classes in this session" />
          ) : (
            <select onChange={handleClassChange} defaultValue="" className={SEL_CLS}>
              <option value="" disabled>Select class…</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}
        </Field>

        {/* Section */}
        <Field label="Section" hint="Optional — skip if no sections">
          {isEdit ? (
            <DisabledPill text="— (locked)" />
          ) : !selClassId ? (
            <DisabledPill text="Select a class first" />
          ) : secLoading ? (
            <SkeletonRow />
          ) : sections.length === 0 ? (
            <DisabledPill text="No sections — class only" />
          ) : (
            <select onChange={handleSectionChange} defaultValue="" className={SEL_CLS}>
              <option value="">None (class-level only)</option>
              {sections.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {/* Class-level preview chip */}
      {!isEdit && curClassLevel && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs">
          <span className="text-indigo-500 font-semibold">Class / Level:</span>
          <span className="font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{curClassLevel}</span>
          {curAcYear && (
            <span className="ml-auto text-indigo-400">{curAcYear}</span>
          )}
        </div>
      )}

      {/* ── Subject ───────────────────────────────────────────────────────── */}
      <Field
        label="Subject"
        required
        error={errors.subjectName?.message || errors.subjectCode?.message}
        hint={selClassId ? 'Showing subjects mapped to this class' : 'All subjects — select a class to filter'}
      >
        {isEdit ? (
          <LockedBadge value={`${existingData?.subjectName || ''} (${existingData?.subjectCode || ''})`} />
        ) : subjectsLoading ? (
          <SkeletonRow />
        ) : (
          <select onChange={handleSubjectChange} defaultValue="" className={SEL_CLS}>
            <option value="" disabled>Select subject…</option>
            {subjects.length === 0 && (
              <option disabled>
                {selClassId
                  ? 'No subjects mapped to this class — add them in School Settings'
                  : 'No subjects found'}
              </option>
            )}
            {subjects.map(s => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        )}
      </Field>

      {/* Subject preview chip */}
      {!isEdit && curSubjName && (
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs">
          <span className="font-mono bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{curSubjCode}</span>
          <span className="text-gray-600">{curSubjName}</span>
        </div>
      )}

      {/* ── Total Marks  +  Passing Marks ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Total Marks" required error={errors.totalMarks?.message}>
          <Input
            type="number" min="1"
            {...register('totalMarks', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })}
            placeholder="e.g. 80"
            error={errors.totalMarks}
          />
        </Field>
        <Field
          label="Passing Marks"
          required
          error={errors.passingMarks?.message}
          hint={totalMarks ? `Out of ${totalMarks}` : ''}
        >
          <Input
            type="number" min="1"
            {...register('passingMarks', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })}
            placeholder="e.g. 33"
            error={errors.passingMarks}
          />
        </Field>
      </div>

      {/* ── Evaluation Deadline  +  Daily Eval Limit ──────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Evaluation Deadline" error={errors.evalDeadline?.message} hint="Optional — future date">
          <Input
            type="date"
            {...register('evalDeadline')}
            min={new Date().toISOString().split('T')[0]}
            error={errors.evalDeadline}
          />
        </Field>
        <Field label="Daily Eval Limit" error={errors.dailyEvalLimit?.message} hint="Max copies per evaluator/day">
          <Input
            type="number" min="1" max="200"
            {...register('dailyEvalLimit')}
            placeholder="20"
            error={errors.dailyEvalLimit}
          />
        </Field>
      </div>

      {/* ── Instructions ──────────────────────────────────────────────────── */}
      <Field label="Evaluation Instructions" hint="Optional — shown to evaluators during marking">
        <textarea
          {...register('instructions')}
          rows={3}
          placeholder="e.g. Award full marks for steps shown correctly…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
        />
      </Field>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}
          {pending
            ? (isEdit ? 'Saving…'    : 'Creating…')
            : (isEdit ? 'Save & Continue' : 'Create & Continue')}
          {!pending && <ChevronRight size={15} />}
        </button>
      </div>
    </form>
  );
};

// ═════════════════════════════════════════════════════════════════
// STEP 2 — Upload Copies
// ═════════════════════════════════════════════════════════════════
const PROC_STATUS_META = {
  pending:    { label: 'Queued',     color: 'bg-gray-100 text-gray-500',   icon: '⏳' },
  processing: { label: 'Processing', color: 'bg-amber-100 text-amber-700', icon: '⚙️' },
  done:       { label: 'Ready',      color: 'bg-green-100 text-green-700', icon: '✅' },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-600',     icon: '❌' },
};

const Step2Upload = ({ exam, onNext, onBack }) => {
  const examId        = exam?._id;
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef  = useRef();
  const qc            = useQueryClient();

  // Live sheet list — auto-polls while any are processing
  const { data: sheetData, isLoading } = useSheetList(examId);
  const sheets   = (sheetData?.sheets ?? []).filter(s => s.status !== 'rejected');
  const total    = sheets.length;
  const readyCt  = sheets.filter(s => s.processingStatus === 'done').length;
  const pendCt   = sheets.filter(s => s.processingStatus === 'pending' || s.processingStatus === 'processing').length;
  const failCt   = sheets.filter(s => s.processingStatus === 'failed').length;

  const doUpload = useCallback(async (files) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf');
    if (!pdfs.length) { toast.error('Please select PDF files only'); return; }
    if (pdfs.length > 30) { toast.error('Maximum 30 files per upload batch'); return; }

    const fd = new FormData();
    pdfs.forEach(f => fd.append('sheets', f));

    setUploading(true); setUploadPct(0);
    try {
      await uploadService.uploadSheets(examId, fd, pct => setUploadPct(pct));
      toast.success(`${pdfs.length} file(s) uploaded. Processing…`);
      qc.invalidateQueries({ queryKey: ['oases', 'sheets', examId] });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false); setUploadPct(0);
    }
  }, [examId, qc]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    doUpload(e.dataTransfer.files);
  };

  const handleReprocess = async (sheetId) => {
    try {
      await uploadService.reprocess(sheetId);
      toast.success('Re-queued for processing');
      qc.invalidateQueries({ queryKey: ['oases', 'sheets', examId] });
    } catch { toast.error('Reprocess failed'); }
  };

  const handleDelete = async (sheetId, filename) => {
    if (!window.confirm(`Remove "${filename}" from this exam? This cannot be undone.`)) return;
    try {
      await uploadService.reject(sheetId, 'Removed by admin');
      toast.success('Sheet removed');
      qc.invalidateQueries({ queryKey: ['oases', 'sheets', examId] });
    } catch { toast.error('Could not remove sheet'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800">Upload Answer Copies</h2>
        <p className="text-sm text-gray-400 mt-0.5">Upload scanned PDF copies of answer sheets. One PDF per student.</p>
      </div>

      <ExamBanner exam={exam} />

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition mb-5 ${
          dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input ref={fileInputRef} type="file" accept="application/pdf" multiple hidden
          onChange={e => doUpload(e.target.files)} />
        <CloudUpload size={36} className={`mx-auto mb-3 ${dragging ? 'text-indigo-400' : 'text-gray-300'}`} />
        {uploading ? (
          <>
            <p className="text-sm font-medium text-indigo-600">Uploading… {uploadPct}%</p>
            <div className="mt-3 bg-gray-200 rounded-full h-2 max-w-xs mx-auto overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Drag & drop PDFs here, or <span className="text-indigo-600">click to browse</span></p>
            <p className="text-xs text-gray-400 mt-1">PDF only · Max 30 files per batch</p>
          </>
        )}
      </div>

      {/* Stats row */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Uploaded', value: total,   color: 'bg-gray-50 border-gray-200 text-gray-700' },
            { label: 'Ready',          value: readyCt, color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Processing',     value: pendCt,  color: 'bg-amber-50 border-amber-200 text-amber-700' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.color}`}>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs mt-0.5 font-medium opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sheet list */}
      {isLoading ? (
        <div className="flex justify-center py-8 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : sheets.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploaded Files</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {sheets.map(sheet => {
              const meta = PROC_STATUS_META[sheet.processingStatus] || PROC_STATUS_META.pending;
              return (
                <div key={sheet._id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{sheet.originalFilename || sheet.anonymousCode}</p>
                      <p className="text-xs text-gray-400">{sheet.totalPages} page{sheet.totalPages !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    {sheet.processingStatus === 'failed' && (
                      <button onClick={() => handleReprocess(sheet._id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition" title="Retry">
                        <RefreshCw size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(sheet._id, sheet.originalFilename || sheet.anonymousCode)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                      title="Remove this sheet">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">No files uploaded yet.</div>
      )}

      {failCt > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5">
          <AlertCircle size={15} /> {failCt} file(s) failed processing. Click retry to re-queue.
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">
          <ArrowLeft size={14} /> Back to Setup
        </button>
        <button onClick={onNext} disabled={total === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition">
          Continue to Assign <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// STEP 3 — Assign Teacher
// ═════════════════════════════════════════════════════════════════
const useEvaluators = () =>
  useQuery({
    queryKey: ['oases', 'evaluators'],
    queryFn:  () => oasesAxios.get('/assignment/evaluators').then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

const useAssignments = (examId) =>
  useQuery({
    queryKey: ['oases', 'assignments', examId],
    queryFn:  () => oasesAxios.get('/assignment', { params: { examConfigId: examId } }).then(r => r.data.data),
    enabled:  !!examId,
    staleTime: 1000 * 30,
  });

const Step3Assign = ({ exam, onNext, onBack }) => {
  const examId = exam?._id;
  const [selectedIds, setSelectedIds] = useState([]);
  const [assigning, setAssigning]     = useState(false);
  const qc = useQueryClient();

  const { data: evaluators = [], isLoading: evalLoading } = useEvaluators();
  const { data: assignments = [], refetch: refetchAssign } = useAssignments(examId);
  const { data: sheetData, isLoading: isSheetLoading } = useSheetList(examId);
  // Total count: all non-rejected sheets (show regardless of assignment/processing status)
  const totalSheetCount = (sheetData?.sheets ?? []).filter(s => s.status !== 'rejected').length;
  // Unassigned: for assignment button enable logic only
  const assignableCount = (sheetData?.sheets ?? []).filter(s => s.status !== 'rejected' && !s.eval1AssignedTo).length;

  const assignedEvalIds = new Set(assignments.map(a => a.evaluatorId?._id || a.evaluatorId));

  const toggleEval = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      const res = await oasesAxios.post(`/assignment/auto/${examId}`);
      const { assigned, teacherName } = res.data?.data || {};
      if (assigned === 0) {
        toast.success('All sheets already assigned!');
      } else {
        toast.success(`✓ ${assigned} sheet(s) auto-assigned to ${teacherName}`);
      }
      qc.invalidateQueries({ queryKey: ['oases', 'assignments', examId] });
      qc.invalidateQueries({ queryKey: ['oases', 'sheets', examId] });
      refetchAssign();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Auto-assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedIds.length) { toast.error('Select at least one teacher'); return; }
    setAssigning(true);
    try {
      const result = await assignmentService.bulkAssign(examId, {
        evaluatorIds: selectedIds,
        strategy:     'round-robin',
        round:        1,
      });
      toast.success(`${result?.assigned ?? assignableCount} sheets assigned!`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['oases', 'assignments', examId] });
      refetchAssign();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800">Assign Evaluator</h2>
        <p className="text-sm text-gray-400 mt-0.5">Select one or more teachers to evaluate the uploaded copies.</p>
      </div>
      <ExamBanner exam={exam} />

      {/* Uploaded copies count */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 mb-5 flex items-center gap-3">
        <ClipboardList size={18} className="text-indigo-500 flex-shrink-0" />
        {isSheetLoading ? (
          <div className="h-4 w-48 bg-indigo-100 rounded animate-pulse" />
        ) : (
          <p className="text-sm text-indigo-700 font-medium">
            {totalSheetCount > 0
              ? `${totalSheetCount} sheet${totalSheetCount > 1 ? 's' : ''} uploaded${assignableCount > 0 ? ` · ${assignableCount} unassigned` : ' · all assigned ✓'}`
              : 'No sheets uploaded yet. Go back and upload PDFs in Step 2.'}
          </p>
        )}
      </div>

      {/* ⚡ Auto-Assign Banner — shown when there are unassigned sheets */}
      {assignableCount > 0 && (
        <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚡</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-800">
                Auto-Assign from Subject Teacher
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Automatically assigns all {assignableCount} unassigned sheet{assignableCount > 1 ? 's' : ''} to
                the teacher mapped to <strong>{exam?.classLevel}</strong> — <strong>{exam?.subjectCode}</strong>
                &nbsp;in School Settings.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoAssign}
            disabled={assigning}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {assigning
              ? <><Loader2 size={15} className="animate-spin" /> Assigning…</>
              : <><Users size={15} /> Auto-Assign {assignableCount} Sheet{assignableCount > 1 ? 's' : ''} to Subject Teacher</>}
          </button>
        </div>
      )}

      {/* Teacher list — manual selection */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">Select Teachers:</p>
        {evalLoading ? (
          <div className="flex justify-center py-6 text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
        ) : evaluators.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No teachers found. Teachers must have ERP role "teacher" to appear here.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {evaluators.map(ev => {
              const isSelected  = selectedIds.includes(ev._id);
              const isAssigned  = assignedEvalIds.has(ev._id);
              // Allow re-clicking an assigned teacher if there are still unassigned sheets
              const isClickable = !isAssigned || assignableCount > 0;
              return (
                <div key={ev._id}
                  onClick={() => isClickable && toggleEval(ev._id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                    isAssigned && assignableCount === 0
                      ? 'border-green-200 bg-green-50 cursor-default'
                      : isAssigned && assignableCount > 0
                        ? 'border-green-200 bg-green-50 hover:border-indigo-300 cursor-pointer'
                      : isSelected
                        ? 'border-indigo-400 bg-indigo-50 cursor-pointer'
                      : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                    isSelected  ? 'bg-indigo-500 border-indigo-500'
                    : isAssigned ? 'bg-green-500 border-green-500'
                    : 'border-gray-300'
                  }`}>
                    {(isSelected || (isAssigned && !isSelected)) && <Check size={11} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {ev.firstName} {ev.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{ev.email}</p>
                  </div>
                  {isAssigned && !isSelected && (
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      Assigned
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign button */}
      {selectedIds.length > 0 && (
        <button onClick={handleAssign} disabled={assigning || assignableCount === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {assigning ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
          {assigning ? 'Assigning…' : `Assign ${assignableCount} ${assignableCount === 1 ? 'copy' : 'copies'} to ${selectedIds.length} teacher${selectedIds.length > 1 ? 's' : ''}`}
        </button>
      )}

      {/* Current assignments */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Assignments</p>
          </div>
          {assignments.map(a => (
            <div key={a._id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {a.evaluatorId?.firstName || '—'} {a.evaluatorId?.lastName || ''}
                </p>
                <p className="text-xs text-gray-400">Round {a.round} · {a.totalAssigned} copies</p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {a.totalAssigned} sheets
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={onNext} disabled={assignments.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition">
          Start Monitoring <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// STEP 4 — Monitor Progress
// ═════════════════════════════════════════════════════════════════
const SHEET_STATUS_META = {
  // ── actual backend SHEET_STATUS values ───────────────────────────
  uploaded:     { label: 'Pending',      color: 'bg-gray-100 text-gray-500'       },
  assigned:     { label: 'Assigned',     color: 'bg-blue-100 text-blue-700'       },
  in_progress:  { label: 'Evaluating',   color: 'bg-amber-100 text-amber-700'     },
  eval1_done:   { label: 'Done (R1)',    color: 'bg-green-100 text-green-700'     },
  eval2_done:   { label: 'Done (R2)',    color: 'bg-teal-100 text-teal-700'       },
  conflict:     { label: 'Conflict',     color: 'bg-red-100 text-red-600'         },
  head_review:  { label: 'Head Review',  color: 'bg-orange-100 text-orange-700'   },
  locked:       { label: 'Evaluated',    color: 'bg-emerald-100 text-emerald-700' },
  submitted:    { label: 'Submitted',    color: 'bg-indigo-100 text-indigo-700'   },
  approved:     { label: 'Approved',     color: 'bg-emerald-100 text-emerald-700' },
  ufm_flagged:  { label: 'UFM Flagged', color: 'bg-red-100 text-red-700'         },
  rejected:     { label: 'Rejected',     color: 'bg-gray-200 text-gray-500'       },
};

const Step4Monitor = ({ exam, onNext, onBack }) => {
  const examId = exam?._id;
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: sheetData, isLoading, refetch } = useSheetList(examId, {}, {
    refetchInterval: 30000, // poll every 30s
  });
  const sheets    = sheetData?.sheets ?? [];
  const total     = sheetData?.total  ?? 0;
  // Use ACTUAL backend SHEET_STATUS values (eval1_done / eval2_done / locked / submitted / approved)
  const DONE_STATUSES = ['eval1_done', 'eval2_done', 'locked', 'submitted', 'approved'];
  const evaluated = sheets.filter(s => DONE_STATUSES.includes(s.status)).length;
  const pending   = total - evaluated;
  const pct       = total > 0 ? Math.round((evaluated / total) * 100) : 0;
  const allDone   = total > 0 && pending === 0;

  const filtered = filterStatus === 'all' ? sheets : sheets.filter(s => s.status === filterStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Monitor Progress</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track evaluation progress. Auto-refreshes every 30 seconds.</p>
        </div>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition" title="Refresh now">
          <RefreshCw size={16} />
        </button>
      </div>

      <ExamBanner exam={exam} />

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Overall Progress</p>
          <span className="text-sm font-bold text-indigo-600">{evaluated}/{total} evaluated</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{pct}% complete · {pending} pending</p>

        {allDone && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 size={15} /> All copies evaluated! You can now approve results.
          </div>
        )}
      </div>

      {/* Filter tabs — use real backend status names */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {[
          { key: 'all',         label: 'All'        },
          { key: 'assigned',    label: 'Assigned'   },
          { key: 'in_progress', label: 'Evaluating' },
          { key: 'eval1_done',  label: 'Done (R1)'  },
          { key: 'eval2_done',  label: 'Done (R2)'  },
          { key: 'locked',      label: 'Evaluated'  },
          { key: 'conflict',    label: 'Conflict'   },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterStatus === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Sheet table */}
      {isLoading ? (
        <div className="flex justify-center py-8 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Pages</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No sheets found.</td></tr>
                ) : filtered.map(sheet => {
                  const meta = SHEET_STATUS_META[sheet.status] || SHEET_STATUS_META.uploaded;
                  return (
                    <tr key={sheet._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{sheet.anonymousCode || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{sheet.totalPages}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link to={`/admin/oases/evaluator/sheet/${sheet._id}`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                          <Eye size={11} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          {allDone ? 'Approve Results' : 'Proceed to Approval'}
          <ChevronRight size={15} />
        </button>
      </div>

      {!allDone && (
        <p className="text-xs text-amber-600 text-center mt-2">
          ⚠️ {pending} copies still pending. You can proceed but unevaluated copies won't appear in results.
        </p>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// STEP 5 — Approve & Publish
// ═════════════════════════════════════════════════════════════════
const Step5Approve = ({ exam, onBack, navigate }) => {
  const examId = exam?._id;
  const [approved, setApproved] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [resultData, setResultData] = useState(null);
  const qc = useQueryClient();

  const { data: sheetData } = useSheetList(examId);
  const sheets    = sheetData?.sheets ?? [];
  const total     = sheetData?.total  ?? 0;
  // Use ACTUAL backend SHEET_STATUS values (matches Step4Monitor)
  const DONE_STATUSES = ['eval1_done', 'eval2_done', 'locked', 'submitted', 'approved'];
  const evaluated = sheets.filter(s => DONE_STATUSES.includes(s.status)).length;
  const pending   = total - evaluated;

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Step 1: Create ResultSheet documents from all locked AnswerSheets
      const generated = await resultService.generate(examId);
      toast.success(`${generated?.generated ?? 0} result sheet(s) created.`);

      // Step 2: Compute CBSE grades + ranks (reportController — P1 fix)
      await reportService.generate(examId);
      toast.success('Grades and ranks computed.');

      // Step 3: Full publish — decrypts rollNo, links Student model, sets isPublished
      // Uses reportController.publishResults via the fixed resultRoutes (P1 fix)
      const published = await resultService.publish(examId);

      setResultData({ generated, published });
      setApproved(true);
      qc.invalidateQueries({ queryKey: ['oases', 'examConfigs'] });
      toast.success('Exam approved and results published!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  if (approved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">Exam Approved!</h2>
          <p className="text-sm text-gray-500 mt-1">{exam?.examName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{evaluated} copies approved · Results ready</p>
        </div>
        <button onClick={() => navigate('/admin/oases')}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800">Approve & Publish</h2>
        <p className="text-sm text-gray-400 mt-0.5">Review the final summary before approving.</p>
      </div>

      <ExamBanner exam={exam} />

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Exam Summary</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Copies',  value: total,     color: 'text-gray-800' },
            { label: 'Evaluated',     value: evaluated, color: 'text-green-600' },
            { label: 'Pending',       value: pending,   color: pending > 0 ? 'text-amber-600' : 'text-green-600' },
            { label: 'Ready to Publish', value: evaluated, color: 'text-indigo-600' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-3">
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Warning if pending */}
      {pending > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            <strong>{pending} copies</strong> are still pending evaluation. They will not be included in the published results.
          </p>
        </div>
      )}

      {/* Approve box */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-5 mb-5">
        <p className="text-sm font-semibold text-gray-800 mb-2">⚠️ Confirm Approval</p>
        <p className="text-sm text-gray-600 mb-4">
          You are about to approve <strong>{evaluated}</strong> evaluated copies for{' '}
          <strong>{exam?.classLevel} — {exam?.subjectCode} — {exam?.examName}</strong>.
          This action will publish results. It cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onBack}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
            Go Back
          </button>
          <button onClick={handleApprove} disabled={loading || evaluated === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {loading ? 'Approving…' : `Approve ${evaluated} copies`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// Main — ExamWizardPage
// ═════════════════════════════════════════════════════════════════
const ExamWizardPage = () => {
  const navigate           = useNavigate();
  const { examId }         = useParams();
  const [searchParams]     = useSearchParams();

  const isNew  = !examId;
  const step   = Math.min(Math.max(Number(searchParams.get('step') || 1), 1), 5);

  const { data: examData, isLoading: examLoading } = useExam(examId);
  const existingExam = examData?.config || examData;

  const goToStep = (s, id) => {
    const targetId = id || examId;
    if (targetId) navigate(`/admin/oases/exam/${targetId}?step=${s}`);
  };

  const handleStep1Created = (newId) => navigate(`/admin/oases/exam/${newId}?step=2`);
  const handleBack = () => step === 1 ? navigate('/admin/oases/exams') : goToStep(step - 1);
  const handleNext = () => goToStep(step + 1);

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.SUPER_ADMIN]}>
      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/admin/oases')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Back to OASES">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Wand2 size={18} className="text-indigo-600" />
              {isNew ? 'New Exam' : `${existingExam?.examName || 'Exam'} — Continue Setup`}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of {STEPS.length} · {STEPS[step - 1]?.label}</p>
          </div>
        </div>

        <StepBar currentStep={step} />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Loading existing exam for steps 2-5 */}
            {examLoading && examId && step > 1 && (
              <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading exam details…</span>
              </div>
            )}

            {/* Step 1 — loading state when editing */}
            {step === 1 && examLoading && examId && (
              <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading exam details…</span>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (!examId || !examLoading) && (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800">Exam Setup</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Fill in basic details. Editable anytime while in draft.</p>
                </div>
                <Step1Form examId={examId} existingData={existingExam} onCreated={handleStep1Created} />
              </>
            )}

            {/* Step 2 */}
            {step === 2 && !examLoading && existingExam && (
              <Step2Upload exam={existingExam} onBack={handleBack} onNext={handleNext} />
            )}

            {/* Step 3 */}
            {step === 3 && !examLoading && existingExam && (
              <Step3Assign exam={existingExam} onBack={handleBack} onNext={handleNext} />
            )}

            {/* Step 4 */}
            {step === 4 && !examLoading && existingExam && (
              <Step4Monitor exam={existingExam} onBack={handleBack} onNext={handleNext} />
            )}

            {/* Step 5 */}
            {step === 5 && !examLoading && existingExam && (
              <Step5Approve exam={existingExam} onBack={handleBack} navigate={navigate} />
            )}

          </div>
        </div>
      </div>
    </OasesRoleGuard>
  );
};

export default ExamWizardPage;
