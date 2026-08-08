import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetFormLeadsQuery } from '../api/customFormApi';
import { ArrowLeft, User, Search } from 'lucide-react';

const FormLeads = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useGetFormLeadsQuery({ id, page, limit: 20, status }, { refetchOnMountOrArgChange: true });

  const form       = data?.data?.form       || null;
  const leads      = data?.data?.leads      || [];
  const pagination = data?.data?.pagination || {};

  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const statusBadge = (s) => {
    const cfg = {
      new:       'bg-indigo-50 text-indigo-700 border-indigo-200',
      contacted: 'bg-amber-50 text-amber-700 border-amber-200',
      converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected:  'bg-rose-50 text-rose-700 border-rose-200',
    };
    const c = cfg[s] || cfg.new;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${c}`}>{s}</span>;
  };

  const formFields = form
    ? (form.fieldMode === 'predefined'
        ? (form.predefinedFields || []).filter(f => f.enabled).map(f => ({ key: f.fieldKey, label: f.fieldName }))
        : (form.customFields || []).map(f => ({ key: f.label, label: f.label })))
    : [];

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
            <h1 className="text-xl font-bold text-slate-900">
              Form Leads {form ? `— ${form.title}` : ''}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Submissions collected from this custom form</p>
          </div>
        </div>

        <select
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="w-full sm:w-auto border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Total Leads</span>
          <strong className="block text-base font-bold text-slate-900 mt-0.5 tabular-nums">{pagination.total ?? 0}</strong>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">New</span>
          <strong className="block text-base font-bold text-indigo-600 mt-0.5 tabular-nums">{leads.filter(l => l.status === 'new').length}</strong>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Contacted</span>
          <strong className="block text-base font-bold text-amber-600 mt-0.5 tabular-nums">{leads.filter(l => l.status === 'contacted').length}</strong>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Converted</span>
          <strong className="block text-base font-bold text-emerald-600 mt-0.5 tabular-nums">{leads.filter(l => l.status === 'converted').length}</strong>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No leads received for this form yet.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {leads.map((lead, idx) => {
                const fields = lead.fields instanceof Object ? lead.fields : {};
                const firstVal = formFields[0] ? String(fields[formFields[0].key] ?? '—') : `Submission #${idx + 1}`;
                return (
                  <div key={lead._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{firstVal}</span>
                      {statusBadge(lead.status)}
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      {formFields.slice(1, 4).map(f => (
                        <div key={f.key} className="flex justify-between">
                          <span>{f.label}:</span>
                          <strong className="text-slate-800">{String(fields[f.key] ?? '—')}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                    <th className="py-2.5 px-4 w-12">#</th>
                    {formFields.slice(0, 5).map(f => (
                      <th key={f.key} className="py-2.5 px-4">{f.label}</th>
                    ))}
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {leads.map((lead, idx) => {
                    const fields = lead.fields instanceof Object ? lead.fields : {};
                    return (
                      <tr key={lead._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 text-slate-400">{(page - 1) * 20 + idx + 1}</td>
                        {formFields.slice(0, 5).map(f => (
                          <td key={f.key} className="py-3 px-4 max-w-[180px] truncate text-slate-900 font-semibold">
                            {String(fields[f.key] ?? fields.get?.(f.key) ?? '—')}
                          </td>
                        ))}
                        <td className="py-3 px-4">{statusBadge(lead.status)}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{fmt(lead.submittedAt || lead.createdAt)}</td>
                      </tr>
                    );
                  })}
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
    </div>
  );
};

export default FormLeads;
