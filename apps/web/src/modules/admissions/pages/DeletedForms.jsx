import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGetDeletedFormsQuery, useRestoreFormMutation } from '../api/customFormApi';
import { ArrowLeft, RotateCcw } from 'lucide-react';

const DeletedForms = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const { data, isLoading } = useGetDeletedFormsQuery({ page, limit: 20 }, { refetchOnMountOrArgChange: true });
  const [restoreForm, { isLoading: restoring }] = useRestoreFormMutation();

  const forms      = data?.data?.forms      || [];
  const pagination = data?.data?.pagination || {};

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreForm(restoreTarget._id).unwrap();
      toast.success('Form restored successfully');
      setRestoreTarget(null);
    } catch { toast.error('Failed to restore form'); }
  };

  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/custom-forms')}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer text-slate-700 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Deleted Forms</h1>
            <p className="text-xs text-slate-500 mt-0.5">{pagination.total ?? 0} soft-deleted custom forms</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No deleted forms found. All custom forms are currently active.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {forms.map((form) => (
                <div key={form._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{form.title}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{form.session || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Deleted: <strong className="text-slate-800">{fmt(form.deletedAt)}</strong></span>
                    <button
                      onClick={() => setRestoreTarget(form)}
                      className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                    <th className="py-2.5 px-4 w-12">#</th>
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Session</th>
                    <th className="py-2.5 px-4">Deleted At</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {forms.map((form, idx) => (
                    <tr key={form._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 text-slate-400">{(page - 1) * 20 + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{form.title}</td>
                      <td className="py-3 px-4 text-slate-600">{form.session || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{fmt(form.deletedAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setRestoreTarget(form)}
                          className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="border border-slate-200 text-slate-700 px-3 py-1 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="border border-slate-200 text-slate-700 px-3 py-1 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Modal */}
      {restoreTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Restore Form?</h3>
            <p className="text-xs text-slate-500">"{restoreTarget.title}" will be restored to your active form list.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRestoreTarget(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                {restoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedForms;
