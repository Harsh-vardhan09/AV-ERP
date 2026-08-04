import { useState, useRef, useEffect } from 'react';
import {
  useGetAllSchoolsQuery,
  useGetSchoolTemplatesQuery,
  useUploadTemplateForSchoolMutation,
  useDeleteSchoolTemplateMutation,
  useUpdateSchoolTemplateMutation,
} from '../../redux/api/superAdminApi';
import './SuperAdminTemplateManager.css';

const TEMPLATE_TYPES = ['annual', 'half_yearly', 'term1', 'term2', 'custom'];
const STATUS_OPTIONS  = ['draft', 'published', 'recommended', 'deprecated', 'archived'];

const STATUS_META = {
  draft:       { label: 'Draft',       color: 'satm-s-draft' },
  published:   { label: 'Published',   color: 'satm-s-published' },
  recommended: { label: 'Recommended', color: 'satm-s-recommended' },
  deprecated:  { label: 'Deprecated',  color: 'satm-s-deprecated' },
  archived:    { label: 'Archived',    color: 'satm-s-archived' },
};

const TARGETING_MODES = [
  { value: 'all',      label: '🌐 All Classes' },
  { value: 'range',    label: '📚 Class Range' },
  { value: 'specific', label: '🎯 Specific Classes' },
];

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

function ClassGroupBadge({ t }) {
  if (t.applicableClassIds?.length) return <span className="satm-cg-badge satm-cg-specific">🎯 Specific</span>;
  if (t.classRangeFrom != null)      return <span className="satm-cg-badge satm-cg-range">📚 {t.classGroupName || `${t.classRangeFrom}–${t.classRangeTo}`}</span>;
  return <span className="satm-cg-badge satm-cg-global">🌐 Global</span>;
}

const EMPTY_FORM = {
  name:'', description:'', htmlContent:'', cssContent:'',
  templateType:'annual', isDefault:false, templateStatus:'published',
  targetingMode:'all', classGroupName:'', classRangeFrom:'', classRangeTo:'',
};

export default function SuperAdminTemplateManager() {
  const [schoolSearch, setSchoolSearch]     = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showDropdown, setShowDropdown]     = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [uploadResult, setUploadResult] = useState(null); // {success, message, validation}
  const [uploadError, setUploadError]   = useState(null);
  const [previewHtml, setPreviewHtml]   = useState('');
  const [showPreview, setShowPreview]   = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [editingId, setEditingId]       = useState(null);
  const [editPatch, setEditPatch]       = useState({});
  const iframeRef = useRef(null);
  const pickerRef = useRef(null);

  const { data: schoolsData, isLoading: loadingSchools } = useGetAllSchoolsQuery({ status:'active', limit:100 });
  const allSchools = schoolsData?.data?.schools || [];
  const filteredSchools = schoolSearch.trim()
    ? allSchools.filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()) || s.code.toLowerCase().includes(schoolSearch.toLowerCase()))
    : allSchools;

  useEffect(() => {
    const h = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const { data: templatesData, isFetching: loadingTemplates } = useGetSchoolTemplatesQuery(
    { schoolId: selectedSchool?._id }, { skip: !selectedSchool }
  );
  const templates = templatesData?.data?.templates || [];

  const [uploadTemplate, { isLoading: uploading }]   = useUploadTemplateForSchoolMutation();
  const [deleteTemplate, { isLoading: deleting }]    = useDeleteSchoolTemplateMutation();
  const [updateTemplate, { isLoading: updating }]    = useUpdateSchoolTemplateMutation();

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school); setSchoolSearch(school.name);
    setShowDropdown(false); setShowUploadPanel(false);
    setUploadResult(null); setUploadError(null);
  };

  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const buildTargetingPayload = () => {
    if (form.targetingMode === 'range') {
      return {
        classGroupName: form.classGroupName,
        classRangeFrom: form.classRangeFrom !== '' ? Number(form.classRangeFrom) : null,
        classRangeTo:   form.classRangeTo   !== '' ? Number(form.classRangeTo)   : null,
      };
    }
    return { classGroupName:'', classRangeFrom:null, classRangeTo:null };
  };

  const handleUpload = async () => {
    setUploadError(null); setUploadResult(null);
    if (!selectedSchool)        return setUploadError('Select a school first.');
    if (!form.name.trim())      return setUploadError('Template name is required.');
    if (!form.htmlContent.trim()) return setUploadError('HTML content is required.');
    try {
      const res = await uploadTemplate({
        schoolId: selectedSchool._id,
        name: form.name, description: form.description,
        htmlContent: form.htmlContent, cssContent: form.cssContent,
        templateType: form.templateType, isDefault: form.isDefault,
        templateStatus: form.templateStatus,
        ...buildTargetingPayload(),
      }).unwrap();
      setUploadResult({ success:true, message: res.message, data: res.data });
      setForm(EMPTY_FORM); setShowUploadPanel(false);
    } catch (err) {
      setUploadError(err?.data?.message || 'Upload failed.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    setDeletingId(id);
    try { await deleteTemplate({ schoolId: selectedSchool._id, templateId: id }).unwrap(); }
    catch (err) { alert(err?.data?.message || 'Delete failed.'); }
    finally { setDeletingId(null); }
  };

  const startEdit = (t) => {
    setEditingId(t._id);
    setEditPatch({ templateStatus: t.templateStatus || 'published', isDefault: t.isDefault, isActive: t.isActive });
  };

  const saveEdit = async (t) => {
    try {
      await updateTemplate({ schoolId: selectedSchool._id, templateId: t._id, ...editPatch }).unwrap();
      setEditingId(null);
    } catch (err) { alert(err?.data?.message || 'Update failed.'); }
  };

  return (
    <div className="satm-page">
      <div className="satm-header">
        <div>
          <h1 className="satm-title">Report Card Template Manager</h1>
          <p className="satm-subtitle">Upload and manage HTML/CSS report card templates with class-group targeting.</p>
        </div>
      </div>

      {/* School Picker */}
      <div className="satm-card">
        <h2 className="satm-section-title">1. Select School</h2>
        <div className="satm-school-picker" ref={pickerRef}>
          <div className="satm-picker-input-wrap">
            <input id="satm-school-search" className="satm-input satm-picker-input" type="text"
              placeholder={loadingSchools ? 'Loading…' : 'Search school…'}
              value={schoolSearch}
              onChange={e => { setSchoolSearch(e.target.value); setShowDropdown(true); if (!e.target.value) setSelectedSchool(null); }}
              onFocus={() => setShowDropdown(true)} autoComplete="off" readOnly={loadingSchools} />
            <span className={`satm-picker-caret${showDropdown ? ' satm-picker-caret--open' : ''}`}
              onMouseDown={e => { e.preventDefault(); setShowDropdown(p => !p); }}>▾</span>
          </div>
          {showDropdown && (
            <ul className="satm-dropdown">
              {filteredSchools.length === 0
                ? <li className="satm-dropdown-empty">{loadingSchools ? 'Loading…' : 'No schools found'}</li>
                : filteredSchools.map(s => (
                  <li key={s._id}
                    className={`satm-dropdown-item${selectedSchool?._id === s._id ? ' satm-dropdown-item--selected' : ''}`}
                    onMouseDown={() => handleSchoolSelect(s)}>
                    <span className="satm-school-name">{s.name}</span>
                    <span className="satm-school-code">{s.code}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
        {selectedSchool && (
          <div className="satm-selected-badge">
            <span className="satm-badge-dot" />
            <strong>{selectedSchool.name}</strong>
            <span className="satm-badge-code">{selectedSchool.code}</span>
          </div>
        )}
      </div>

      {selectedSchool && (
        <div className="satm-card">
          <div className="satm-section-header">
            <h2 className="satm-section-title">2. Templates for <em>{selectedSchool.name}</em></h2>
            <button id="satm-upload-btn" className="satm-btn satm-btn-primary"
              onClick={() => { setShowUploadPanel(p => !p); setUploadError(null); setUploadResult(null); }}>
              {showUploadPanel ? '✕ Cancel' : '+ Upload New Template'}
            </button>
          </div>

          {/* Upload result / error alerts */}
          {uploadResult?.success && (
            <div className="satm-alert satm-alert-success">
              <div>✓ {uploadResult.message}</div>
              {uploadResult.data?.validation && (
                <div className="satm-validation-panel">
                  <div className="satm-val-row"><span className="satm-val-ok">✅ {uploadResult.data.extractedFields?.length || 0} fields extracted</span></div>
                  {uploadResult.data.validation.unknownFields?.length > 0 && (
                    <div className="satm-val-row"><span className="satm-val-warn">⚠️ Unknown fields: {uploadResult.data.validation.unknownFields.join(', ')}</span></div>
                  )}
                  {uploadResult.data.validation.warnings?.length > 0 && (
                    <div className="satm-val-row"><span className="satm-val-warn">⚠️ {uploadResult.data.validation.warnings.join(' | ')}</span></div>
                  )}
                  <div className="satm-val-row"><span className={`satm-val-status satm-val-${uploadResult.data.validation.status}`}>Status: {uploadResult.data.validation.status}</span></div>
                </div>
              )}
            </div>
          )}
          {uploadError && <div className="satm-alert satm-alert-error">✗ {uploadError}</div>}

          {/* Upload Panel */}
          {showUploadPanel && (
            <div className="satm-upload-panel">
              <div className="satm-form-grid">
                <div className="satm-form-group">
                  <label className="satm-label">Template Name *</label>
                  <input id="satm-tpl-name" className="satm-input" placeholder="e.g. Annual Report 2024–25"
                    value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div className="satm-form-group">
                  <label className="satm-label">Template Type</label>
                  <select id="satm-tpl-type" className="satm-input" value={form.templateType} onChange={e => setField('templateType', e.target.value)}>
                    {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div className="satm-form-group">
                  <label className="satm-label">Status</label>
                  <select id="satm-tpl-status" className="satm-input" value={form.templateStatus} onChange={e => setField('templateStatus', e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
                <div className="satm-form-group satm-full-width">
                  <label className="satm-label">Description</label>
                  <input id="satm-tpl-desc" className="satm-input" placeholder="Optional description"
                    value={form.description} onChange={e => setField('description', e.target.value)} />
                </div>

                {/* Class-Group Targeting */}
                <div className="satm-form-group satm-full-width">
                  <label className="satm-label">Class-Group Targeting</label>
                  <div className="satm-targeting-tabs">
                    {TARGETING_MODES.map(m => (
                      <button key={m.value} type="button"
                        className={`satm-tab-btn${form.targetingMode === m.value ? ' satm-tab-active' : ''}`}
                        onClick={() => setField('targetingMode', m.value)}>{m.label}</button>
                    ))}
                  </div>
                  {form.targetingMode === 'range' && (
                    <div className="satm-range-row">
                      <input className="satm-input" type="number" placeholder="From (numericOrder)"
                        value={form.classRangeFrom} onChange={e => setField('classRangeFrom', e.target.value)} />
                      <span className="satm-range-sep">to</span>
                      <input className="satm-input" type="number" placeholder="To (numericOrder)"
                        value={form.classRangeTo} onChange={e => setField('classRangeTo', e.target.value)} />
                      <input className="satm-input" placeholder="Label (e.g. Class 1–5)"
                        value={form.classGroupName} onChange={e => setField('classGroupName', e.target.value)} />
                    </div>
                  )}
                  {form.targetingMode === 'specific' && (
                    <p className="satm-hint">Specific class targeting is managed via the School Admin's Class Mapping panel after upload.</p>
                  )}
                </div>

                <div className="satm-form-group satm-full-width">
                  <label className="satm-label">HTML Template *
                    <span className="satm-label-hint">Use {'{{fieldName}}'} for data fields, {'{{#subjects}}…{{/subjects}}'} for loops</span>
                  </label>
                  <textarea id="satm-tpl-html" className="satm-textarea satm-code-area" rows={14}
                    placeholder={'<div class="report">\n  <h1>{{name}}</h1>\n  <p>Class: {{className}}</p>\n  {{#subjects}}\n    <div>{{name}}: {{total}}</div>\n  {{/subjects}}\n</div>'}
                    value={form.htmlContent} onChange={e => setField('htmlContent', e.target.value)} spellCheck={false} />
                </div>
                <div className="satm-form-group satm-full-width">
                  <label className="satm-label">CSS Styles</label>
                  <textarea id="satm-tpl-css" className="satm-textarea satm-code-area" rows={6}
                    placeholder={'.report { font-family: "Times New Roman"; padding: 20mm; }'}
                    value={form.cssContent} onChange={e => setField('cssContent', e.target.value)} spellCheck={false} />
                </div>
                <div className="satm-form-group satm-checkbox-group">
                  <label className="satm-checkbox-label">
                    <input type="checkbox" id="satm-tpl-default" checked={form.isDefault}
                      onChange={e => setField('isDefault', e.target.checked)} />
                    Set as default template for this school &amp; type
                  </label>
                </div>
              </div>
              <div className="satm-upload-actions">
                <button id="satm-preview-btn" className="satm-btn satm-btn-secondary"
                  onClick={() => { setPreviewHtml(`<!DOCTYPE html><html><head><style>${form.cssContent}</style></head><body>${form.htmlContent}</body></html>`); setShowPreview(true); }}
                  disabled={!form.htmlContent}>Preview</button>
                <button id="satm-save-btn" className="satm-btn satm-btn-primary"
                  onClick={handleUpload} disabled={uploading || !form.name || !form.htmlContent}>
                  {uploading ? 'Uploading…' : 'Upload Template'}
                </button>
              </div>
            </div>
          )}

          {/* Preview Modal */}
          {showPreview && (
            <div className="satm-preview-overlay" onClick={() => setShowPreview(false)}>
              <div className="satm-preview-modal" onClick={e => e.stopPropagation()}>
                <div className="satm-preview-header">
                  <span>Template Preview</span>
                  <button id="satm-close-preview" className="satm-btn satm-btn-ghost" onClick={() => setShowPreview(false)}>✕</button>
                </div>
                <iframe ref={iframeRef} className="satm-preview-iframe" title="Template Preview" srcDoc={previewHtml} sandbox="allow-same-origin" />
              </div>
            </div>
          )}

          {/* Templates Table */}
          {loadingTemplates ? (
            <div className="satm-loading">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div className="satm-empty">No templates yet. Upload one above.</div>
          ) : (
            <div className="satm-table-wrap">
              <table className="satm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Targeting</th>
                    <th>Status</th>
                    <th>Fields</th>
                    <th>Uses</th>
                    <th>Created</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t._id} className={t.isDefault ? 'satm-row-default' : ''}>
                      <td>
                        <div className="satm-tpl-name">{t.name}</div>
                        {t.description && <div className="satm-tpl-desc">{t.description}</div>}
                        {t.isDefault && <span className="satm-badge-default">Default</span>}
                      </td>
                      <td><span className="satm-type-chip">{t.templateType}</span></td>
                      <td><ClassGroupBadge t={t} /></td>
                      <td>
                        {editingId === t._id ? (
                          <select className="satm-input satm-input-sm"
                            value={editPatch.templateStatus}
                            onChange={e => setEditPatch(p => ({ ...p, templateStatus: e.target.value }))}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                          </select>
                        ) : (
                          <span className={`satm-status-chip ${STATUS_META[t.templateStatus || 'published']?.color}`}>
                            {STATUS_META[t.templateStatus || 'published']?.label}
                          </span>
                        )}
                      </td>
                      <td className="satm-center">{t.extractedFields?.length || 0}</td>
                      <td className="satm-center">{t.usageCount || 0}</td>
                      <td>{formatDate(t.createdAt)}</td>
                      <td>
                        {editingId === t._id ? (
                          <input type="checkbox" checked={!!editPatch.isActive}
                            onChange={e => setEditPatch(p => ({ ...p, isActive: e.target.checked }))} />
                        ) : (
                          <span className={`satm-status-chip ${t.isActive ? 'satm-active' : 'satm-inactive'}`}>
                            {t.isActive ? 'Active' : 'Off'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="satm-action-btns">
                          {editingId === t._id ? (
                            <>
                              <button className="satm-btn satm-btn-success satm-btn-sm" onClick={() => saveEdit(t)} disabled={updating}>
                                {updating ? '…' : 'Save'}
                              </button>
                              <button className="satm-btn satm-btn-ghost satm-btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="satm-btn satm-btn-secondary satm-btn-sm" onClick={() => startEdit(t)}>Edit</button>
                              <button id={`satm-del-${t._id}`} className="satm-btn satm-btn-danger satm-btn-sm"
                                onClick={() => handleDelete(t._id, t.name)} disabled={deleting && deletingId === t._id}>
                                {deleting && deletingId === t._id ? '…' : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Flow Guide */}
      <div className="satm-flow-card">
        <h3 className="satm-flow-title">How the Report Card Flow Works</h3>
        <div className="satm-flow-steps">
          {[
            { step:'1', label:'Super Admin uploads template', desc:'HTML/CSS assigned to school with class-group targeting. Fields auto-extracted.' },
            { step:'2', label:'School Admin maps class groups', desc:'Admin uses the Class Mapping tab to bind templates to class ranges.' },
            { step:'3', label:'Admin selects students & generates', desc:'Resolver auto-picks the best template per student class.' },
            { step:'4', label:'PDF generated & downloaded', desc:'Puppeteer renders template + live data. Bulk or per-student.' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="satm-flow-step">
              <div className="satm-flow-num">{step}</div>
              <div>
                <div className="satm-flow-label">{label}</div>
                <div className="satm-flow-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
