import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { DEFAULT_FIELDS, FIELD_TYPES } from '../../lib/fieldDefaults';
import { slugifyToCamelCase } from '../../lib/slugify';
import {
  useGetTemplateConfigQuery,
  useSaveTemplateConfigMutation,
} from '../../redux/api/templateConfigApi';
import { ArrowLeft, Plus, MoveUp, MoveDown, X, Save, FileText } from 'lucide-react';

const TemplateConfigPage = () => {
  const [type, setType] = useState('TC');
  const { data, isFetching, refetch } = useGetTemplateConfigQuery(type);
  const [saveTemplate, { isLoading: saving }] = useSaveTemplateConfigMutation();
  const [selectedFields, setSelectedFields] = useState([]);
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState('text');
  const [customRequired, setCustomRequired] = useState(false);

  useEffect(() => {
    const existing = data?.data?.fields;
    if (Array.isArray(existing) && existing.length) {
      setSelectedFields(existing);
      return;
    }
    const requiredDefaults = DEFAULT_FIELDS.filter((f) => f.required);
    setSelectedFields(requiredDefaults);
  }, [data, type]);

  const selectedKeys = useMemo(() => new Set(selectedFields.map((f) => f.key)), [selectedFields]);

  const toggleDefaultField = (field) => {
    setSelectedFields((prev) => {
      if (prev.some((f) => f.key === field.key)) return prev.filter((f) => f.key !== field.key);
      return [...prev, { ...field, isCustom: false }];
    });
  };

  const toggleRequired = (key) => {
    setSelectedFields((prev) => prev.map((f) => (f.key === key ? { ...f, required: !f.required } : f)));
  };

  const move = (index, direction) => {
    setSelectedFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addCustomField = () => {
    const key = slugifyToCamelCase(customLabel);
    if (!customLabel.trim() || !key) return toast.error('Enter a valid custom field label');
    if (selectedKeys.has(key)) return toast.error(`Field key "${key}" already exists`);
    setSelectedFields((prev) => [
      ...prev,
      {
        key,
        label: customLabel.trim(),
        required: customRequired,
        type: customType,
        isCustom: true,
      },
    ]);
    setCustomLabel('');
    setCustomType('text');
    setCustomRequired(false);
  };

  const save = async () => {
    if (!selectedFields.length) return toast.error('Select at least one field');
    try {
      const result = await saveTemplate({ type, fields: selectedFields }).unwrap();
      toast.success(result?.message || `Template saved for ${type}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Save failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="pt-1 space-y-2">
        <Link
          to="/admin/documents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Documents</span>
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Document Template Configuration</h1>
            <p className="text-xs text-slate-500 mt-0.5">Configure which fields appear on certificates</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setType('TC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                type === 'TC' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TC Template
            </button>
            <button
              onClick={() => setType('MIGRATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                type === 'MIGRATION' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Migration Template
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Fields */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Available Default Fields</h3>
          <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
            {DEFAULT_FIELDS.map((field) => (
              <label
                key={field.key}
                className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                  selectedKeys.has(field.key) ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(field.key)}
                    onChange={() => toggleDefaultField(field)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">{field.label}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">{field.key}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Add Custom Field */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add Custom Field</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Field Label *</label>
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Conduct Grade"
                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field Type</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                >
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customRequired}
                    onChange={(e) => setCustomRequired(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                  />
                  <span>Is Required</span>
                </label>
              </div>
            </div>
            <button
              onClick={addCustomField}
              className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Field
            </button>
          </div>
        </div>
      </div>

      {/* Selected Fields Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Selected Fields (Ordered)</h3>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving…' : `Save Template (${type})`}</span>
          </button>
        </div>

        {isFetching ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedFields.length === 0 ? (
          <p className="text-center py-8 text-xs text-slate-400">No fields selected yet. Choose from default fields or add custom fields above.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {selectedFields.map((field, idx) => (
              <div key={field.key} className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                  <div>
                    <span className="font-bold text-xs text-slate-900">{field.label}</span>
                    <span className="ml-2 text-[10px] font-mono text-slate-400">({field.key})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!field.required}
                      onChange={() => toggleRequired(field.key)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold">Required</span>
                  </label>
                  <button
                    onClick={() => move(idx, -1)}
                    className="p-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                    title="Move up"
                  >
                    <MoveUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    className="p-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                    title="Move down"
                  >
                    <MoveDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => toggleDefaultField(field)}
                    className="p-1 border border-rose-200 rounded-lg text-rose-600 hover:bg-rose-50"
                    title="Remove field"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateConfigPage;
