import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  useGetGlobalTemplatesQuery,
  useGetGlobalTemplateQuery,
  useCreateGlobalTemplateMutation,
  useUpdateGlobalTemplateMutation,
  useDeleteGlobalTemplateMutation,
  useExtractGlobalTemplateFieldsMutation,
  usePreviewGlobalTemplateMutation,
} from '../api/superAdminApi';

/**
 * Global report card template authoring — SUPER ADMIN ONLY.
 *
 * Templates authored here are shared by every school. School admins can only
 * browse them and adopt one; they have no editing controls.
 *
 * FORMAT: one HTML document with inline CSS. There is deliberately no separate
 * "CSS Styles" box — put a <style> block in the HTML instead.
 */

const TEMPLATE_TYPES = [
  { value: 'annual',      label: 'Annual' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'term1',       label: 'Term 1' },
  { value: 'term2',       label: 'Term 2' },
  { value: 'custom',      label: 'Custom' },
];

const STATUSES = ['draft', 'published', 'recommended', 'deprecated', 'archived'];

const BLANK = {
  name: '', description: '', htmlContent: '',
  templateType: 'annual', templateStatus: 'published',
  isDefault: false, isActive: true,
};

export default function SuperAdminGlobalTemplates() {
  const [editingId, setEditingId] = useState(null);   // null = list view, 'new' = create
  const [form, setForm]           = useState(BLANK);
  const [tab, setTab]             = useState('editor');
  const [previewHtml, setPreviewHtml] = useState('');
  const [fields, setFields]       = useState(null);

  const { data: listData, isLoading: loadingList, refetch } = useGetGlobalTemplatesQuery({});
  const { data: oneData } = useGetGlobalTemplateQuery(editingId, {
    skip: !editingId || editingId === 'new',
  });

  const [createTpl,  { isLoading: creating }] = useCreateGlobalTemplateMutation();
  const [updateTpl,  { isLoading: updating }] = useUpdateGlobalTemplateMutation();
  const [deleteTpl]                           = useDeleteGlobalTemplateMutation();
  const [extractFields, { isLoading: extracting }] = useExtractGlobalTemplateFieldsMutation();
  const [preview,       { isLoading: previewing }] = usePreviewGlobalTemplateMutation();

  const templates = listData?.data || [];
  const saving    = creating || updating;

  // Load the selected template into the form
  useEffect(() => {
    if (editingId === 'new') { setForm(BLANK); setFields(null); setPreviewHtml(''); return; }
    const t = oneData?.data;
    if (t) {
      setForm({
        name: t.name || '', description: t.description || '',
        htmlContent: t.htmlContent || '',
        templateType: t.templateType || 'annual',
        templateStatus: t.templateStatus || 'published',
        isDefault: !!t.isDefault, isActive: t.isActive !== false,
      });
      setFields(null); setPreviewHtml('');
    }
  }, [editingId, oneData]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.htmlContent.trim()) {
      toast.error('Name and HTML content are required');
      return;
    }
    try {
      if (editingId === 'new') {
        await createTpl(form).unwrap();
        toast.success('Global template created');
      } else {
        await updateTpl({ id: editingId, ...form }).unwrap();
        toast.success('Global template updated');
      }
      setEditingId(null);
      refetch();
    } catch (e) {
      toast.error(e?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete "${t.name}"? Schools using it will be asked to pick another.`)) return;
    try {
      const res = await deleteTpl(t._id).unwrap();
      toast.success(res?.message || 'Template deleted');
      refetch();
    } catch (e) {
      toast.error(e?.data?.message || 'Delete failed');
    }
  };

  const handlePreview = async () => {
    try {
      const html = await preview({ htmlContent: form.htmlContent, sampleData: SAMPLE }).unwrap();
      setPreviewHtml(html);
      setTab('preview');
    } catch (e) {
      toast.error(e?.data?.message || 'Preview failed');
    }
  };

  const handleExtract = async () => {
    try {
      const res = await extractFields(form.htmlContent).unwrap();
      setFields(res?.data || null);
      setTab('fields');
    } catch (e) {
      toast.error(e?.data?.message || 'Field extraction failed');
    }
  };

  // ── List view ─────────────────────────────────────────────────────────────
  if (!editingId) {
    return (
      <div className="sa-wrap">
        <div className="sa-head">
          <div>
            <h1>Global Report Templates</h1>
            <p>Authored once, shared by every school. Schools adopt one — they cannot edit.</p>
          </div>
          <button className="sa-btn sa-btn-primary" onClick={() => setEditingId('new')}>
            + New Template
          </button>
        </div>

        {loadingList && <div className="sa-muted">Loading…</div>}
        {!loadingList && !templates.length && (
          <div className="sa-empty">No global templates yet. Create the first one.</div>
        )}

        <div className="sa-list">
          {templates.map((t) => (
            <div key={t._id} className="sa-row">
              <div className="sa-row-main">
                <div className="sa-row-title">
                  {t.name}
                  {t.isDefault && <span className="sa-badge sa-badge-default">Default</span>}
                  <span className={`sa-badge sa-badge-${t.templateStatus}`}>{t.templateStatus}</span>
                  {t.isActive === false && <span className="sa-badge">inactive</span>}
                </div>
                <div className="sa-row-desc">{t.description || 'No description'}</div>
                <div className="sa-row-meta">
                  Type: {t.templateType} · Updated {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className="sa-row-actions">
                <button className="sa-btn" onClick={() => setEditingId(t._id)}>Edit</button>
                <button className="sa-btn sa-btn-danger" onClick={() => handleDelete(t)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <Styles />
      </div>
    );
  }

  // ── Editor view ───────────────────────────────────────────────────────────
  return (
    <div className="sa-wrap">
      <div className="sa-head">
        <div>
          <h1>{editingId === 'new' ? 'Create Global Template' : 'Edit Global Template'}</h1>
          <p>Single HTML document with inline CSS — add a &lt;style&gt; block inside the HTML.</p>
        </div>
        <div className="sa-row-actions">
          <button className="sa-btn" onClick={() => setEditingId(null)}>Cancel</button>
          <button className="sa-btn sa-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="sa-tabs">
        {['editor', 'preview', 'fields'].map((x) => (
          <button key={x} className={`sa-tab ${tab === x ? 'is-on' : ''}`} onClick={() => setTab(x)}>
            {x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
        <div className="sa-tabs-right">
          <button className="sa-btn" onClick={handlePreview} disabled={previewing || !form.htmlContent}>
            {previewing ? 'Rendering…' : 'Preview'}
          </button>
          <button className="sa-btn" onClick={handleExtract} disabled={extracting || !form.htmlContent}>
            {extracting ? 'Scanning…' : 'Extract Fields'}
          </button>
        </div>
      </div>

      {tab === 'editor' && (
        <div className="sa-card">
          <div className="sa-grid">
            <label className="sa-field">
              <span>Template Name *</span>
              <input value={form.name} onChange={set('name')} placeholder="e.g. CBSE Two-Term Scholastic" />
            </label>
            <label className="sa-field">
              <span>Template Type</span>
              <select value={form.templateType} onChange={set('templateType')}>
                {TEMPLATE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="sa-field">
              <span>Status</span>
              <select value={form.templateStatus} onChange={set('templateStatus')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="sa-field sa-field-inline">
              <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} />
              <span>Default for this type</span>
            </label>
          </div>

          <label className="sa-field">
            <span>Description</span>
            <input value={form.description} onChange={set('description')} placeholder="Short summary shown to school admins" />
          </label>

          <label className="sa-field">
            <span>HTML Content * <em>(inline CSS only — no separate stylesheet)</em></span>
            <textarea
              className="sa-code"
              rows={22}
              value={form.htmlContent}
              onChange={set('htmlContent')}
              placeholder={'<style>\n  .rc { font-family: Arial; }\n</style>\n<div class="rc">\n  <h1>{{school-name}}</h1>\n  <table>\n    {{#subjects}}\n    <tr><td>{{name}}</td><td>{{total}}</td></tr>\n    {{/subjects}}\n  </table>\n</div>'}
            />
          </label>
        </div>
      )}

      {tab === 'preview' && (
        <div className="sa-card">
          {previewHtml
            ? <iframe title="Template preview" srcDoc={previewHtml} sandbox="" className="sa-preview" />
            : <div className="sa-muted">Hit Preview to render this template with sample data.</div>}
        </div>
      )}

      {tab === 'fields' && (
        <div className="sa-card">
          {!fields && <div className="sa-muted">Hit Extract Fields to scan the HTML for tokens.</div>}
          {fields && (
            <>
              <div className="sa-muted" style={{ marginBottom: 10 }}>
                {fields.fields?.length || 0} token(s) found. These become the teacher-facing field map.
              </div>
              <div className="sa-chips">
                {(fields.fields || []).map((f, i) => (
                  <span key={i} className="sa-chip">{`{{${f.name}}}`}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <Styles />
    </div>
  );
}

// Minimal sample data so Preview shows something representative.
const SAMPLE = {
  schoolName: 'Sample Public School',
  name: 'Aarav Sharma', rollNo: '01', class: 'Class 5', section: 'A',
  session: '2025-2026', percentage: 78.5, grade: 'B+', result: 'PASS',
  subjects: [
    { name: 'English', total: 73, grade: 'B+' },
    { name: 'Mathematics', total: 90, grade: 'A' },
  ],
  co_scholastic: [{ name: 'Discipline', grade: 'A' }],
};

function Styles() {
  return (
    <style>{`
      .sa-wrap { padding: 4px 2px 40px; }
      .sa-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:18px; flex-wrap:wrap; }
      .sa-head h1 { font-size:20px; font-weight:700; color:#0f172a; margin:0; }
      .sa-head p  { font-size:12px; color:#64748b; margin:4px 0 0; }
      .sa-muted { color:#64748b; font-size:13px; }
      .sa-empty { border:1px dashed #cbd5e1; border-radius:12px; padding:36px; text-align:center; color:#64748b; font-size:13px; }
      .sa-btn { border:1px solid #e2e8f0; background:#fff; color:#0f172a; font-size:12px; font-weight:600;
                padding:7px 14px; border-radius:9px; cursor:pointer; }
      .sa-btn:hover { background:#f8fafc; }
      .sa-btn:disabled { opacity:.5; cursor:not-allowed; }
      .sa-btn-primary { background:#0f172a; color:#fff; border-color:#0f172a; }
      .sa-btn-danger  { color:#b91c1c; border-color:#fecaca; }
      .sa-list { display:flex; flex-direction:column; gap:10px; }
      .sa-row { display:flex; justify-content:space-between; gap:16px; align-items:center;
                border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; background:#fff; }
      .sa-row-title { font-size:14px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .sa-row-desc  { font-size:12px; color:#475569; margin-top:3px; }
      .sa-row-meta  { font-size:11px; color:#94a3b8; margin-top:4px; }
      .sa-row-actions { display:flex; gap:8px; flex-shrink:0; }
      .sa-badge { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.4px;
                  padding:2px 7px; border-radius:6px; background:#f1f5f9; color:#475569; }
      .sa-badge-default { background:#fef3c7; color:#92400e; }
      .sa-badge-published { background:#dcfce7; color:#166534; }
      .sa-badge-recommended { background:#dbeafe; color:#1e40af; }
      .sa-badge-draft { background:#f1f5f9; color:#475569; }
      .sa-badge-deprecated, .sa-badge-archived { background:#fee2e2; color:#991b1b; }
      .sa-tabs { display:flex; align-items:center; gap:6px; border-bottom:1px solid #e2e8f0; margin-bottom:14px; padding-bottom:8px; }
      .sa-tabs-right { margin-left:auto; display:flex; gap:8px; }
      .sa-tab { border:none; background:none; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; padding:6px 10px; border-radius:8px; }
      .sa-tab.is-on { background:#0f172a; color:#fff; }
      .sa-card { border:1px solid #e2e8f0; border-radius:12px; background:#fff; padding:16px; }
      .sa-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:14px; }
      .sa-field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
      .sa-field > span { font-size:12px; font-weight:600; color:#334155; }
      .sa-field > span em { font-weight:400; color:#94a3b8; font-style:normal; }
      .sa-field input[type=text], .sa-field input:not([type]), .sa-field select, .sa-field textarea {
        border:1px solid #e2e8f0; border-radius:9px; padding:8px 10px; font-size:13px; outline:none; width:100%; box-sizing:border-box; }
      .sa-field-inline { flex-direction:row; align-items:center; gap:8px; }
      .sa-code { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px; line-height:1.5; }
      .sa-preview { width:100%; height:70vh; border:1px solid #e2e8f0; border-radius:10px; background:#fff; }
      .sa-chips { display:flex; flex-wrap:wrap; gap:6px; }
      .sa-chip { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:11px; background:#f1f5f9;
                 border:1px solid #e2e8f0; border-radius:6px; padding:3px 7px; color:#0f172a; }
    `}</style>
  );
}
