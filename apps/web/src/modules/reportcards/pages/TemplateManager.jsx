import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  useGetTemplateSelectionQuery,
  useSetTemplateSelectionMutation,
} from '../api/reportTemplateApi';
import {
  useGetSchoolSettingsQuery,
  useUploadSettingsLogoMutation,
} from '@modules/admissions/api/admissionApi';
import { FileText, Image, Check, Upload, Search, RefreshCw } from 'lucide-react';

/**
 * Report Card Templates — SCHOOL ADMIN, SELECT ONLY.
 *
 * Templates are authored by Super Admins and shared across schools. A school
 * admin browses the gallery, adopts one (SchoolSettings.selectedReportTemplateId)
 * and uploads their logo. There are deliberately no create / edit / delete /
 * clone controls here — the backend rejects those for this role anyway.
 */

const TEMPLATE_TYPE_LABELS = {
  annual: 'Annual', half_yearly: 'Half Yearly',
  term1: 'Term 1', term2: 'Term 2', custom: 'Custom',
};

/** School logo — feeds the {{school-logo}} token on every rendered card. */
function LogoPanel() {
  const fileRef = useRef(null);
  const { data: settingsData } = useGetSchoolSettingsQuery();
  const [uploadLogo, { isLoading: isUploading }] = useUploadSettingsLogoMutation();

  const logoUrl = settingsData?.data?.schoolProfile?.schoolLogo || '';

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadLogo({ type: 'schoolLogo', formData }).unwrap();
      toast.success('School logo updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Logo upload failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
      <h2 className="text-sm font-bold text-slate-900">School Logo</h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Printed at the top of every report card via <code>{'{{school-logo}}'}</code>.
      </p>
      <div className="flex items-center gap-3 mt-3">
        <div className="w-16 h-16 shrink-0 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
          {logoUrl
            ? <img src={logoUrl} alt="School logo" className="w-full h-full object-contain" />
            : <Image className="w-5 h-5 text-slate-300" />}
        </div>
        <div>
          <input
            ref={fileRef} type="file" accept="image/*"
            onChange={handleLogo} disabled={isUploading}
            className="hidden" id="rc-logo-input"
          />
          <label
            htmlFor="rc-logo-input"
            className={`inline-flex items-center gap-1.5 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
              isUploading ? 'opacity-50 cursor-wait' : 'hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

const TemplateManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data, isLoading, refetch } = useGetTemplateSelectionQuery();
  const [setSelection, { isLoading: isSaving }] = useSetTemplateSelectionMutation();

  const all        = data?.data?.templates || [];
  const selectedId = data?.data?.selectedTemplateId || '';
  const isStale    = data?.data?.isStale;

  const templates = all.filter((t) => {
    if (filterType && t.templateType !== filterType) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (t.name || '').toLowerCase().includes(q) ||
             (t.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleSelect = async (id) => {
    try {
      await setSelection(id || null).unwrap();
      toast.success(id ? 'Template applied to your school' : 'Selection cleared');
    } catch (e) {
      toast.error(e?.data?.message || 'Could not save selection');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-slate-900">Report Card Templates</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Choose the layout used for your school's report cards. Templates are maintained centrally.
        </p>
      </div>

      <LogoPanel />

      {isStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-semibold text-amber-800">
          The template your school was using is no longer available. Pick another one below.
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search templates…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white"
          />
        </div>
        <select
          value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="w-full sm:w-auto border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white"
        >
          <option value="">All Types</option>
          {Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button
          onClick={() => refetch()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Automatic option — falls back to the default template */}
      <button
        onClick={() => handleSelect('')}
        disabled={isSaving}
        className={`w-full text-left rounded-xl border px-4 py-3 transition cursor-pointer ${
          !selectedId ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900">Automatic</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Use whichever template is marked as the default.
            </div>
          </div>
          {!selectedId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <Check className="w-3.5 h-3.5" /> Selected
            </span>
          )}
        </div>
      </button>

      {isLoading ? (
        <div className="flex justify-center py-14">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl text-center py-12 text-slate-400 text-xs">
          No report card templates available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t) => {
            const isSelected = String(t._id) === String(selectedId);
            return (
              <div
                key={t._id}
                className={`rounded-xl border p-4 transition ${
                  isSelected ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{t.name}</span>
                      {t.isGlobal && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Standard
                        </span>
                      )}
                      {t.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {t.description || 'No description provided'}
                    </p>
                    <div className="text-[11px] text-slate-400 font-semibold mt-1.5">
                      {TEMPLATE_TYPE_LABELS[t.templateType] || t.templateType}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <Check className="w-3.5 h-3.5" /> Selected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelect(t._id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      Use this template
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Need a new layout? Report card templates are maintained by the platform team.
      </p>
    </div>
  );
};

export default TemplateManager;
