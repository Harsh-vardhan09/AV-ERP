// ══════════════════════════════════════════════════════════════════
// OASES — Admin: SheetManagementPage (Sprint 2 — full)
// • DataTable with processingStatus + status chips
// • Spinner on processing rows
// • Checkbox multi-select for bulk assign
// • Bulk assign dialog (round-robin / random)
// • Reprocess button on failed rows
// • Socket-driven auto-refresh via useSheetList
// ══════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers, Loader2, RefreshCw, AlertTriangle, CheckSquare,
  Square, Users, RotateCcw, X, ChevronDown, ChevronRight,
  ArrowLeft, Filter,
} from 'lucide-react';
import { useExamList } from '../hooks/queries/useExams';
import { useSheetList } from '../hooks/queries/useSheets';
import { useAssignBulk, useAssignSingle, useReprocessSheet } from '../hooks/mutations/useAssignSheets';
import { useOasesSocket } from '../hooks/useSocket';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import { OASES_ROLES } from '../utils/oasesConstants';
import oasesAxios from '../lib/axios';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ── Status badges ─────────────────────────────────────────────────
const ProcessBadge = ({ status }) => {
  const map = {
    pending:    { cls: 'bg-amber-100 text-amber-700',   label: 'Queued' },
    processing: { cls: 'bg-blue-100 text-blue-700',     label: 'Processing…' },
    done:       { cls: 'bg-green-100 text-green-700',   label: 'Ready' },
    failed:     { cls: 'bg-red-100 text-red-600',       label: 'Failed' },
  };
  const s = map[status] || { cls: 'bg-gray-100 text-gray-500', label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
      {s.label}
    </span>
  );
};

const SheetBadge = ({ status }) => {
  const map = {
    uploaded:    'bg-slate-100 text-slate-600',
    assigned:    'bg-violet-100 text-violet-700',
    in_progress: 'bg-blue-100 text-blue-700',
    eval1_done:  'bg-cyan-100 text-cyan-700',
    eval2_done:  'bg-teal-100 text-teal-700',
    conflict:    'bg-orange-100 text-orange-700',
    locked:      'bg-green-100 text-green-800',
    rejected:    'bg-red-100 text-red-500',
    ufm_flagged: 'bg-pink-100 text-pink-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  );
};

// ── Bulk Assign Dialog ────────────────────────────────────────────
const AssignDialog = ({ examId, sheetIds, onClose }) => {
  const [strategy, setStrategy] = useState('round-robin');
  const [round,    setRound]    = useState(1);
  const bulkMutation = useAssignBulk();

  // P3 fix: fetch all eligible evaluators directly — not from existing assignments
  // (old approach returned 0 evaluators for new exams with no prior assignments)
  const { data: evaluators = [], isLoading: evalsLoading } = useQuery({
    queryKey: ['oases', 'evaluators'],
    queryFn:  () => oasesAxios.get('/assignment/evaluators').then((r) => r.data.data || []),
    enabled:  !!examId,
    staleTime: 1000 * 60 * 5,
  });

  const [selectedEvals, setSelectedEvals] = useState([]);

  const toggleEval = (id) =>
    setSelectedEvals((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );

  const handleAssign = async () => {
    if (selectedEvals.length === 0) return toast.error('Select at least one evaluator.');
    await bulkMutation.mutateAsync({
      examId,
      evaluatorIds: selectedEvals,
      strategy,
      round,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800">Bulk Assign Sheets</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Assigning <span className="font-semibold text-indigo-600">{sheetIds.length} sheet(s)</span> to selected evaluators.
        </p>

        {/* Strategy */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Distribution Strategy</label>
          <div className="flex gap-3">
            {['round-robin', 'random'].map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`flex-1 py-2 text-sm rounded-lg border transition ${
                  strategy === s
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'round-robin' ? '⚙️ Round Robin' : '🎲 Random'}
              </button>
            ))}
          </div>
        </div>

        {/* Round */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Evaluation Round</label>
          <select
            value={round}
            onChange={(e) => setRound(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value={1}>Round 1 — Primary Evaluator</option>
            <option value={2}>Round 2 — Secondary Evaluator</option>
            <option value={3}>Round 3 — Head Examiner</option>
          </select>
        </div>

        {/* Evaluator list */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Select Evaluators ({selectedEvals.length} selected)
          </label>
          {evaluators.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No evaluators found. Assign evaluator role via admin panel first.
            </p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
              {evaluators.map((ev) => ev && (
                <button
                  key={ev._id}
                  onClick={() => toggleEval(ev._id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-gray-50 ${
                    selectedEvals.includes(ev._id) ? 'bg-indigo-50' : ''
                  }`}
                >
                  {selectedEvals.includes(ev._id)
                    ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                    : <Square className="w-4 h-4 text-gray-300" />}
                  <span className="text-sm text-gray-700">
                    {ev.firstName} {ev.lastName}
                    <span className="ml-2 text-xs text-gray-400">{ev.email}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={bulkMutation.isPending || selectedEvals.length === 0}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {bulkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
const SheetManagementPage = () => {
  const { examId }   = useParams();
  const navigate     = useNavigate();
  const [selected,   setSelected]   = useState(new Set());
  const [filterProc, setFilterProc] = useState('');
  const [filterStat, setFilterStat] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);

  // Socket for live updates
  useOasesSocket(true);

  // Sheet list with auto-poll
  const { data, isLoading, isFetching, refetch } = useSheetList(examId, {
    ...(filterProc && { processingStatus: filterProc }),
    ...(filterStat && { status: filterStat }),
    limit: 50,
  });

  const reprocessMut = useReprocessSheet();

  const sheets = data?.sheets || [];
  const counts = data?.counts || {};

  // Checkbox selection helpers
  const allIds          = sheets.map((s) => s._id);
  const readyUnassigned = sheets.filter(
    (s) => s.processingStatus === 'done' && s.status === 'uploaded'
  ).map((s) => s._id);

  const toggleAll = () => {
    if (selected.size === readyUnassigned.length) setSelected(new Set());
    else setSelected(new Set(readyUnassigned));
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN]}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-700 mb-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              Sheet Management
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Monitor uploads, processing status, and assign evaluators.</p>
          </div>
          <div className="flex gap-3 items-center">
            {selected.size > 0 && (
              <button
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
              >
                <Users className="w-4 h-4" />
                Assign {selected.size} Sheet{selected.size !== 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Aggregate count pills */}
        {Object.keys(counts).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { k: 'total',      label: 'Total',      cls: 'bg-gray-100 text-gray-700' },
              { k: 'pending',    label: 'Queued',      cls: 'bg-amber-100 text-amber-700' },
              { k: 'processing', label: 'Processing',  cls: 'bg-blue-100 text-blue-700' },
              { k: 'done',       label: 'Ready',       cls: 'bg-green-100 text-green-700' },
              { k: 'assigned',   label: 'Assigned',    cls: 'bg-violet-100 text-violet-700' },
              { k: 'failed',     label: 'Failed',      cls: 'bg-red-100 text-red-600' },
            ].map(({ k, label, cls }) =>
              counts[k] > 0 ? (
                <span key={k} className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
                  {label}: {counts[k]}
                  {k === 'processing' && isFetching && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                </span>
              ) : null
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-2">
            {['', 'pending', 'processing', 'done', 'failed'].map((s) => (
              <button
                key={s || 'all-proc'}
                onClick={() => setFilterProc(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterProc === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s || 'All Processing'}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-2">
            {['', 'uploaded', 'assigned'].map((s) => (
              <button
                key={s || 'all-stat'}
                onClick={() => setFilterStat(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterStat === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s || 'All Status'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center h-48 items-center text-indigo-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : sheets.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No sheets found for the selected filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={toggleAll} title="Select all ready unassigned">
                      {selected.size === readyUnassigned.length && readyUnassigned.length > 0
                        ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                        : <Square className="w-4 h-4 text-gray-400" />}
                    </button>
                  </th>
                  {['Anonymous Code', 'Filename', 'Pages', 'Processing', 'Status', 'Uploaded', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sheets.map((sheet) => {
                  const isReady     = sheet.processingStatus === 'done' && sheet.status === 'uploaded';
                  const isFailed    = sheet.processingStatus === 'failed';
                  const isChecked   = selected.has(sheet._id);
                  const isProcessing = sheet.processingStatus === 'processing' || sheet.processingStatus === 'pending';

                  return (
                    <tr key={sheet._id} className={`transition ${isProcessing ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        {isReady ? (
                          <button onClick={() => toggleOne(sheet._id)}>
                            {isChecked
                              ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                              : <Square className="w-4 h-4 text-gray-300" />}
                          </button>
                        ) : (
                          <span className="w-4 h-4 block" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-700">
                        {sheet.anonymousCode}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate text-xs">
                        {sheet.originalFilename || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-center">
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400 mx-auto" />
                        ) : (
                          sheet.totalPages || 1
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ProcessBadge status={sheet.processingStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <SheetBadge status={sheet.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {isFailed && (
                            <button
                              onClick={() => reprocessMut.mutate(sheet._id)}
                              disabled={reprocessMut.isPending}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition"
                              title="Retry processing"
                            >
                              <RotateCcw className="w-3 h-3" /> Reprocess
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {sheets.length} of {data?.total || 0} sheets
                {selected.size > 0 && ` · ${selected.size} selected`}
              </p>
              {counts.processing > 0 && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {counts.processing} sheet(s) processing — auto-refreshing…
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign dialog */}
      {assignOpen && (
        <AssignDialog
          examId={examId}
          sheetIds={[...selected]}
          onClose={() => { setAssignOpen(false); setSelected(new Set()); }}
        />
      )}
    </OasesRoleGuard>
  );
};

export default SheetManagementPage;
