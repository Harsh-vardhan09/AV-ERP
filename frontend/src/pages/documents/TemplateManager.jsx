import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetTemplateQuery,
  useUploadTemplateImageMutation,
  useSaveTemplateFieldsMutation,
  useDeleteTemplateMutation,
  useSaveTemplateLayoutMutation,
} from '../../redux/api/documentTemplateApi';
import LayoutBuilder from './LayoutBuilder';
import './templateManager.css';

// ─────────────────────────────────────────────────────────────────────────────
// FIELD LIBRARY
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_LIBRARY = [
  { key: 'studentName',                label: 'Student Name' },
  { key: 'fatherName',                 label: "Father's Name" },
  { key: 'motherName',                 label: "Mother's Name" },
  { key: 'className',                  label: 'Class' },
  { key: 'sectionName',                label: 'Section' },
  { key: 'admissionNo',                label: 'Admission No.' },
  { key: 'rollNo',                     label: 'Roll No.' },
  { key: 'dob',                        label: 'Date of Birth' },
  { key: 'address',                    label: 'Address' },
  { key: 'district',                   label: 'District' },
  { key: 'schoolName',                 label: 'School Name' },
  { key: 'udiseCode',                  label: 'UDISE Code' },
  { key: 'schoolAddress',              label: 'School Address' },
  { key: 'leavingDate',                label: 'Date of Leaving' },
  { key: 'reasonForTransfer',          label: 'Reason for Transfer' },
  { key: 'lastClassPassed',            label: 'Last Class Passed' },
  { key: 'lastClassAttended',          label: 'Last Class Attended' },
  { key: 'certificateNo',              label: 'Certificate No.' },
  { key: 'issueDate',                  label: 'Issue Date' },
  { key: 'sessionName',                label: 'Session' },
  { key: 'pen',                        label: 'PEN Number' },
  { key: 'studentCode',                label: 'Student Code' },
  // Migration-specific
  { key: 'nationality',                label: 'Nationality' },
  { key: 'religion',                   label: 'Religion' },
  { key: 'conduct',                    label: 'Conduct' },
  { key: 'whetherPassed',              label: 'Passed Exam' },
  { key: 'dateOfLeaving',              label: 'Date of Leaving / Migration' },
  { key: 'remarks',                    label: 'Remarks' },
];

const DUMMY = {
  studentName: 'RAHUL KUMAR SHARMA', fatherName: 'RAJESH KUMAR SHARMA',
  motherName: 'SUNITA SHARMA', className: 'Class X', sectionName: 'A',
  admissionNo: 'ADM-2024-001', rollNo: '101', dob: '15/08/2008',
  address: '12, MG Road, Bhopal', district: 'Bhopal',
  schoolName: 'DEMO PUBLIC SCHOOL', udiseCode: '23456789001',
  schoolAddress: 'Block A, Bhopal, M.P.', leavingDate: '31/03/2024',
  reasonForTransfer: 'Parent Transfer', lastClassPassed: 'Class IX',
  lastClassAttended: 'Class X', certificateNo: 'TC-2024-001',
  issueDate: '07/04/2024', sessionName: '2023-24',
  pen: 'MP1234567890', studentCode: 'STU-001',
};

const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana'];

// ─────────────────────────────────────────────────────────────────────────────
// DRAGGABLE FIELD — placed on the template canvas
// ─────────────────────────────────────────────────────────────────────────────
const DraggableField = ({ field, selected, onSelect, onMove, containerRef, showDummy }) => {
  const dragStart = useRef(null);
  const fieldRef  = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const rect = containerRef.current.getBoundingClientRect();
    dragStart.current = {
      startX: e.clientX,
      startY: e.clientY,
      origXPct: field.xPercent,
      origYPct: field.yPercent,
      cW: rect.width,
      cH: rect.height,
    };

    const onMouseMove = (me) => {
      if (!dragStart.current) return;
      const { startX, startY, origXPct, origYPct, cW, cH } = dragStart.current;
      const dx = ((me.clientX - startX) / cW) * 100;
      const dy = ((me.clientY - startY) / cH) * 100;
      const nx = Math.min(95, Math.max(0, origXPct + dx));
      const ny = Math.min(95, Math.max(0, origYPct + dy));
      onMove(nx, ny);
    };

    const onMouseUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const displayText = showDummy ? (DUMMY[field.key] || `[${field.label}]`) : `{{${field.label}}}`;

  return (
    <div
      ref={fieldRef}
      className={`td-field-chip ${selected ? 'td-field-chip-selected' : ''}`}
      style={{
        left:       `${field.xPercent}%`,
        top:        `${field.yPercent}%`,
        fontSize:   `${field.fontSize}px`,
        fontWeight: field.fontWeight,
        color:      field.color,
        fontFamily: field.fontFamily,
        maxWidth:   `${field.width}px`,
      }}
      onMouseDown={handleMouseDown}
      title={`Drag to reposition • ${field.key}`}
    >
      {displayText}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FIELD STYLE PANEL — shown when a field is selected
// ─────────────────────────────────────────────────────────────────────────────
const FieldStylePanel = ({ field, onChange, onRemove }) => {
  if (!field) return (
    <div className="td-style-empty">
      <span>👆</span>
      <p>Click any field on the canvas to edit its style</p>
    </div>
  );

  return (
    <div className="td-style-panel">
      <div className="td-style-header">
        <span className="td-style-key">{'{{'}{field.label}{'}}'}</span>
        <button className="td-style-remove" onClick={onRemove} title="Remove field">✕</button>
      </div>

      <div className="td-style-grid">
        <label className="td-style-label">Font Size</label>
        <input
          type="number" min={6} max={72} className="td-style-input"
          value={field.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />

        <label className="td-style-label">Font Weight</label>
        <select className="td-style-input" value={field.fontWeight}
          onChange={(e) => onChange({ fontWeight: e.target.value })}>
          <option value="normal">Normal</option>
          <option value="600">Semi-Bold</option>
          <option value="bold">Bold</option>
          <option value="800">Extra Bold</option>
        </select>

        <label className="td-style-label">Color</label>
        <input
          type="color" className="td-style-color"
          value={field.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />

        <label className="td-style-label">Font Family</label>
        <select className="td-style-input" value={field.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}>
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <label className="td-style-label">Max Width (px)</label>
        <input
          type="number" min={50} max={800} className="td-style-input"
          value={field.width}
          onChange={(e) => onChange({ width: Number(e.target.value) })}
        />
        <label className="td-style-label">Alignment</label>
        <select
          className="td-style-input"
          value={field.alignment || 'left'}
          onChange={(e) => onChange({ alignment: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>

        <label className="td-style-label">Max Lines</label>
        <input
          type="number" min={1} max={8} className="td-style-input"
          value={field.maxLines || 2}
          onChange={(e) => onChange({ maxLines: Number(e.target.value) })}
        />

        <label className="td-style-label">X Position %</label>
        <input
          type="number" min={0} max={99} step={0.5} className="td-style-input"
          value={Number(field.xPercent).toFixed(1)}
          onChange={(e) => onChange({ xPercent: Number(e.target.value) })}
        />

        <label className="td-style-label">Y Position %</label>
        <input
          type="number" min={0} max={99} step={0.5} className="td-style-input"
          value={Number(field.yPercent).toFixed(1)}
          onChange={(e) => onChange({ yPercent: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: TemplateManager
// ─────────────────────────────────────────────────────────────────────────────
const TemplateManager = () => {
  const [activeType, setActiveType]       = useState('TC');
  // 'overlay' = legacy image+field canvas | 'structured' = new layout builder
  const [designerTab, setDesignerTab]     = useState('overlay');
  const [fields, setFields]               = useState([]);
  const [selectedIdx, setSelectedIdx]     = useState(null);
  const [showDummy, setShowDummy]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [templateName, setTemplateName]   = useState('');
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  const { data: apiData, isFetching, refetch } = useGetTemplateQuery(activeType);
  const [uploadImage,    { isLoading: uploading }] = useUploadTemplateImageMutation();
  const [saveFields,     { isLoading: saving }]    = useSaveTemplateFieldsMutation();
  const [deleteTemplate, { isLoading: deleting }]  = useDeleteTemplateMutation();
  const [saveLayout]                               = useSaveTemplateLayoutMutation();

  const template = apiData?.data;
  const imageUrl = template?.templateImageUrl || '';
  const hasTemplateCanvas = Boolean(imageUrl || template?.templatePdfUrl);
  // Switch designer tab to 'structured' automatically if template is already structured
  useEffect(() => {
    if (template?.layoutMode === 'structured') setDesignerTab('structured');
    else setDesignerTab('overlay');
  }, [template?.layoutMode]);

  // Load saved fields when template changes
  useEffect(() => {
    if (template?.fields) {
      setFields(template.fields.map(f => ({ ...f })));
    } else {
      setFields([]);
    }
    setTemplateName(template?.name || '');
    setSelectedIdx(null);
  }, [template, activeType]);

  // ── IMAGE UPLOAD ────────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowed.includes(file.type)) { toast.error('Only PNG/JPG/PDF files are allowed'); return; }
    if (file.size > 15 * 1024 * 1024)   { toast.error('File too large (max 15 MB)'); return; }

    const fd = new FormData();
    fd.append('templateFile', file);
    fd.append('type', activeType);
    fd.append('name', templateName || `${activeType} Template`);

    try {
      await uploadImage(fd).unwrap();
      toast.success('Template image uploaded! Now add fields.');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Upload failed');
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── ADD FIELD ───────────────────────────────────────────────────────────────
  const handleAddField = (key) => {
    if (fields.find(f => f.key === key)) {
      toast(`Field "${key}" already added`, { icon: 'ℹ️' });
      return;
    }
    const entry = FIELD_LIBRARY.find(f => f.key === key);
    const newField = {
      key,
      label:      entry?.label || key,
      xPercent:   5,
      yPercent:   fields.length * 5 + 5, // stagger vertically
      fontSize:   14,
      fontWeight: 'normal',
      color:      '#000000',
      fontFamily: 'Arial',
      width:      250,
      alignment:  'left',
      maxLines:   2,
    };
    setFields(prev => {
      const updated = [...prev, newField];
      setSelectedIdx(updated.length - 1);
      return updated;
    });
  };

  // ── MOVE FIELD ──────────────────────────────────────────────────────────────
  const handleMove = useCallback((idx, nx, ny) => {
    setFields(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], xPercent: nx, yPercent: ny };
      return updated;
    });
  }, []);

  // ── UPDATE SELECTED FIELD STYLE ────────────────────────────────────────────
  const handleStyleChange = useCallback((changes) => {
    if (selectedIdx === null) return;
    setFields(prev => {
      const updated = [...prev];
      updated[selectedIdx] = { ...updated[selectedIdx], ...changes };
      return updated;
    });
  }, [selectedIdx]);

  // ── REMOVE FIELD ────────────────────────────────────────────────────────────
  const handleRemoveField = useCallback(() => {
    if (selectedIdx === null) return;
    setFields(prev => {
      const updated = prev.filter((_, i) => i !== selectedIdx);
      return updated;
    });
    setSelectedIdx(null);
  }, [selectedIdx]);

  // ── SAVE FIELDS ─────────────────────────────────────────────────────────────
  const handleSaveFields = async () => {
    if (!template?._id) { toast.error('Upload a template image first'); return; }
    if (fields.length === 0) { toast.error('Add at least one field before saving'); return; }
    try {
      const res = await saveFields({ id: template._id, fields, name: templateName }).unwrap();
      toast.success(res.message || 'Fields saved!');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Save failed');
    }
  };

  // ── DELETE TEMPLATE ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!template?._id) return;
    try {
      await deleteTemplate(template._id).unwrap();
      toast.success('Template deleted');
      refetch();
      setConfirmDelete(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const selectedField = selectedIdx !== null ? fields[selectedIdx] : null;

  /* ── STATUS BAR LABEL ── */
  const statusLabel = isFetching ? '⏳ Loading…' : template
    ? `✅ Template active — v${template.version} — Mode: ${template.layoutMode || 'overlay'} — ${template.fields?.length || 0} overlay field(s) — ${template.layout?.length || 0} layout row(s) — last updated ${new Date(template.updatedAt).toLocaleString()}`
    : `⚠️ No ${activeType} template yet. Upload a certificate image to start.`;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="td-page">

      {/* ── Header ── */}
      <div className="td-header">
        <div>
          <Link to="/admin/documents" className="td-back">← Documents</Link>
          <h1 className="td-title">🖼 Certificate Template Designer</h1>
          <p className="td-subtitle">Upload your certificate image, then build the layout or drag fields onto it.</p>
        </div>
        <div className="td-type-tabs">
          {['TC', 'MIGRATION'].map(t => (
            <button key={t}
              className={`td-tab ${activeType === t ? 'td-tab-active' : ''}`}
              onClick={() => setActiveType(t)}>
              {t === 'TC' ? '📋 Transfer Certificate' : '🎓 Migration Certificate'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className={`td-status ${template ? 'td-status-ok' : 'td-status-warn'}`}>
        {statusLabel}
      </div>

      {/* ── Toolbar row ── */}
      <div className="td-toolbar">
        <input
          className="td-name-input"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          placeholder="Template name (e.g. TC 2024)"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          className="td-btn td-btn-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '⏳ Uploading…' : hasTemplateCanvas ? '🔄 Replace Template File' : '📤 Upload Template (PNG/JPG/PDF)'}
        </button>

        {template && designerTab === 'overlay' && (
          <button className="td-btn td-btn-primary" onClick={handleSaveFields} disabled={saving}>
            {saving ? '💾 Saving…' : '💾 Save Overlay Fields'}
          </button>
        )}

        {designerTab === 'overlay' && (
          <button className="td-btn td-btn-ghost" onClick={() => setShowDummy(p => !p)}>
            {showDummy ? '🏷 Show Tags' : '👁 Preview with Dummy Data'}
          </button>
        )}

        {template && !confirmDelete && (
          <button className="td-btn td-btn-danger" onClick={() => setConfirmDelete(true)} disabled={deleting}>
            🗑 Delete
          </button>
        )}
        {confirmDelete && (
          <>
            <span className="td-confirm-msg">Delete this template?</span>
            <button className="td-btn td-btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button className="td-btn td-btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </>
        )}
      </div>

      {/* ── Designer Mode Tabs ── */}
      {template && (
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 16, marginTop: 4 }}>
          <button
            onClick={() => setDesignerTab('overlay')}
            style={{
              padding: '8px 20px', fontWeight: 700, fontSize: '0.85rem',
              border: 'none', borderBottom: designerTab === 'overlay' ? '3px solid #1a3c6e' : '3px solid transparent',
              background: 'transparent', color: designerTab === 'overlay' ? '#1a3c6e' : '#64748b',
              cursor: 'pointer',
            }}
          >
            🖼 Image Overlay (Legacy)
          </button>
          <button
            onClick={() => setDesignerTab('structured')}
            style={{
              padding: '8px 20px', fontWeight: 700, fontSize: '0.85rem',
              border: 'none', borderBottom: designerTab === 'structured' ? '3px solid #0891b2' : '3px solid transparent',
              background: 'transparent', color: designerTab === 'structured' ? '#0891b2' : '#64748b',
              cursor: 'pointer',
            }}
          >
            🗂 Layout Builder
            <span style={{ marginLeft: 6, fontSize: '0.68rem', background: '#e0f2fe', color: '#0891b2', padding: '1px 5px', borderRadius: 3, fontWeight: 800 }}>NEW</span>
          </button>
        </div>
      )}

      {/* ── Workspace: overlay canvas OR layout builder ── */}
      {designerTab === 'structured' && template ? (
        <div style={{ padding: '0 4px' }}>
          <LayoutBuilder
            template={template}
            saveLayout={saveLayout}
            onSaved={() => refetch()}
          />
        </div>
      ) : (
        <div className="td-workspace">

          {/* LEFT: field library + style panel */}
          <div className="td-sidebar">

            <div className="td-sidebar-section">
              <div className="td-sidebar-title">➕ Add Fields</div>
              <div className="td-field-library">
                {FIELD_LIBRARY.map(({ key, label }) => {
                  const isAdded = fields.some(f => f.key === key);
                  return (
                    <button
                      key={key}
                      className={`td-lib-btn ${isAdded ? 'td-lib-btn-added' : ''}`}
                      onClick={() => handleAddField(key)}
                      disabled={isAdded || !hasTemplateCanvas}
                      title={isAdded ? 'Already on canvas' : 'Click to add'}
                    >
                      {isAdded ? '✓ ' : '+ '}{label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="td-sidebar-section td-sidebar-section-style">
              <div className="td-sidebar-title">🎨 Selected Field Style</div>
              <FieldStylePanel
                field={selectedField}
                onChange={handleStyleChange}
                onRemove={handleRemoveField}
              />
            </div>
          </div>

          {/* RIGHT: canvas */}
          <div className="td-canvas-area">
            {!hasTemplateCanvas ? (
              <div
                className="td-canvas-empty"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="td-canvas-empty-icon">📄</span>
                <p>Click to upload your certificate template file</p>
                <span className="td-canvas-empty-hint">JPG, PNG or PDF, max 15 MB</span>
              </div>
            ) : (
              <div
                className="td-canvas"
                ref={canvasRef}
                onClick={() => setSelectedIdx(null)}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Certificate template"
                    className="td-canvas-img"
                    draggable={false}
                  />
                ) : (
                  <div style={{ width: 794, maxWidth: '100%', aspectRatio: '794/1123', background: '#fff', border: '1px dashed #cbd5e1' }} />
                )}
                {fields.map((field, i) => (
                  <DraggableField
                    key={field.key}
                    field={field}
                    selected={selectedIdx === i}
                    showDummy={showDummy}
                    containerRef={canvasRef}
                    onSelect={() => setSelectedIdx(i)}
                    onMove={(nx, ny) => handleMove(i, nx, ny)}
                  />
                ))}
              </div>
            )}

            <div className="td-canvas-hint">
              {hasTemplateCanvas
                ? '👆 Click a field to select • Drag to reposition • Use the style panel on the left to style each field'
                : 'Upload a certificate image first, then add fields from the library'}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default TemplateManager;

