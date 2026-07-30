import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetReportTemplatesQuery,
  useDeleteReportTemplateMutation,
  useSetDefaultTemplateMutation,
  useCloneReportTemplateMutation,
  useGetReportTemplateStatsQuery,
  useUpdateReportTemplateMutation,
} from '../../redux/api/reportTemplateApi';
import { FileText, Map, Plus, RefreshCw, Copy, Trash2, Star, Search } from 'lucide-react';

const TEMPLATE_TYPE_LABELS = {
  annual: 'Annual', half_yearly: 'Half Yearly',
  term1: 'Term 1', term2: 'Term 2', custom: 'Custom',
};

const getClassGroupBadge = (template) => {
  if (template.applicableClassIds?.length > 0) {
    const label = template.classGroupName || `${template.applicableClassIds.length} class(es)`;
    return { label, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  if (template.classRangeFrom != null && template.classRangeTo != null) {
    const label = template.classGroupName || `Class ${template.classRangeFrom}–${template.classRangeTo}`;
    return { label, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
  return { label: 'All Classes', color: 'bg-slate-100 text-slate-700 border-slate-200' };
};

function ClassMappingTab({ templates, onSaveMapping }) {
  const [mappingRows, setMappingRows] = useState([]);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const ranged = (templates || []).filter(t => t.classRangeFrom != null || t.applicableClassIds?.length);
    const global = (templates || []).filter(t => t.classRangeFrom == null && !t.applicableClassIds?.length);
    const rows = [
      ...ranged.map(t => ({
        id:        t._id,
        label:     t.classGroupName || `${t.classRangeFrom}–${t.classRangeTo}`,
        from:      t.classRangeFrom,
        to:        t.classRangeTo,
        templateId: t._id,
        templateName: t.name,
        status:    t.templateStatus || 'published',
        isDefault: t.isDefault,
        isActive:  t.isActive,
      })),
    ];
    if (global.length) {
      rows.push({
        id: 'global',
        label: 'Global (All Classes)',
        from: null, to: null,
        templateId: global[0]._id,
        templateName: global[0].name,
        status: global[0].templateStatus || 'published',
        isDefault: global[0].isDefault,
        isActive: global[0].isActive,
      });
    }
    setMappingRows(rows);
  }, [templates]);

  const [newRow, setNewRow] = useState({ label:'', from:'', to:'', templateId:'' });
  const [showAddRow, setShowAddRow] = useState(false);

  const allTemplates = templates || [];

  const handleChangeTemplate = async (row, newTemplateId) => {
    if (!newTemplateId || newTemplateId === row.templateId) return;
    setSaving(row.id);
    try {
      await onSaveMapping(newTemplateId, {
        classGroupName: row.label,
        classRangeFrom: row.from,
        classRangeTo:   row.to,
      });
      toast.success(`Mapping updated for "${row.label}"`);
    } catch (e) {
      toast.error(e?.data?.message || 'Failed to update mapping');
    } finally { setSaving(null); }
  };

  const handleAddRow = async () => {
    if (!newRow.label || !newRow.templateId) return toast.error('Label and template required');
    if (!newRow.from || !newRow.to) return toast.error('Class range required');
    setSaving('new');
    try {
      await onSaveMapping(newRow.templateId, {
        classGroupName: newRow.label,
        classRangeFrom: Number(newRow.from),
        classRangeTo:   Number(newRow.to),
      });
      toast.success('Class mapping added');
      setNewRow({ label:'', from:'', to:'', templateId:'' });
      setShowAddRow(false);
    } catch (e) {
      toast.error(e?.data?.message || 'Failed to add mapping');
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Class Group Mappings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Map specific report card templates to class ranges</p>
        </div>
        <button
          onClick={() => setShowAddRow(prev => !prev)}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddRow ? 'Cancel' : 'Add Mapping'}</span>
        </button>
      </div>

      {showAddRow && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group Label *</label>
            <input
              type="text" placeholder="e.g. Primary Section"
              value={newRow.label} onChange={e => setNewRow(r => ({ ...r, label: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Class *</label>
              <input
                type="number" placeholder="1"
                value={newRow.from} onChange={e => setNewRow(r => ({ ...r, from: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Class *</label>
              <input
                type="number" placeholder="5"
                value={newRow.to} onChange={e => setNewRow(r => ({ ...r, to: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Template *</label>
            <select
              value={newRow.templateId} onChange={e => setNewRow(r => ({ ...r, templateId: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-white"
            >
              <option value="">Select Template</option>
              {allTemplates.filter(t => t.isActive).map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleAddRow} disabled={saving === 'new'}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-xl transition cursor-pointer"
            >
              {saving === 'new' ? 'Saving…' : 'Save Mapping'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {mappingRows.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No class-group mappings configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="py-2.5 px-4">Class Group</th>
                  <th className="py-2.5 px-4">Range</th>
                  <th className="py-2.5 px-4">Current Template</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Change Template</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {mappingRows.map(row => (
                  <tr key={row.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.label}</td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums">{row.from != null ? `Class ${row.from}–${row.to}` : 'All'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {row.templateName}
                      {row.isDefault && (
                        <span className="ml-2 bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          DEFAULT
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold uppercase">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        defaultValue={row.templateId}
                        onChange={e => handleChangeTemplate(row, e.target.value)}
                        disabled={saving === row.id}
                        className="border border-slate-200 rounded-xl px-2.5 py-1 text-xs outline-none bg-white"
                      >
                        {allTemplates.filter(t => t.isActive).map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const TemplateManager = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: templatesData, isLoading: isLoadingTemplates, refetch } = useGetReportTemplatesQuery({
    page, limit,
    templateType: filterType || undefined,
    search: searchTerm || undefined,
  });
  const { data: statsData }  = useGetReportTemplateStatsQuery();

  const [deleteTemplate,  { isLoading: isDeleting }]      = useDeleteReportTemplateMutation();
  const [setDefault,      { isLoading: isSettingDefault }] = useSetDefaultTemplateMutation();
  const [cloneTemplate,   { isLoading: isCloning }]        = useCloneReportTemplateMutation();
  const [updateTemplate]                                    = useUpdateReportTemplateMutation();

  const templates  = templatesData?.data || [];
  const stats      = statsData?.data;

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await deleteTemplate(id).unwrap(); toast.success('Template deleted'); }
    catch (e) { toast.error(e?.data?.message || 'Delete failed'); }
  };

  const handleSetDefault = async (id) => {
    try { await setDefault(id).unwrap(); toast.success('Set as default'); }
    catch (e) { toast.error(e?.data?.message || 'Failed'); }
  };

  const handleClone = async (id, name) => {
    const n = prompt('Clone name:', `${name} (Copy)`);
    if (!n) return;
    try { await cloneTemplate({ id, newName: n }).unwrap(); toast.success('Cloned'); }
    catch (e) { toast.error(e?.data?.message || 'Clone failed'); }
  };

  const handleSaveMapping = (templateId, mapping) =>
    updateTemplate({ id: templateId, ...mapping }).unwrap();

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Report Card Templates</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and configure academic report card layouts</p>
        </div>
        {activeTab === 'templates' && (
          <button
            onClick={() => navigate('/report-cards/templates/new')}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Template</span>
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Total Templates</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{stats.overall?.totalTemplates || 0}</div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Defaults Set</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{stats.overall?.defaultTemplates || 0}</div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Total Generated</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{stats.overall?.totalUsage || 0}</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('templates')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'templates' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Templates</span>
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'mapping' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Class Mapping</span>
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" placeholder="Search templates…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white"
              />
            </div>
            <select
              value={filterType} onChange={e => setFilterType(e.target.value)}
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

          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            {isLoadingTemplates ? (
              <div className="flex justify-center py-14">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No report card templates found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {templates.map(t => {
                  const badge = getClassGroupBadge(t);
                  return (
                    <div key={t._id} className="p-4 hover:bg-slate-50/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{t.name}</span>
                          {t.isDefault && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Default
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{t.description || 'No description provided'}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-semibold">
                          <span>Type: {TEMPLATE_TYPE_LABELS[t.templateType] || t.templateType}</span>
                          <span>Fields: {t.extractedFields?.length || 0}</span>
                          <span>Usage: {t.usageCount || 0}×</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          onClick={() => navigate(`/report-cards/templates/edit/${t._id}`)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                        >
                          Edit
                        </button>
                        {!t.isDefault && (
                          <button
                            onClick={() => handleSetDefault(t._id)} disabled={isSettingDefault}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleClone(t._id, t.name)} disabled={isCloning}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                          title="Clone"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t._id, t.name)} disabled={isDeleting}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer shadow-xs"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'mapping' && (
        <ClassMappingTab
          templates={templates}
          onSaveMapping={handleSaveMapping}
        />
      )}
    </div>
  );
};

export default TemplateManager;
