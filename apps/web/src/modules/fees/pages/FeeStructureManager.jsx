import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiChevronDown, FiChevronUp, FiLayers } from 'react-icons/fi';
import {
  useGetFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useUpdateFeeStructureMutation,
  useDeleteFeeStructureMutation,
  useGetFeeHeadsQuery,
} from '@modules/fees/api/feeApi';
import { useGetSessionsQuery, useGetClassesQuery } from '../../../redux/api/adminApi';
import toast from 'react-hot-toast';

const CYCLE_OPTIONS = [
  { value: 'CUSTOM',             label: 'Custom Schedule' },
  { value: 'MONTHLY',            label: 'Monthly' },
  { value: 'QUARTERLY',          label: 'Quarterly' },
  { value: 'HALF_YEARLY',        label: 'Half Yearly' },
  { value: 'YEARLY',             label: 'Yearly' },
  { value: 'FLEXIBLE',           label: 'Flexible – Pay Anytime' },
  { value: 'THREE_INSTALLMENT',  label: '3 Installments (Per Year)' },
];

const emptyForm = {
  name: '',
  sessionId: '',
  classId: '',
  stream: '',
  feeCycle: 'CUSTOM',
  installmentCount: 4,
  feeComponents: [{ feeHeadId: '', amount: '' }],
  threeInstallmentDates: ['', '', ''],
};


const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <td key={i} className="py-3 px-4">
        <div className="h-4 bg-gray-100 rounded w-4/5" />
      </td>
    ))}
  </tr>
);

const FeeStructureManager = () => {
  const { data: structuresData, isLoading } = useGetFeeStructuresQuery({});
  const { data: headsData } = useGetFeeHeadsQuery({});
  const { data: sessionsData } = useGetSessionsQuery();
  const { data: classesData } = useGetClassesQuery();

  const [createFeeStructure, { isLoading: creating }] = useCreateFeeStructureMutation();
  const [updateFeeStructure, { isLoading: updating }] = useUpdateFeeStructureMutation();
  const [deleteFeeStructure] = useDeleteFeeStructureMutation();

  const [modal, setModal] = useState(null);
  const [filterSession, setFilterSession] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const structures = structuresData?.data || [];
  const heads = headsData?.data || [];
  const sessions = sessionsData?.data || [];
  const classes = classesData?.data || [];

  const activeHeads = heads.filter(h => h.isActive !== false);

  const filteredStructures = filterSession
    ? structures.filter(s => s.sessionId?._id === filterSession || s.sessionId === filterSession)
    : structures;

  const openCreate = () => setModal({ mode: 'create', data: { ...emptyForm } });
  const openEdit = (s) => setModal({
    mode: 'edit',
    data: {
      _id: s._id,
      name: s.name || '',
      sessionId: s.sessionId?._id || s.sessionId || '',
      classId: s.classId?._id || s.classId || '',
      stream: s.stream || '',
      feeCycle: s.feeCycle || 'CUSTOM',
      installmentCount: s.installmentCount || 4,
      feeComponents: s.feeComponents?.map(c => ({
        feeHeadId: c.feeHeadId?._id || c.feeHeadId || '',
        amount: c.amount || '',
      })) || [],
      threeInstallmentDates: s.threeInstallmentDates?.map(d =>
        d ? new Date(d).toISOString().split('T')[0] : ''
      ) || ['', '', ''],
    },
  });

  const close = () => setModal(null);

  const addComponent = () =>
    setModal(m => ({ ...m, data: { ...m.data, feeComponents: [...m.data.feeComponents, { feeHeadId: '', amount: '' }] } }));

  const removeComponent = (i) =>
    setModal(m => ({ ...m, data: { ...m.data, feeComponents: m.data.feeComponents.filter((_, idx) => idx !== i) } }));

  const updateComponent = (i, field, value) =>
    setModal(m => ({
      ...m,
      data: {
        ...m.data,
        feeComponents: m.data.feeComponents.map((c, idx) => idx === i ? { ...c, [field]: value } : c),
      },
    }));

  const totalAmount = modal?.data.feeComponents.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { _id, feeComponents, threeInstallmentDates, ...rest } = modal.data;
    if (!rest.sessionId) { toast.error('Please select a session'); return; }
    if (!rest.classId)   { toast.error('Please select a class'); return; }
    const components = feeComponents.filter(c => c.feeHeadId && c.amount);
    if (!components.length) { toast.error('Add at least one fee component with amount'); return; }

    // THREE_INSTALLMENT: validate 3 dates are set and chronological
    if (rest.feeCycle === 'THREE_INSTALLMENT') {
      if (threeInstallmentDates.some(d => !d)) {
        toast.error('All 3 installment due dates are required'); return;
      }
      const [d1, d2, d3] = threeInstallmentDates.map(d => new Date(d));
      if (d1 >= d2 || d2 >= d3) {
        toast.error('Installment dates must be in chronological order (Date1 < Date2 < Date3)'); return;
      }
    }

    const payload = {
      ...rest,
      totalAmount,
      stream: modal.data.stream || null,
      feeComponents: components.map(c => ({ feeHeadId: c.feeHeadId, amount: Number(c.amount) })),
      ...(rest.feeCycle === 'THREE_INSTALLMENT' ? { threeInstallmentDates } : {}),
      ...(rest.feeCycle === 'FLEXIBLE' ? { installmentCount: 1 } : {}),
    };
    try {
      if (modal.mode === 'create') {
        await createFeeStructure(payload).unwrap();
        toast.success('Fee structure created');
      } else {
        await updateFeeStructure({ id: _id, ...payload }).unwrap();
        toast.success('Fee structure updated');
      }
      close();
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fee structure? Students assigned this structure will be affected.')) return;
    try {
      await deleteFeeStructure(id).unwrap();
      toast.success('Fee structure deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Cannot delete — may be in use');
    }
  };

  const set = (field, value) => setModal(m => ({ ...m, data: { ...m.data, [field]: value } }));
  const toggleExpand = (id) => setExpandedRow(prev => prev === id ? null : id);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Fee Structures</h2>
          <p className="text-xs text-gray-400 mt-0.5">Define fee breakdowns per class and session</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterSession}
            onChange={e => setFilterSession(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 text-gray-600"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            <FiPlus size={14} /> New Structure
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {!isLoading && filteredStructures.length === 0 && (
          <div className="py-16 text-center">
            <FiLayers size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No fee structures yet</p>
            <p className="text-gray-300 text-xs mt-1">Click "New Structure" to create the first one.</p>
          </div>
        )}

        {(isLoading || filteredStructures.length > 0) && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name / Class</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Session</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Fee</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cycle</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [1, 2, 3].map(i => <SkeletonRow key={i} />)
                : filteredStructures.map(s => (
                  <React.Fragment key={s._id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(s._id)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {s.classId?.name || '—'}
                          {s.stream && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                              s.stream === 'Science' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              s.stream === 'Commerce' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}>{s.stream}</span>
                          )}
                        </div>
                        {s.name && <div className="text-xs text-gray-400 mt-0.5">{s.name}</div>}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{s.sessionId?.name || '—'}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">
                        ₹{s.totalAmount?.toLocaleString() || '—'}
                      </td>
                       <td className="py-3 px-4">
                        {s.feeCycle === 'FLEXIBLE' ? (
                          <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded text-xs font-medium">
                            FLEXIBLE
                          </span>
                        ) : s.feeCycle === 'THREE_INSTALLMENT' ? (
                          <span className="px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded text-xs font-medium">
                            3 INSTALLMENTS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">
                            {s.feeCycle || 'CUSTOM'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {s.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          className="text-gray-400 hover:text-gray-600 mr-1"
                          onClick={() => toggleExpand(s._id)}
                          title={expandedRow === s._id ? 'Collapse' : 'Expand'}
                        >
                          {expandedRow === s._id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="text-gray-300 hover:text-blue-600 mr-2 transition"
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="text-gray-300 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable fee components row */}
                    {expandedRow === s._id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Fee Breakdown
                            {s.installmentCount > 1 && (
                              <span className="ml-2 font-normal text-gray-300 normal-case">
                                · {s.installmentCount} installments
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {s.feeComponents?.map((c, i) => (
                              <div
                                key={i}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs"
                              >
                                <span className="font-medium text-gray-700">
                                  {c.feeHeadId?.name || '—'}
                                </span>
                                <span className="ml-2 text-emerald-600 font-semibold">
                                  ₹{c.amount?.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              }
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && filteredStructures.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 px-1">
          {filteredStructures.length} structure{filteredStructures.length !== 1 ? 's' : ''}
          {filterSession ? ' in selected session' : ''}
        </p>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold text-gray-900">
                {modal.mode === 'create' ? 'New Fee Structure' : 'Edit Fee Structure'}
              </h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Structure Name</label>
                <input
                  type="text"
                  value={modal.data.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Class 10 Annual Fee 2024-25"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Session + Class + Stream */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Session <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={modal.data.sessionId}
                    onChange={e => set('sessionId', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">Select session</option>
                    {sessions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Class <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={modal.data.classId}
                    onChange={e => { set('classId', e.target.value); set('stream', ''); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              {/* Stream selector — only for 11th/12th */}
              {(() => {
                const selClass = classes.find(c => c._id === modal.data.classId);
                const isHigher = selClass?.name?.includes('11th') || selClass?.name?.includes('12th');
                return isHigher ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Stream <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={modal.data.stream || ''}
                      onChange={e => set('stream', e.target.value)}
                      className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Select Stream</option>
                      <option value="Science">Science (₹19,200)</option>
                      <option value="Commerce">Commerce (₹18,500)</option>
                      <option value="Arts">Arts</option>
                    </select>
                  </div>
                ) : null;
              })()}

              {/* Fee Cycle + Installments */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fee Cycle</label>
                  <select
                    value={modal.data.feeCycle}
                    onChange={e => {
                      const v = e.target.value;
                      set('feeCycle', v);
                      if (v === 'THREE_INSTALLMENT') set('installmentCount', 3);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {CYCLE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Show installment count only for non-FLEXIBLE, non-THREE_INSTALLMENT cycles */}
                {modal.data.feeCycle !== 'FLEXIBLE' && modal.data.feeCycle !== 'THREE_INSTALLMENT' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">No. of Installments</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={modal.data.installmentCount}
                      onChange={e => set('installmentCount', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                )}

                {/* THREE_INSTALLMENT: locked count */}
                {modal.data.feeCycle === 'THREE_INSTALLMENT' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">No. of Installments</label>
                    <input
                      type="number"
                      value={3}
                      readOnly
                      className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* FLEXIBLE info box */}
              {modal.data.feeCycle === 'FLEXIBLE' && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-3 text-xs text-cyan-700">
                  <p className="font-semibold mb-0.5">Flexible Payment Mode</p>
                  <p>Students can pay any amount at any time. Fee is marked complete when the full amount is paid.</p>
                  <p className="mt-1 text-cyan-500">No installment dates required.</p>
                </div>
              )}

              {/* THREE_INSTALLMENT date pickers */}
              {modal.data.feeCycle === 'THREE_INSTALLMENT' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">Installment Due Dates <span className="text-red-400">*</span></label>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 w-24 shrink-0">
                        Installment {i + 1}
                      </span>
                      <input
                        type="date"
                        required
                        value={modal.data.threeInstallmentDates?.[i] || ''}
                        onChange={e => {
                          const dates = [...(modal.data.threeInstallmentDates || ['', '', ''])];
                          dates[i] = e.target.value;
                          set('threeInstallmentDates', dates);
                        }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  ))}
                  {totalAmount > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Auto-split: ₹{(Math.floor(totalAmount / 3) + (totalAmount % 3)).toLocaleString()} / ₹{Math.floor(totalAmount / 3).toLocaleString()} / ₹{Math.floor(totalAmount / 3).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Fee Components */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">
                    Fee Components <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addComponent}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    + Add Component
                  </button>
                </div>
                <div className="space-y-2">
                  {modal.data.feeComponents.map((comp, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={comp.feeHeadId}
                        onChange={e => updateComponent(i, 'feeHeadId', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        <option value="">Select fee head</option>
                        {activeHeads.map(h => (
                          <option key={h._id} value={h._id}>{h.name} ({h.type})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="₹ Amount"
                        value={comp.amount}
                        onChange={e => updateComponent(i, 'amount', e.target.value)}
                        className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      {modal.data.feeComponents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeComponent(i)}
                          className="text-gray-300 hover:text-red-600 flex-shrink-0"
                        >
                          <FiX size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {totalAmount > 0 && (
                  <p className="text-right text-xs text-gray-500 mt-2">
                    Total:{' '}
                    <span className="font-semibold text-emerald-700">₹{totalAmount.toLocaleString()}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {creating || updating ? 'Saving…' : modal.mode === 'create' ? 'Create Structure' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructureManager;
