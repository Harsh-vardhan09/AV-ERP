import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useCreateAdmissionTemplateMutation,
  useUpdateAdmissionTemplateMutation,
  useGetAdmissionTemplateQuery,
  usePreviewAdmissionTemplateMutation,
  useExtractAdmissionTemplateFieldsMutation,
} from '../../../redux/api/admissionTemplateApi';

const PAGE_SIZES   = ['A4', 'A3', 'Letter', 'Legal'];
const ORIENTATIONS = ['portrait', 'landscape'];
const STATUSES     = ['draft', 'published', 'recommended', 'deprecated'];

const DEFAULT_SAMPLE = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
  h2 { text-align: center; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 6px 10px; border: 1px solid #d1d5db; }
  .label { background: #f3f4f6; font-weight: bold; width: 35%; }
  .photo { float: right; width: 90px; height: 110px; border: 1px solid #ccc; text-align: center; }
</style>
</head>
<body>
<div class="photo">{{photo}}<br/>Photo</div>
<h2>{{schoolName}}</h2>
<h3 style="text-align:center">ADMISSION FORM</h3>
<table>
  <tr><td class="label">Admission No.</td><td>{{admissionNo}}</td>
      <td class="label">Roll No.</td><td>{{rollNo}}</td></tr>
  <tr><td class="label">Student Name</td><td colspan="3">{{name}}</td></tr>
  <tr><td class="label">Date of Birth</td><td>{{dob}}</td>
      <td class="label">Gender</td><td>{{gender}}</td></tr>
  <tr><td class="label">Class</td><td>{{className}}</td>
      <td class="label">Section</td><td>{{sectionName}}</td></tr>
  <tr><td class="label">Father's Name</td><td>{{fatherName}}</td>
      <td class="label">Mother's Name</td><td>{{motherName}}</td></tr>
  <tr><td class="label">Mobile No.</td><td>{{mobileNo}}</td>
      <td class="label">Email</td><td>{{emailAddress}}</td></tr>
  <tr><td class="label">Address</td><td colspan="3">{{address}}, {{city}}, {{state}} - {{pincode}}</td></tr>
  <tr><td class="label">Aadhar No.</td><td>{{aadharNo}}</td>
      <td class="label">Blood Group</td><td>{{bloodGroup}}</td></tr>
  <tr><td class="label">Admission Date</td><td>{{admissionDate}}</td>
      <td class="label">Academic Year</td><td>{{academicYear}}</td></tr>
</table>
</body>
</html>`;

export default function AdmissionTemplateEditor() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const isEdit    = Boolean(id);
  const iframeRef = useRef(null);

  const [form, setForm] = useState({
    name: '', description: '', htmlContent: DEFAULT_SAMPLE, cssContent: '',
    templateStatus: 'published',
    config: { pageSize: 'A4', orientation: 'portrait', marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10 },
  });
  const [extractedFields, setExtractedFields] = useState([]);
  const [previewHtml, setPreviewHtml]         = useState('');
  const [tab, setTab]                         = useState('editor'); // 'editor' | 'preview' | 'fields'
  const [dirty, setDirty]                     = useState(false);

  const { data: existing, isLoading: loadingExisting } = useGetAdmissionTemplateQuery(id, { skip: !isEdit });
  const [createTemplate, { isLoading: isCreating }] = useCreateAdmissionTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateAdmissionTemplateMutation();
  const [previewTemplate, { isLoading: isPreviewing }] = usePreviewAdmissionTemplateMutation();
  const [extractFields,   { isLoading: isExtracting }] = useExtractAdmissionTemplateFieldsMutation();

  // Load existing template when editing
  useEffect(() => {
    if (existing?.data) {
      const t = existing.data;
      setForm({
        name: t.name || '',
        description: t.description || '',
        htmlContent: t.htmlContent || '',
        cssContent:  t.cssContent  || '',
        templateStatus: t.templateStatus || 'published',
        config: { pageSize: 'A4', orientation: 'portrait', marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10, ...(t.config || {}) },
      });
      setExtractedFields(t.extractedFields || []);
    }
  }, [existing]);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setDirty(true); };
  const setConfig = (key, val) => { setForm(f => ({ ...f, config: { ...f.config, [key]: val } })); setDirty(true); };

  const handlePreview = async () => {
    try {
      const html = await previewTemplate({ htmlContent: form.htmlContent, cssContent: form.cssContent }).unwrap();
      setPreviewHtml(html);
      setTab('preview');
    } catch (err) {
      toast.error('Preview failed: ' + (err?.data?.message || err.message));
    }
  };

  const handleExtract = async () => {
    try {
      const res = await extractFields(form.htmlContent).unwrap();
      setExtractedFields(res?.data?.fields || []);
      setTab('fields');
      toast.success(`${res?.data?.count || 0} fields extracted`);
    } catch (err) {
      toast.error('Extraction failed');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim())        return toast.error('Template name is required');
    if (!form.htmlContent.trim()) return toast.error('HTML content is required');
    try {
      if (isEdit) {
        await updateTemplate({ id, ...form }).unwrap();
        toast.success('Template updated');
      } else {
        await createTemplate(form).unwrap();
        toast.success('Template created');
      }
      setDirty(false);
      navigate(-1);
    } catch (err) {
      toast.error(err?.data?.message || 'Save failed');
    }
  };

  const isSaving = isCreating || isUpdating;

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{isEdit ? 'Edit Template' : 'New Admission Template'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExtract} disabled={isExtracting || !form.htmlContent}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors">
            {isExtracting ? <div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : '🔍'}
            Extract Fields
          </button>
          <button onClick={handlePreview} disabled={isPreviewing || !form.htmlContent}
            className="flex items-center gap-1.5 border border-blue-400 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-40 transition-colors">
            {isPreviewing ? <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : '👁'}
            Preview
          </button>
          <button onClick={handleSave} disabled={isSaving || !dirty}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {isSaving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {isSaving ? 'Saving…' : (isEdit ? 'Update' : 'Save Template')}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">

        {/* Left: meta + config */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Template Info</h2>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Standard Admission Form 2024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="Optional description…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.templateStatus} onChange={e => set('templateStatus', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Page config */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Page Layout</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Page Size</label>
                <select value={form.config.pageSize} onChange={e => setConfig('pageSize', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Orientation</label>
                <select value={form.config.orientation} onChange={e => setConfig('orientation', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {ORIENTATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['marginTop','marginBottom','marginLeft','marginRight'].map(m => (
                <div key={m}>
                  <label className="text-xs text-gray-500 block mb-1 capitalize">{m.replace('margin','').toLowerCase()} margin (mm)</label>
                  <input type="number" min={0} max={50} value={form.config[m]}
                    onChange={e => setConfig(m, Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          </div>

          {/* CSS */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Custom CSS</h2>
            <textarea value={form.cssContent} onChange={e => set('cssContent', e.target.value)}
              rows={6} placeholder="/* Extra styles injected into the template */"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* Right: tabbed editor/preview/fields */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-2 bg-gray-100 rounded-lg p-1 w-fit">
            {[{id:'editor',label:'HTML Editor'},{ id:'preview', label:'Preview' }, { id:'fields', label:`Fields (${extractedFields.length})` }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            {/* HTML Editor */}
            {tab === 'editor' && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-t-xl">
                  <span className="text-xs text-gray-400 font-mono">template.html</span>
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                </div>
                <textarea
                  value={form.htmlContent}
                  onChange={e => set('htmlContent', e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full bg-gray-900 text-green-300 font-mono text-xs p-4 rounded-b-xl outline-none resize-none border border-gray-700 border-t-0"
                  style={{ minHeight: '500px' }}
                  placeholder="Paste or write your HTML template here…"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use <code className="bg-gray-100 px-1 rounded">{'{{fieldName}}'}</code> for placeholders. See field list for all supported variables.
                </p>
              </div>
            )}

            {/* Preview */}
            {tab === 'preview' && (
              <div className="h-full flex flex-col border border-gray-200 rounded-xl overflow-hidden" style={{ minHeight: '500px' }}>
                {previewHtml ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml}
                    title="Template Preview"
                    className="flex-1 w-full border-0"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
                    <div className="text-4xl">👁</div>
                    <p className="text-sm">Click <strong>Preview</strong> to render with sample data</p>
                    <button onClick={handlePreview} disabled={isPreviewing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                      {isPreviewing ? 'Generating…' : 'Generate Preview'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Extracted Fields */}
            {tab === 'fields' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden" style={{ minHeight: '500px' }}>
                {extractedFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                    <div className="text-4xl">🔍</div>
                    <p className="text-sm">Click <strong>Extract Fields</strong> to scan template</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 grid grid-cols-3">
                      <span>Field Name</span><span>Type</span><span>Parent Array</span>
                    </div>
                    {extractedFields.map((f, i) => (
                      <div key={i} className="px-4 py-2 text-xs grid grid-cols-3 items-center hover:bg-gray-50">
                        <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">{`{{${f.name || f}}}`}</code>
                        <span className="text-gray-500 capitalize">{f.type || 'simple'}</span>
                        <span className="text-gray-400">{f.parentArray || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
