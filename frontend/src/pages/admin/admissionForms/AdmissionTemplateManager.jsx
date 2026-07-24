/**
 * AdmissionTemplateManager — School Admin (READ-ONLY VIEW)
 *
 * School admins can ONLY:
 *   ✓ View the assigned template
 *   ✓ Preview the assigned template
 *   ✓ Generate / download admission form PDF
 *
 * School admins CANNOT:
 *   ✗ Upload templates
 *   ✗ Edit templates
 *   ✗ Delete templates
 *   ✗ Clone templates
 *   ✗ See HTML/CSS source
 *
 * Templates are managed exclusively by Super Admin.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetAdmissionTemplatesQuery,
  useGetAdmissionTemplateStatsQuery,
} from '../../../redux/api/admissionTemplateApi';

const StatusBadge = ({ status }) => {
  const map = {
    published:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    recommended: 'bg-blue-50 text-blue-700 border-blue-200',
    draft:       'bg-yellow-50 text-yellow-700 border-yellow-200',
    deprecated:  'bg-orange-50 text-orange-700 border-orange-200',
    archived:    'bg-gray-100 text-gray-500 border-gray-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.draft}`}>
      {status}
    </span>
  );
};

export default function AdmissionTemplateManager() {
  const navigate = useNavigate();

  // Only fetch active/published templates visible to school
  const { data, isLoading } = useGetAdmissionTemplatesQuery({ isActive: true });
  const { data: statsData } = useGetAdmissionTemplateStatsQuery();

  const templates = data?.data || [];
  const stats     = statsData?.data || {};

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Admission Form Templates</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Templates assigned to this school by the system administrator.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5">
        <div className="text-blue-500 text-lg mt-0.5">ℹ️</div>
        <div>
          <p className="text-sm font-medium text-blue-800">Templates are managed by the Super Administrator</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Contact your system administrator to upload, edit, or assign a new admission form template to your school.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">📄</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Assigned Templates</p>
            <p className="text-xl font-bold text-gray-800">{stats.total ?? '–'}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">✅</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Active</p>
            <p className="text-xl font-bold text-gray-800">{stats.active ?? '–'}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">⭐</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Default Set</p>
            <p className="text-xl font-bold text-gray-800">{stats.hasDefault ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Template List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Available Templates</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📄</div>
            <p className="font-medium text-gray-600">No admission templates assigned yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Ask your Super Administrator to assign a template to this school.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((tpl) => (
              <div
                key={tpl._id}
                className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                {/* Left: info */}
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm truncate">{tpl.name}</span>
                    {tpl.isDefault && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                        ⭐ Default
                      </span>
                    )}
                    <StatusBadge status={tpl.templateStatus} />
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{tpl.config?.pageSize || 'A4'} · {tpl.config?.orientation || 'portrait'}</span>
                    <span>Used: {tpl.usageCount || 0}×</span>
                    <span>
                      {tpl.extractedFields?.length || 0} field{tpl.extractedFields?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Right: ONLY Preview — no edit/delete/clone */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => navigate(`${tpl._id}/preview`)}
                    title="Preview template"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">How it works:</strong>{' '}
          When you print an admission form, the system automatically uses the assigned default template to generate a branded PDF.
          If no template is set, the system falls back to the built-in static layout.
        </p>
      </div>
    </div>
  );
}
