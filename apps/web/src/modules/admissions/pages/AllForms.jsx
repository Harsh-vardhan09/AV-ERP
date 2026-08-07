import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetAllFormsQuery,
  useToggleFormStatusMutation,
  useDeleteFormMutation,
} from '../../../redux/api/customFormApi';
import { Plus, Trash2, Edit3, Eye, Search, FileText, Link, Unlink, RotateCcw } from 'lucide-react';

const AllForms = () => {
  const navigate = useNavigate();
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [limit]               = useState(20);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isFetching } = useGetAllFormsQuery(
    { page, limit, search },
    { refetchOnMountOrArgChange: true }
  );

  const [toggleStatus] = useToggleFormStatusMutation();
  const [deleteForm]   = useDeleteFormMutation();

  const forms      = data?.data?.forms      || [];
  const pagination = data?.data?.pagination || {};

  const handleToggle = async (form) => {
    try {
      await toggleStatus({ id: form._id, status: !form.status }).unwrap();
      toast.success(`Form ${!form.status ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteForm(deleteTarget._id).unwrap();
      toast.success('Form moved to trash');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete form');
    }
  };

  const fmt = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Custom Forms</h1>
          <p className="text-xs text-slate-500 mt-0.5">Build and manage custom enquiry / admission forms</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/admin/custom-forms/deleted')}
            className="inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Deleted Forms</span>
          </button>
          <button
            onClick={() => navigate('/admin/custom-forms/create')}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs w-full sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Form</span>
          </button>
        </div>
      </div>

      {/* Stats card + Search row */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Forms</div>
            <div className="text-lg font-bold text-slate-900 tabular-nums">{pagination.total ?? 0}</div>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search forms…"
            className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading || isFetching ? (
          <div className="flex justify-center py-14">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No custom forms found. Click "Create New Form" above.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {forms.map((form) => (
                <div key={form._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{form.title}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
                      {form.totalLeads} Leads
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Status: <strong className={form.status ? 'text-emerald-600' : 'text-slate-400'}>{form.status ? 'Active' : 'Inactive'}</strong></span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/custom-forms/${form._id}/leads`)}
                        className="p-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                        title="View Leads"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/custom-forms/${form._id}/edit`)}
                        className="p-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                        title="Edit Form"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(form)}
                        className="p-1.5 border border-rose-200 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Delete Form"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Total Leads</th>
                    <th className="py-2.5 px-4">Lead Status</th>
                    <th className="py-2.5 px-4">Receiver Email</th>
                    <th className="py-2.5 px-4">Active</th>
                    <th className="py-2.5 px-4">Created At</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {forms.map((form) => (
                    <tr key={form._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{form.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
                          {form.totalLeads} leads
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {form.linkToLead ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                            <Link className="w-3.5 h-3.5 text-indigo-600" /> Linked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Unlink className="w-3.5 h-3.5" /> Not linked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{form.receiverEmail || '—'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggle(form)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            form.status ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {form.status ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{fmt(form.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/custom-forms/${form._id}/leads`)}
                            className="p-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                            title="View Leads"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/custom-forms/${form._id}/edit`)}
                            className="p-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                            title="Edit Form"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(form)}
                            className="p-1.5 border border-rose-200 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer shadow-xs"
                            title="Delete Form"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Delete Form?</h3>
            <p className="text-xs text-slate-500">"{deleteTarget.title}" will be moved to trash. You can restore it later.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllForms;
