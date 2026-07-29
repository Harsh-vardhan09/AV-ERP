import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetAdmissionTemplatesQuery,
  useGetAdmissionTemplateStatsQuery,
} from '../../../redux/api/admissionTemplateApi';
import { FileText, CheckCircle2, Star, Eye, Info } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    published:   'bg-slate-100 text-slate-700 border-slate-200',
    recommended: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    draft:       'bg-slate-100 text-slate-600 border-slate-200',
    deprecated:  'bg-amber-50 text-amber-700 border-amber-200',
    archived:    'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[status] || map.draft}`}>
      {status}
    </span>
  );
};

export default function AdmissionTemplateManager() {
  const navigate = useNavigate();

  const { data, isLoading } = useGetAdmissionTemplatesQuery({ isActive: true });
  const { data: statsData } = useGetAdmissionTemplateStatsQuery();

  const templates = data?.data || [];
  const stats     = statsData?.data || {};

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admission Form Templates</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Branded templates assigned to this school by the system administrator
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600">
        <Info className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>Templates are managed centrally by the Super Administrator. Contact your admin to request template modifications.</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Assigned</span>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">{stats.total ?? '–'}</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active</span>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">{stats.active ?? '–'}</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Default Set</span>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-1">{stats.hasDefault ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Template List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Available Templates</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-xs font-medium">No admission templates assigned yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {templates.map((tpl) => (
              <div
                key={tpl._id}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/50 transition-colors gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs truncate">{tpl.name}</span>
                    {tpl.isDefault && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Default
                      </span>
                    )}
                    <StatusBadge status={tpl.templateStatus} />
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{tpl.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-slate-400">
                    <span>{tpl.config?.pageSize || 'A4'} · {tpl.config?.orientation || 'portrait'}</span>
                    <span>Used: {tpl.usageCount || 0}×</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => navigate(`${tpl._id}/preview`)}
                    title="Preview template"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
