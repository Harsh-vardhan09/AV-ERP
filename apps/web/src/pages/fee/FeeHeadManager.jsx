import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiTag } from 'react-icons/fi';
import {
  useGetFeeHeadsQuery,
  useCreateFeeHeadMutation,
  useUpdateFeeHeadMutation,
  useDeleteFeeHeadMutation,
} from '../../redux/api/feeApi';
import toast from 'react-hot-toast';

const FEE_CATEGORIES = ['one-time', 'monthly', 'yearly', 'optional'];

const categoryConfig = {
  'one-time':  { bg: 'bg-blue-50   text-blue-700   border-blue-200',   dot: 'bg-blue-500' },
  'monthly':   { bg: 'bg-amber-50  text-amber-700  border-amber-200',  dot: 'bg-amber-500' },
  'yearly':    { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  'optional':  { bg: 'bg-rose-50   text-rose-700   border-rose-200',   dot: 'bg-rose-500' },
};

const CategoryBadge = ({ category }) => {
  const cfg = categoryConfig[category] || categoryConfig.optional;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {category}
    </span>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1, 2, 3, 4, 5].map(i => (
      <td key={i} className="py-3 px-4">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

const emptyForm = { name: '', category: 'monthly', description: '', isActive: true };

const FeeHeadManager = () => {
  const { data, isLoading } = useGetFeeHeadsQuery({});
  const [createFeeHead, { isLoading: creating }] = useCreateFeeHeadMutation();
  const [updateFeeHead, { isLoading: updating }] = useUpdateFeeHeadMutation();
  const [deleteFeeHead] = useDeleteFeeHeadMutation();

  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', data }

  const heads = data?.data || [];

  const openCreate = () => setModal({ mode: 'create', data: { ...emptyForm } });
  const openEdit   = (h) => setModal({
    mode: 'edit',
    data: { _id: h._id, name: h.name, category: h.category || 'optional', description: h.description || '', isActive: h.isActive !== false },
  });
  const close = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { _id, ...payload } = modal.data;
    if (!payload.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (modal.mode === 'create') {
        await createFeeHead(payload).unwrap();
        toast.success('Fee head created');
      } else {
        await updateFeeHead({ id: _id, ...payload }).unwrap();
        toast.success('Fee head updated');
      }
      close();
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete fee head "${name}"? This cannot be undone.`)) return;
    try {
      await deleteFeeHead(id).unwrap();
      toast.success('Fee head deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Cannot delete — may be in use');
    }
  };

  const set = (field, value) =>
    setModal(m => ({ ...m, data: { ...m.data, [field]: value } }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Fee Heads</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Define fee categories — Tuition, Transport, Hostel, Exam, etc.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          <FiPlus size={14} /> Add Fee Head
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Empty state */}
        {!isLoading && heads.length === 0 && (
          <div className="py-16 text-center">
            <FiTag size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No fee heads yet</p>
            <p className="text-gray-300 text-xs mt-1">Click "Add Fee Head" to create your first one.</p>
          </div>
        )}

        {(isLoading || heads.length > 0) && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [1, 2, 3].map(i => <SkeletonRow key={i} />)
                : heads.map(h => (
                    <tr key={h._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-3 px-4 font-medium text-gray-900">{h.name}</td>
                      <td className="py-3 px-4">
                        <CategoryBadge category={h.category} />
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs max-w-xs truncate">
                        {h.description || <span className="text-gray-200">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {h.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEdit(h)}
                          className="text-gray-300 hover:text-blue-600 mr-2 transition"
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(h._id, h.name)}
                          className="text-gray-300 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        )}
      </div>

      {/* Summary footer */}
      {!isLoading && heads.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 px-1">
          {heads.length} fee head{heads.length !== 1 ? 's' : ''} ·{' '}
          {heads.filter(h => h.isActive !== false).length} active
        </p>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {modal.mode === 'create' ? 'New Fee Head' : 'Edit Fee Head'}
              </h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modal.data.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Tuition Fee"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={modal.data.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {FEE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={modal.data.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Optional notes about this fee head…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active</p>
                  <p className="text-xs text-gray-400">Inactive heads cannot be used in structures</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('isActive', !modal.data.isActive)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    modal.data.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      modal.data.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
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
                  {creating || updating ? 'Saving…' : modal.mode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeHeadManager;
