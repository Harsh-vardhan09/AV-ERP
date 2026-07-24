import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { DEFAULT_FIELDS, FIELD_TYPES } from '../../lib/fieldDefaults';
import { slugifyToCamelCase } from '../../lib/slugify';
import {
  useGetTemplateConfigQuery,
  useSaveTemplateConfigMutation,
} from '../../redux/api/templateConfigApi';
import '../../styles/certificate.css';

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
    <div className="certificate-page config-page">
      <div className="doc-no-print cfg-back-row">
        <Link to="/admin/documents" className="cfg-back-link">← Documents</Link>
      </div>
      <div className="cfg-header">
        <h1 className="cfg-title">Document Template Configuration</h1>
        <p className="cfg-subtitle">Configure which fields appear on your certificates</p>
      </div>
      <div className="doc-no-print cfg-tabs">
        <button className={`cfg-tab ${type === 'TC' ? 'cfg-tab-active' : ''}`} onClick={() => setType('TC')} disabled={type === 'TC'}>TC</button>
        <button className={`cfg-tab ${type === 'MIGRATION' ? 'cfg-tab-active' : ''}`} onClick={() => setType('MIGRATION')} disabled={type === 'MIGRATION'}>Migration</button>
      </div>
      <div className="config-grid">
        <div className="panel cfg-card">
          <div className="cfg-section-label">Available Fields</div>
          {DEFAULT_FIELDS.map((field) => (
            <div key={field.key} className={`field-item cfg-field-row ${selectedKeys.has(field.key) ? 'cfg-field-row-checked' : ''}`}>
              <label className="cfg-field-label-wrap">
                <input
                  className="cfg-checkbox"
                  type="checkbox"
                  checked={selectedKeys.has(field.key)}
                  onChange={() => toggleDefaultField(field)}
                />
                <span className="cfg-field-label">{field.label}</span>
                <span className="cfg-key-pill">{field.key}</span>
              </label>
            </div>
          ))}
        </div>

        <div className="panel cfg-card">
          <div className="cfg-section-label">Add Custom Field</div>
          <div className="cfg-custom-row">
            <input className="cfg-input" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Field label" />
            <select className="cfg-input cfg-select" value={customType} onChange={(e) => setCustomType(e.target.value)}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="cfg-required-inline">
              <input className="cfg-checkbox" type="checkbox" checked={customRequired} onChange={(e) => setCustomRequired(e.target.checked)} /> Required
            </label>
            <button className="cfg-add-btn" onClick={addCustomField}>+ Add Field</button>
          </div>
        </div>
      </div>

      <div className="panel cfg-card cfg-selected-card">
        <div className="cfg-section-label">Selected Fields (Ordered)</div>
        {isFetching && <p className="cfg-loading">Loading...</p>}
        {!isFetching && selectedFields.length === 0 && (
          <div className="cfg-empty-state">
            <div className="cfg-empty-icon">🗂️</div>
            <p>No fields selected yet. Choose from the left panel.</p>
          </div>
        )}
        {!isFetching && selectedFields.map((field, idx) => (
          <div key={field.key} className="field-item cfg-selected-row">
            <div className="cfg-drag-handle">⠿</div>
            <div className="cfg-selected-main">
              <span className="cfg-field-label">{field.label}</span>
              <span className="cfg-key-pill">{field.key}</span>
            </div>
            <div className="cfg-selected-actions">
              <label className="cfg-switch-wrap">
                <input className="cfg-switch-input" type="checkbox" checked={!!field.required} onChange={() => toggleRequired(field.key)} />
                <span className="cfg-switch-slider" />
                <span className="cfg-switch-label">Required</span>
              </label>
              <button className="cfg-icon-btn" onClick={() => move(idx, -1)} aria-label="Move up">↑</button>
              <button className="cfg-icon-btn" onClick={() => move(idx, 1)} aria-label="Move down">↓</button>
              <button className="cfg-remove-btn" onClick={() => toggleDefaultField(field)} aria-label="Remove field">×</button>
            </div>
          </div>
        ))}
        <button className="doc-no-print cfg-save-btn" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : `Save Template for ${type}`}
        </button>
      </div>
    </div>
  );
};

export default TemplateConfigPage;
