/**
 * LayoutBuilder.jsx
 * ─────────────────────────────────────────────────────
 * Structured layout designer for TC and Migration certificates.
 * Admin builds a list of rows (label → field key → style),
 * then saves the layout to replace x/y overlay positioning.
 *
 * Props:
 *   template        – DocumentTemplate object from backend
 *   onSaved         – (updatedTemplate) => void
 *   useSaveLayout   – RTK mutation hook
 */
import React, { useState, useCallback, useRef } from 'react';
import { DUMMY_DATA } from './layoutBuilderDummy';
import StructuredCertificateView from './StructuredCertificateView';

// ─────────────────────────────────────────────────────────────────────────────
// Field key registry
// ─────────────────────────────────────────────────────────────────────────────
const ALL_FIELD_KEYS = [
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
  { key: 'pen',                        label: 'PEN Number' },
  { key: 'studentCode',                label: 'Student Code' },
  { key: 'leavingDate',                label: 'Date of Leaving' },
  { key: 'reasonForTransfer',          label: 'Reason for Transfer' },
  { key: 'lastClassPassed',            label: 'Last Class Passed' },
  { key: 'lastClassAttended',          label: 'Last Class Attended' },
  { key: 'sessionName',                label: 'Academic Session' },
  // Migration-specific
  { key: 'nationality',                label: 'Nationality' },
  { key: 'religion',                   label: 'Religion' },
  { key: 'conduct',                    label: 'Conduct' },
  { key: 'whetherPassed',              label: 'Passed Exam' },
  { key: 'dateOfLeaving',              label: 'Date of Leaving / Migration' },
  { key: 'remarks',                    label: 'Remarks' },
  // TC date fields
  { key: 'certificationStatementDate', label: 'Transfer Statement Date' },
  { key: 'issueFooterDate',            label: 'Issue Footer Date' },
  { key: 'acknowledgementDate',        label: 'Acknowledgement Date' },
];

const ROW_TYPES = [
  { value: 'row',       label: 'Simple Row (Label → Value)' },
  { value: 'row-split', label: 'Split Row (two fields side-by-side)' },
  { value: 'heading',   label: 'Section Heading' },
  { value: 'certify',   label: 'Certify Statement' },
  { value: 'spacer',    label: 'Spacer (empty row)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default rows for TC / Migration if admin starts fresh
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_TC = [
  { id: 1,  type: 'row',       label: "Student's Name",                  key: 'studentName',       bold: true  },
  { id: 2,  type: 'row-split', label: '',                                 fields: [
    { label: 'Student Code', key: 'studentCode' },
    { label: 'PEN No.',      key: 'pen'         },
  ]},
  { id: 3,  type: 'row',       label: "Father's Name",                    key: 'fatherName'        },
  { id: 4,  type: 'row',       label: "Mother's Name",                    key: 'motherName'        },
  { id: 5,  type: 'row',       label: 'Address',                          key: 'address',       multiline: true },
  { id: 6,  type: 'row',       label: 'District',                         key: 'district'          },
  { id: 7,  type: 'row',       label: 'Date of Birth (Admission Reg.)',   key: 'dob'               },
  { id: 8,  type: 'row',       label: 'Last Class Passed',                key: 'lastClassPassed'   },
  { id: 9,  type: 'row',       label: 'Last Class Attended',              key: 'lastClassAttended' },
  { id: 10, type: 'row',       label: 'Reason for Transfer',              key: 'reasonForTransfer', multiline: true },
  { id: 11, type: 'certify',   label: 'Certified that the student has been transferred on', key: 'certificationStatementDate' },
];

const DEFAULT_MIGRATION = [
  { id: 1, type: 'row', label: 'Name of Pupil',                  key: 'studentName',       bold: true },
  { id: 2, type: 'row', label: "Father's Name",                   key: 'fatherName'        },
  { id: 3, type: 'row', label: "Mother's Name",                   key: 'motherName'        },
  { id: 4, type: 'row', label: 'Date of Birth (Admission Reg.)',  key: 'dob'               },
  { id: 5, type: 'row', label: 'Nationality',                     key: 'nationality'       },
  { id: 6, type: 'row', label: 'Religion',                        key: 'religion'          },
  { id: 7, type: 'row', label: 'Class Last Attended',             key: 'lastClassAttended' },
  { id: 8, type: 'row', label: 'Passed Promotion Exam',           key: 'whetherPassed'     },
  { id: 9, type: 'row', label: 'Conduct',                         key: 'conduct'           },
  { id: 10, type: 'row', label: 'Date of Leaving / Migration',    key: 'dateOfLeaving'     },
  { id: 11, type: 'row', label: 'Student Code',                   key: 'studentCode'       },
  { id: 12, type: 'row', label: 'Remarks',                        key: 'remarks', multiline: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
let _nextId = 1000;
const uid = () => ++_nextId;

function stripTempIds(rows) {
  return rows.map(({ id: _id, ...rest }) => {
    if (rest.type === 'row-split' && Array.isArray(rest.fields)) {
      return { ...rest };           // fields don't have ids
    }
    return rest;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Row Editor component
// ─────────────────────────────────────────────────────────────────────────────
function RowEditor({ row, idx, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  const update = (patch) => onChange(idx, { ...row, ...patch });

  const isSplit = row.type === 'row-split';

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #cbd5e1',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 8,
    }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Type */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, minWidth: 28 }}>#{idx + 1}</span>
          <select
            value={row.type}
            onChange={(e) => update({ type: e.target.value, fields: e.target.value === 'row-split' ? (row.fields || [{ label: '', key: '' }, { label: '', key: '' }]) : undefined })}
            style={{ fontSize: '0.8rem', padding: '3px 6px', borderRadius: 5, border: '1px solid #cbd5e1' }}
          >
            {ROW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Simple row fields */}
        {(row.type === 'row' || row.type === 'certify') && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              placeholder="Label text (e.g. Student's Name)"
              value={row.label || ''}
              onChange={(e) => update({ label: e.target.value })}
              style={{ flex: 2, minWidth: 180, fontSize: '0.8rem', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 5 }}
            />
            <select
              value={row.key || ''}
              onChange={(e) => update({ key: e.target.value })}
              style={{ flex: 1, minWidth: 160, fontSize: '0.8rem', padding: '3px 6px', borderRadius: 5, border: '1px solid #cbd5e1' }}
            >
              <option value="">— select field key —</option>
              {ALL_FIELD_KEYS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!row.bold} onChange={(e) => update({ bold: e.target.checked })} />
              Bold
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!row.multiline} onChange={(e) => update({ multiline: e.target.checked })} />
              Multi-line
            </label>
          </div>
        )}

        {/* Heading row */}
        {row.type === 'heading' && (
          <input
            placeholder="Heading text"
            value={row.label || ''}
            onChange={(e) => update({ label: e.target.value })}
            style={{ fontSize: '0.8rem', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 5, width: '100%' }}
          />
        )}

        {/* Spacer – no inputs */}
        {row.type === 'spacer' && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Empty spacing row</span>
        )}

        {/* Split row — two sub-fields */}
        {isSplit && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(row.fields || []).map((f, fi) => (
              <div key={fi} style={{ flex: 1, minWidth: 200, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>F{fi + 1}</span>
                <input
                  placeholder="Label"
                  value={f.label || ''}
                  onChange={(e) => {
                    const newF = [...row.fields];
                    newF[fi] = { ...newF[fi], label: e.target.value };
                    update({ fields: newF });
                  }}
                  style={{ flex: 1, fontSize: '0.78rem', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: 5 }}
                />
                <select
                  value={f.key || ''}
                  onChange={(e) => {
                    const newF = [...row.fields];
                    newF[fi] = { ...newF[fi], key: e.target.value };
                    update({ fields: newF });
                  }}
                  style={{ flex: 1, fontSize: '0.78rem', padding: '3px 6px', borderRadius: 5, border: '1px solid #cbd5e1' }}
                >
                  <option value="">— key —</option>
                  {ALL_FIELD_KEYS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <button onClick={() => onMoveUp(idx)} disabled={idx === 0} title="Move up"
          style={btnSm}>↑</button>
        <button onClick={() => onMoveDown(idx)} disabled={idx === total - 1} title="Move down"
          style={btnSm}>↓</button>
        <button onClick={() => onRemove(idx)} title="Remove row"
          style={{ ...btnSm, color: '#b91c1c', borderColor: '#fca5a5' }}>✕</button>
      </div>
    </div>
  );
}

const btnSm = {
  background: '#fff', border: '1px solid #cbd5e1', borderRadius: 5,
  width: 28, height: 28, cursor: 'pointer', fontSize: '0.8rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LAYOUT BUILDER
// ─────────────────────────────────────────────────────────────────────────────
export default function LayoutBuilder({ template, onSaved, saveLayout }) {
  const isMigration  = template?.type === 'MIGRATION';
  const existing     = Array.isArray(template?.layout) && template.layout.length > 0;

  const [rows, setRows]       = useState(() => {
    if (existing) return template.layout.map((r, i) => ({ id: uid(), ...r }));
    return (isMigration ? DEFAULT_MIGRATION : DEFAULT_TC).map((r) => ({ ...r, id: uid() }));
  });
  const [sections, setSections] = useState(template?.sections || {});
  const [preview, setPreview]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState('');

  // ── Row mutations ──────────────────────────────────────────────────────────
  const updateRow   = useCallback((idx, updated) => setRows((r) => r.map((x, i) => i === idx ? updated : x)), []);
  const removeRow   = useCallback((idx) => setRows((r) => r.filter((_, i) => i !== idx)), []);
  const moveUp      = useCallback((idx) => setRows((r) => { const a = [...r]; [a[idx-1],a[idx]] = [a[idx],a[idx-1]]; return a; }), []);
  const moveDown    = useCallback((idx) => setRows((r) => { const a = [...r]; [a[idx],a[idx+1]] = [a[idx+1],a[idx]]; return a; }), []);
  const addRow      = useCallback((type) => setRows((r) => [...r, {
    id: uid(), type,
    label:  '',
    key:    '',
    fields: type === 'row-split' ? [{ label: '', key: '' }, { label: '', key: '' }] : undefined,
  }]), []);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(''); setSuccess('');
    if (rows.length === 0) { setError('Add at least one row before saving.'); return; }
    setSaving(true);
    try {
      const cleanLayout = stripTempIds(rows);
      const result = await saveLayout({
        id: template._id,
        layout: cleanLayout,
        sections,
        name: template.name,
      }).unwrap();
      setSuccess(`Layout saved — ${result.message || 'Template updated'}`);
      if (onSaved) onSaved(result.data);
    } catch (e) {
      setError(e?.data?.message || 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  // ── Preview data ───────────────────────────────────────────────────────────
  const previewData = {
    ...DUMMY_DATA,
    ...(isMigration ? { nationality: 'Indian', religion: 'Hindu', conduct: 'Good', whetherPassed: 'Yes' } : {}),
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* ──── LEFT PANEL ──── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
            Layout Rows
            <span style={{ marginLeft: 8, fontSize: '0.72rem', background: '#e0f2fe', color: '#0891b2', padding: '1px 6px', borderRadius: 4 }}>
              {rows.length} rows
            </span>
          </h3>
          <button
            onClick={() => setPreview((p) => !p)}
            style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: 6, border: '1px solid #1a3c6e', background: preview ? '#1a3c6e' : '#fff', color: preview ? '#fff' : '#1a3c6e', cursor: 'pointer', fontWeight: 600 }}
          >
            {preview ? '← Build' : '👁 Preview'}
          </button>
        </div>

        {/* Section config (school header) */}
        <details style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
            ⚙️ Header / Footer Settings
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { field: 'mottoLeft',  placeholder: 'Left motto (e.g. বাংলার শিক্ষা)' },
              { field: 'mottoRight', placeholder: 'Right motto (e.g. EDUCATION FIRST)' },
              { field: 'tagline',    placeholder: 'Tagline under logo' },
            ].map(({ field, placeholder }) => (
              <label key={field} style={{ fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: 2, textTransform: 'capitalize' }}>{field.replace(/([A-Z])/g, ' $1')}</span>
                <input
                  value={sections[field] || ''}
                  onChange={(e) => setSections((s) => ({ ...s, [field]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 5, fontSize: '0.8rem' }}
                />
              </label>
            ))}
          </div>
        </details>

        {/* Row list */}
        {!preview && (
          <>
            {rows.map((row, idx) => (
              <RowEditor
                key={row.id}
                row={row}
                idx={idx}
                total={rows.length}
                onChange={updateRow}
                onRemove={removeRow}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
              />
            ))}

            {/* Add row buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, marginBottom: 16 }}>
              {ROW_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => addRow(t.value)}
                  style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 5, border: '1px solid #1a3c6e', background: '#f0f7ff', color: '#1a3c6e', cursor: 'pointer', fontWeight: 600 }}
                >
                  + {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Status messages */}
        {error   && <div style={{ color: '#b91c1c', fontSize: '0.82rem', marginBottom: 8, padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6 }}>{error}</div>}
        {success && <div style={{ color: '#166534', fontSize: '0.82rem', marginBottom: 8, padding: '6px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6 }}>{success}</div>}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 20px', background: '#1a3c6e', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '…Saving' : '💾 Save Structured Layout'}
          </button>
          <button
            onClick={() => setRows(isMigration ? DEFAULT_MIGRATION.map((r) => ({ ...r, id: uid() })) : DEFAULT_TC.map((r) => ({ ...r, id: uid() })))}
            style={{ padding: '8px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 7, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* ──── RIGHT PANEL: Reference image + live preview ──── */}
      <div>
        {preview ? (
          <div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Live preview with dummy data. Actual student data will appear when you generate from TC/Migration page.
            </p>
            <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%' }}>
              <StructuredCertificateView
                layout={stripTempIds(rows)}
                sections={sections}
                data={previewData}
                schoolSnapshot={{ schoolName: 'DEMO PUBLIC SCHOOL', udiseCode: '23456789001', schoolLocationLine: 'Block A, Bhopal' }}
                certNumber="TC-2024-001"
                type={isMigration ? 'MIGRATION' : 'TC'}
                locked={true}
                onChange={() => {}}
              />
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
              📄 Reference Template
            </p>
            {template?.imageUrl ? (
              <img
                src={template.imageUrl}
                alt="Template reference"
                style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              />
            ) : (
              <div style={{ width: '100%', minHeight: 200, border: '2px dashed #cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No reference image uploaded
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
