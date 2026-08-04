import { useState, useRef, useEffect } from 'react';
import {
  useGetAllSchoolsQuery,
  useGetSchoolAdmissionTemplatesQuery,
  useUploadAdmissionTemplateForSchoolMutation,
  useDeleteSchoolAdmissionTemplateMutation,
  useUpdateSchoolAdmissionTemplateMutation,
} from '../../redux/api/superAdminApi';
import './SuperAdminTemplateManager.css'; // reuse the same stylesheet

const STATUS_OPTIONS = ['draft', 'published', 'deprecated', 'archived'];

const STATUS_META = {
  draft:       { label: 'Draft',       color: 'satm-s-draft' },
  published:   { label: 'Published',   color: 'satm-s-published' },
  recommended: { label: 'Recommended', color: 'satm-s-recommended' },
  deprecated:  { label: 'Deprecated',  color: 'satm-s-deprecated' },
  archived:    { label: 'Archived',    color: 'satm-s-archived' },
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const EMPTY_FORM = {
  name: '', description: '', htmlContent: '', cssContent: '',
  isDefault: false, templateStatus: 'published',
};

const PLACEHOLDER_HINT = [
  '{{name}}', '{{admissionNo}}', '{{className}}', '{{sectionName}}',
  '{{fatherName}}', '{{motherName}}', '{{dob}}', '{{gender}}',
  '{{address}}', '{{city}}', '{{state}}', '{{mobileNo}}',
  '{{bloodGroup}}', '{{religion}}', '{{caste}}', '{{nationality}}',
  '{{schoolName}}', '{{admissionDate}}', '{{academicYear}}',
].join(', ');

export default function SuperAdminAdmissionTemplateManager() {
  const [schoolSearch, setSchoolSearch]       = useState('');
  const [selectedSchool, setSelectedSchool]   = useState(null);
  const [showDropdown, setShowDropdown]       = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [uploadResult, setUploadResult]       = useState(null);
  const [uploadError, setUploadError]         = useState(null);
  const [previewHtml, setPreviewHtml]         = useState('');
  const [showPreview, setShowPreview]         = useState(false);
  const [deletingId, setDeletingId]           = useState(null);
  const [editingId, setEditingId]             = useState(null);
  const [editPatch, setEditPatch]             = useState({});
  const iframeRef = useRef(null);
  const pickerRef = useRef(null);

  const { data: schoolsData, isLoading: loadingSchools } = useGetAllSchoolsQuery({ status: 'active', limit: 100 });
  const allSchools = schoolsData?.data?.schools || [];
  const filteredSchools = schoolSearch.trim()
    ? allSchools.filter(s =>
        s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(schoolSearch.toLowerCase())
      )
    : allSchools;

  useEffect(() => {
    const h = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const { data: templatesData, isFetching: loadingTemplates } = useGetSchoolAdmissionTemplatesQuery(
    { schoolId: selectedSchool?._id }, { skip: !selectedSchool }
  );
  const templates = templatesData?.data?.templates || [];

  const [uploadTemplate, { isLoading: uploading }]  = useUploadAdmissionTemplateForSchoolMutation();
  const [deleteTemplate, { isLoading: deleting }]   = useDeleteSchoolAdmissionTemplateMutation();
  const [updateTemplate, { isLoading: updating }]   = useUpdateSchoolAdmissionTemplateMutation();

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school); setSchoolSearch(school.name);
    setShowDropdown(false); setShowUploadPanel(false);
    setUploadResult(null); setUploadError(null);
  };

  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleUpload = async () => {
    setUploadError(null); setUploadResult(null);
    if (!selectedSchool)          return setUploadError('Select a school first.');
    if (!form.name.trim())        return setUploadError('Template name is required.');
    if (!form.htmlContent.trim()) return setUploadError('HTML content is required.');
    try {
      const res = await uploadTemplate({
        schoolId:       selectedSchool._id,
        name:           form.name,
        description:    form.description,
        htmlContent:    form.htmlContent,
        cssContent:     form.cssContent,
        isDefault:      form.isDefault,
        templateStatus: form.templateStatus,
      }).unwrap();
      setUploadResult({ success: true, message: res.message, data: res.data });
      setForm(EMPTY_FORM); setShowUploadPanel(false);
    } catch (err) {
      setUploadError(err?.data?.message || 'Upload failed.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete admission template "${name}"?`)) return;
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
          <h1 className="satm-title">Admission Form Template Manager</h1>
          <p className="satm-subtitle">
            Upload and manage school-branded HTML/CSS admission form templates. Use{' '}
            <code>{'{{placeholders}}'}</code> for student data fields.
          </p>
        </div>
      </div>

      {/* School Picker */}
      <div className="satm-card">
        <h2 className="satm-section-title">1. Select School</h2>
        <div className="satm-school-picker" ref={pickerRef}>
          <div className="satm-picker-input-wrap">
            <input
              id="satm-adm-school-search"
              className="satm-input satm-picker-input"
              type="text"
              placeholder={loadingSchools ? 'Loading…' : 'Search school by name or code…'}
              value={schoolSearch}
              onChange={e => { setSchoolSearch(e.target.value); setShowDropdown(true); if (!e.target.value) setSelectedSchool(null); }}
              onFocus={() => setShowDropdown(true)}
              autoComplete="off"
              readOnly={loadingSchools}
            />
            <span
              className={`satm-picker-caret${showDropdown ? ' satm-picker-caret--open' : ''}`}
              onMouseDown={e => { e.preventDefault(); setShowDropdown(p => !p); }}
            >▾</span>
          </div>
          {showDropdown && (
            <ul className="satm-dropdown">
              {filteredSchools.length === 0
                ? <li className="satm-dropdown-empty">{loadingSchools ? 'Loading…' : 'No schools found'}</li>
                : filteredSchools.map(s => (
                  <li
                    key={s._id}
                    className={`satm-dropdown-item${selectedSchool?._id === s._id ? ' satm-dropdown-item--selected' : ''}`}
                    onMouseDown={() => handleSchoolSelect(s)}
                  >
                    <span className="satm-school-name">{s.name}</span>
                    <span className="satm-school-code">{s.code}</span>
                  </li>
                ))
              }
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
            <h2 className="satm-section-title">2. Admission Templates for <em>{selectedSchool.name}</em></h2>
            <button
              id="satm-adm-upload-btn"
              className="satm-btn satm-btn-primary"
              onClick={() => { setShowUploadPanel(p => !p); setUploadError(null); setUploadResult(null); }}
            >
              {showUploadPanel ? '✕ Cancel' : '+ Upload New Template'}
            </button>
          </div>

          {/* Alerts */}
          {uploadResult?.success && (
            <div className="satm-alert satm-alert-success">
              <div>✓ {uploadResult.message}</div>
              {uploadResult.data?.extractedFields?.length > 0 && (
                <div className="satm-validation-panel">
                  <div className="satm-val-row">
                    <span className="satm-val-ok">✅ {uploadResult.data.extractedFields.length} fields extracted</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {uploadError && <div className="satm-alert satm-alert-error">✗ {uploadError}</div>}

          {/* Upload Panel */}
          {showUploadPanel && (
            <div className="satm-upload-panel">
              <div className="satm-form-grid">
                {/* Name */}
                <div className="satm-form-group">
                  <label className="satm-label">Template Name *</label>
                  <input
                    id="satm-adm-tpl-name"
                    className="satm-input"
                    placeholder="e.g. Admission Form 2025–26"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                  />
                </div>

                {/* Status */}
                <div className="satm-form-group">
                  <label className="satm-label">Status</label>
                  <select
                    id="satm-adm-tpl-status"
                    className="satm-input"
                    value={form.templateStatus}
                    onChange={e => setField('templateStatus', e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="satm-form-group satm-full-width">
                  <label className="satm-label">Description</label>
                  <input
                    id="satm-adm-tpl-desc"
                    className="satm-input"
                    placeholder="Optional description"
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                  />
                </div>

                {/* HTML */}
                <div className="satm-form-group satm-full-width">
                  <label className="satm-label">
                    HTML Template *
                    <span className="satm-label-hint">
                      Available fields: {PLACEHOLDER_HINT}
                    </span>
                  </label>
                  <textarea
                    id="satm-adm-tpl-html"
                    className="satm-textarea satm-code-area"
                    rows={14}
                    placeholder={
`<div class="admission-form">
  <h1>{{schoolName}}</h1>
  <h2>Admission Form</h2>
  <p>Name: {{name}}</p>
  <p>Class: {{className}} — Section: {{sectionName}}</p>
  <p>Date of Birth: {{dob}}</p>
  <p>Father: {{fatherName}}</p>
  <p>Mobile: {{mobileNo}}</p>
  <p>Address: {{address}}, {{city}}, {{state}}</p>
</div>`
                    }
                    value={form.htmlContent}
                    onChange={e => setField('htmlContent', e.target.value)}
                    spellCheck={false}
                  />
                </div>

                {/* CSS */}
                <div className="satm-form-group satm-full-width">
                  <label className="satm-label">CSS Styles</label>
                  <textarea
                    id="satm-adm-tpl-css"
                    className="satm-textarea satm-code-area"
                    rows={6}
                    placeholder={`.admission-form { font-family: "Arial"; padding: 20mm; font-size: 12pt; }
h1 { text-align: center; font-size: 18pt; }
p  { margin: 4mm 0; }`}
                    value={form.cssContent}
                    onChange={e => setField('cssContent', e.target.value)}
                    spellCheck={false}
                  />
                </div>

                {/* Default checkbox */}
                <div className="satm-form-group satm-checkbox-group">
                  <label className="satm-checkbox-label">
                    <input
                      type="checkbox"
                      id="satm-adm-tpl-default"
                      checked={form.isDefault}
                      onChange={e => setField('isDefault', e.target.checked)}
                    />
                    Set as default admission template for this school
                  </label>
                </div>
              </div>

              <div className="satm-upload-actions">
                <button
                  id="satm-adm-preview-btn"
                  className="satm-btn satm-btn-secondary"
                  onClick={() => {
                    setPreviewHtml(`<!DOCTYPE html><html><head><style>${form.cssContent}</style></head><body>${form.htmlContent}</body></html>`);
                    setShowPreview(true);
                  }}
                  disabled={!form.htmlContent}
                >
                  Preview
                </button>
                <button
                  id="satm-adm-save-btn"
                  className="satm-btn satm-btn-primary"
                  onClick={handleUpload}
                  disabled={uploading || !form.name || !form.htmlContent}
                >
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
                  <span>Admission Form Preview</span>
                  <button
                    id="satm-adm-close-preview"
                    className="satm-btn satm-btn-ghost"
                    onClick={() => setShowPreview(false)}
                  >✕</button>
                </div>
                <iframe
                  ref={iframeRef}
                  className="satm-preview-iframe"
                  title="Admission Form Preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* Templates Table */}
          {loadingTemplates ? (
            <div className="satm-loading">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div className="satm-empty">No admission templates yet. Upload one above.</div>
          ) : (
            <div className="satm-table-wrap">
              <table className="satm-table">
                <thead>
                  <tr>
                    <th>Name</th>
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
                      <td>
                        {editingId === t._id ? (
                          <select
                            className="satm-input satm-input-sm"
                            value={editPatch.templateStatus}
                            onChange={e => setEditPatch(p => ({ ...p, templateStatus: e.target.value }))}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                            ))}
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
                          <input
                            type="checkbox"
                            checked={!!editPatch.isActive}
                            onChange={e => setEditPatch(p => ({ ...p, isActive: e.target.checked }))}
                          />
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
                              <button
                                className="satm-btn satm-btn-success satm-btn-sm"
                                onClick={() => saveEdit(t)}
                                disabled={updating}
                              >
                                {updating ? '…' : 'Save'}
                              </button>
                              <button
                                className="satm-btn satm-btn-ghost satm-btn-sm"
                                onClick={() => setEditingId(null)}
                              >Cancel</button>
                            </>
                          ) : (
                            <>
                              <button
                                className="satm-btn satm-btn-secondary satm-btn-sm"
                                onClick={() => startEdit(t)}
                              >Edit</button>
                              <button
                                id={`satm-adm-del-${t._id}`}
                                className="satm-btn satm-btn-danger satm-btn-sm"
                                onClick={() => handleDelete(t._id, t.name)}
                                disabled={deleting && deletingId === t._id}
                              >
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
        <h3 className="satm-flow-title">How the Admission Form Flow Works</h3>
        <div className="satm-flow-steps">
          {[
            { step: '1', label: 'Super Admin uploads template', desc: 'Paste HTML/CSS with {{placeholders}} and assign to a school. Fields auto-extracted.' },
            { step: '2', label: 'Super Admin sets it as default', desc: 'Check "Set as default" during upload — or update the template status to activate it for the school.' },
            { step: '3', label: 'School Admin prints admission form', desc: 'In Print Admission Form → "Generate Custom PDF". System auto-resolves the assigned template.' },
            { step: '4', label: 'Branded PDF generated', desc: 'Puppeteer renders template + live student data from DB. Downloaded directly in the browser.' },
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
