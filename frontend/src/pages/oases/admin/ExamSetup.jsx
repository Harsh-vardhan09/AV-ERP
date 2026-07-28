// ══════════════════════════════════════════════════════════════════
// OASES — Admin: ExamSetup page (Sprint 1 — full implementation)
// DataTable + filter by status + Sheet drawer with React Hook Form
// ══════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Plus, Settings2, Loader2, ChevronRight,
  Filter, RefreshCw, Archive, Pencil, ToggleRight,
} from 'lucide-react';
import { useExamList } from '../hooks/queries/useExams';
import {
  useCreateExam, useUpdateExam, useUpdateExamStatus, useDeleteExam,
} from '../hooks/mutations/useExamMutations';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import { OASES_ROLES } from '../utils/oasesConstants';
import toast from 'react-hot-toast';

// ── Zod schema (mirrors backend) ─────────────────────────────────
const examSchema = z.object({
  examName:          z.string().min(2, 'Name required'),
  subjectCode:       z.string().min(1, 'Subject code required'),
  subjectName:       z.string().min(2, 'Subject name required'),
  classLevel:        z.string().min(1, 'Class required'),
  academicYear:      z.string().min(4, 'e.g. 2024-25'),
  examType:          z.enum(['theory', 'mcq', 'mixed']).default('theory'),
  setType:           z.enum(['single', 'multi']).default('single'),
  totalMarks:        z.coerce.number().positive(),
  passingMarks:      z.coerce.number().positive(),
  doubleEval:        z.boolean().default(false),
  conflictThreshold: z.coerce.number().optional(),
  dailyEvalLimit:    z.coerce.number().int().min(1).default(20),
  evalDeadline:      z.string().optional(),
  instructions:      z.string().optional(),
}).refine(
  (d) => !d.doubleEval || (d.conflictThreshold && d.conflictThreshold > 0),
  { message: 'Conflict threshold required when double evaluation is enabled', path: ['conflictThreshold'] }
);

// ── Status badge ─────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    draft:       'bg-gray-100 text-gray-600',
    active:      'bg-blue-100 text-blue-700',
    evaluation:  'bg-violet-100 text-violet-700',
    closed:      'bg-green-100 text-green-700',
    archived:    'bg-red-100 text-red-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

// ── Status transition options ─────────────────────────────────────
const NEXT_STATUS = {
  draft:      'active',
  active:     'evaluation',
  evaluation: 'closed',
};

// ── ExamForm (inside drawer) ──────────────────────────────────────
const ExamForm = ({ onClose, editData }) => {
  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();
  const isEdit = !!editData;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver:      zodResolver(examSchema),
    defaultValues: editData || {
      examType: 'theory', setType: 'single', doubleEval: false, dailyEvalLimit: 20,
    },
  });

  const doubleEval = watch('doubleEval');

  const onSubmit = async (data) => {
    if (isEdit) {
      await updateMutation.mutateAsync({ id: editData._id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onClose();
  };

  const field = (name, label, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        {...register(name, opts)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />
      {errors[name] && <p className="text-xs text-red-500 mt-0.5">{errors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {field('examName',     'Exam Name')}
        {field('academicYear', 'Academic Year', 'text')}
        {field('subjectCode',  'Subject Code')}
        {field('subjectName',  'Subject Name')}
        {field('classLevel',   'Class / Level')}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Type</label>
          <select {...register('examType')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
            <option value="theory">Theory</option>
            <option value="mcq">MCQ</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        {field('totalMarks',   'Total Marks',   'number')}
        {field('passingMarks', 'Passing Marks', 'number')}
        {field('dailyEvalLimit', 'Daily Eval Limit', 'number')}
        {field('evalDeadline', 'Eval Deadline', 'datetime-local')}
      </div>

      {/* Double Eval toggle */}
      <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
        <input type="checkbox" id="doubleEval" {...register('doubleEval')} className="w-4 h-4" />
        <label htmlFor="doubleEval" className="text-sm font-medium text-gray-700">
          Enable Double Evaluation (dual evaluators)
        </label>
      </div>

      {doubleEval && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Conflict Threshold (marks difference to flag conflict)
          </label>
          <input
            type="number"
            {...register('conflictThreshold')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="e.g. 5"
          />
          {errors.conflictThreshold && (
            <p className="text-xs text-red-500 mt-0.5">{errors.conflictThreshold.message}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Instructions (optional)</label>
        <textarea
          {...register('instructions')}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEdit ? 'Update' : 'Create'} Config
        </button>
      </div>
    </form>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const ExamSetup = () => {
  const [filterStatus, setFilterStatus] = useState('');
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editData,     setEditData]     = useState(null);

  const { data, isLoading, isFetching, refetch } = useExamList(
    filterStatus ? { status: filterStatus } : {}
  );
  const statusMutation = useUpdateExamStatus();
  const deleteMutation = useDeleteExam();

  const configs = data?.configs || [];

  const openCreate = () => { setEditData(null); setDrawerOpen(true); };
  const openEdit   = (cfg) => { setEditData(cfg); setDrawerOpen(true); };

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN]}>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-indigo-600" />
              Exam Configuration
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage OASES exam configs, evaluation settings, and question schemes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Config
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-gray-400" />
          {['', 'draft', 'active', 'evaluation', 'closed'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-indigo-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-base">No exam configs found.</p>
            <p className="text-sm">Create your first one to start the OASES workflow.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Exam Name', 'Subject', 'Class', 'Year', 'Marks', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {configs.map((cfg) => (
                  <tr key={cfg._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{cfg.examName}</td>
                    <td className="px-5 py-3 text-gray-600">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-1">
                        {cfg.subjectCode}
                      </span>
                      {cfg.subjectName}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{cfg.classLevel}</td>
                    <td className="px-5 py-3 text-gray-600">{cfg.academicYear}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {cfg.totalMarks} <span className="text-gray-400">/ pass {cfg.passingMarks}</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={cfg.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {/* Edit — only draft */}
                        {cfg.status === 'draft' && (
                          <button
                            onClick={() => openEdit(cfg)}
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-500"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Advance status */}
                        {NEXT_STATUS[cfg.status] && (
                          <button
                            onClick={() =>
                              statusMutation.mutate({ id: cfg._id, status: NEXT_STATUS[cfg.status] })
                            }
                            disabled={statusMutation.isPending}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600"
                            title={`Move to ${NEXT_STATUS[cfg.status]}`}
                          >
                            <ToggleRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Archive */}
                        {!['archived', 'evaluation'].includes(cfg.status) && (
                          <button
                            onClick={() => deleteMutation.mutate(cfg._id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Go to scheme */}
                        <Link
                          to={`../admin/scheme/${cfg._id}`}
                          className="p-1.5 rounded hover:bg-purple-50 text-purple-500"
                          title="Question Scheme"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total count */}
        {data?.total > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Showing {configs.length} of {data.total} exam configs
          </p>
        )}
      </div>

      {/* Slide-in drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                {editData ? 'Edit Exam Config' : 'Create Exam Config'}
              </h3>
            </div>
            <div className="p-6">
              <ExamForm onClose={() => setDrawerOpen(false)} editData={editData} />
            </div>
          </div>
        </div>
      )}
    </OasesRoleGuard>
  );
};

export default ExamSetup;
