/**
 * StructuredCertificateView.jsx
 * ─────────────────────────────────────────────────────
 * Renders a certificate from a structured layout definition.
 * No image overlay. No absolute positioning.
 *
 * Props:
 *   layout       — Array of row definitions from DocumentTemplate.layout
 *   sections     — Header/footer config from DocumentTemplate.sections
 *   data         — Student data map { key: value }
 *   schoolSnapshot — { schoolName, udiseCode, logoUrl, ... }
 *   certNumber   — string
 *   type         — 'TC' | 'MIGRATION'
 *   locked       — bool; true disables all inputs
 *   onChange     — (key, value) => void  (called on blur)
 */
import React, { useCallback } from 'react';
import { resolvePhotoSrc, StudentPhoto } from './certificateShared';
import './documents.css';

// ─────────────────────────────────────────────────────────────────────────────
// Field Input — editable when unlocked, plain text when locked
// ─────────────────────────────────────────────────────────────────────────────
function FieldValue({ fieldKey, value, locked, onChange, multiline }) {
  const handleBlur = useCallback(
    (e) => onChange && onChange(fieldKey, e.target.value),
    [fieldKey, onChange],
  );

  if (locked) {
    return (
      <div className="doc-line-cell">
        <span className="doc-line-readonly doc-upper">{value || '\u00a0'}</span>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className="doc-line-cell">
        <textarea
          className="doc-line-input doc-upper"
          defaultValue={value || ''}
          onBlur={handleBlur}
          rows={2}
          style={{ resize: 'none', overflow: 'hidden' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
        />
      </div>
    );
  }

  return (
    <div className="doc-line-cell">
      <input
        className="doc-line-input doc-upper"
        defaultValue={value || ''}
        onBlur={handleBlur}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row renderers
// ─────────────────────────────────────────────────────────────────────────────
function SimpleRow({ row, data, locked, onChange }) {
  const val    = data[row.key] !== undefined ? data[row.key] : '';
  const bold   = row.bold ? { fontWeight: '800' } : {};
  return (
    <tr>
      <td className="doc-td-label" style={bold}>{row.label} :</td>
      <td className="doc-td-value">
        <FieldValue
          fieldKey={row.key}
          value={val}
          locked={locked}
          onChange={onChange}
          multiline={row.multiline}
        />
      </td>
    </tr>
  );
}

function SplitRow({ row, data, locked, onChange }) {
  const fields = Array.isArray(row.fields) ? row.fields : [];
  const cols   = fields.length;
  const pct    = cols > 0 ? Math.floor(100 / cols) : 50;

  return (
    <tr>
      <td colSpan={2} style={{ padding: '3px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }} role="presentation">
          <colgroup>
            {fields.map((_, i) => (
              <React.Fragment key={i}>
                <col style={{ width: `${Math.round(pct * 0.42)}%` }} />
                <col style={{ width: `${Math.round(pct * 0.58)}%` }} />
              </React.Fragment>
            ))}
          </colgroup>
          <tbody>
            <tr>
              {fields.map((f) => {
                const v = data[f.key] !== undefined ? data[f.key] : '';
                return (
                  <React.Fragment key={f.key}>
                    <td className="doc-td-label" style={{ paddingTop: 5 }}>{f.label} :</td>
                    <td className="doc-td-value">
                      <FieldValue fieldKey={f.key} value={v} locked={locked} onChange={onChange} />
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function CertifyRow({ row, data, locked, onChange }) {
  const val = data[row.key] !== undefined ? data[row.key] : '';
  return (
    <tr>
      <td colSpan={2} style={{ paddingTop: 10, paddingBottom: 4, fontSize: '9.5pt', fontWeight: 600 }}>
        {row.label}{' '}
        {locked
          ? <span style={{ display: 'inline-block', minWidth: 110, borderBottom: '1px solid #000', verticalAlign: 'baseline', padding: '0 4px', fontWeight: 700, textTransform: 'uppercase' }}>{val || '\u00a0'}</span>
          : <input
              defaultValue={val}
              onBlur={(e) => onChange && onChange(row.key, e.target.value)}
              style={{ display: 'inline-block', width: 130, border: 'none', borderBottom: '1px solid #000', background: 'transparent', font: 'inherit', fontWeight: 700, textTransform: 'uppercase', padding: '0 4px', outline: 'none', verticalAlign: 'baseline' }}
            />
        }
        {'.'}
      </td>
    </tr>
  );
}

function HeadingRow({ row }) {
  return (
    <tr>
      <td colSpan={2} style={{ paddingTop: 8, paddingBottom: 4, fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.04em' }}>
        {row.label || ''}
      </td>
    </tr>
  );
}

function SpacerRow() {
  return <tr><td colSpan={2} style={{ height: 8 }} /></tr>;
}

function renderRow(row, data, locked, onChange, idx) {
  switch (row.type) {
    case 'row':       return <SimpleRow  key={idx} row={row} data={data} locked={locked} onChange={onChange} />;
    case 'row-split': return <SplitRow   key={idx} row={row} data={data} locked={locked} onChange={onChange} />;
    case 'certify':   return <CertifyRow key={idx} row={row} data={data} locked={locked} onChange={onChange} />;
    case 'heading':   return <HeadingRow key={idx} row={row} />;
    case 'spacer':    return <SpacerRow  key={idx} />;
    default:          return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Acknowledgement Section (TC only)
// ─────────────────────────────────────────────────────────────────────────────
function AcknowledgementSection({ data, locked, onChange }) {
  return (
    <div className="doc-ack">
      <div className="doc-ack-title">Acknowledgement on Receipt of Transfer Certificate</div>
      <table className="doc-fields-table" role="presentation">
        <colgroup><col style={{ width: '36%' }} /><col style={{ width: '64%' }} /></colgroup>
        <tbody>
          <SimpleRow row={{ label: 'Student Name',   key: 'studentName' }} data={data} locked={locked} onChange={onChange} />
          <SimpleRow row={{ label: "Father's Name",  key: 'fatherName'  }} data={data} locked={locked} onChange={onChange} />
          <SplitRow  row={{ type: 'row-split', fields: [
            { label: 'Student Code', key: 'studentCode'       },
            { label: 'Last Class',   key: 'lastClassAttended' },
          ]}} data={data} locked={locked} onChange={onChange} />
        </tbody>
      </table>
      <table className="doc-footer-table" role="presentation" style={{ marginTop: 12 }}>
        <tbody>
          <tr>
            <td style={{ width: '28%' }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2 }}>Date</div>
              <FieldValue fieldKey="acknowledgementDate" value={data.acknowledgementDate || ''} locked={locked} onChange={onChange} />
            </td>
            <td style={{ width: '38%' }} />
            <td style={{ width: '34%', textAlign: 'right' }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2, textAlign: 'center' }}>Signature of Guardian</div>
              <div className="doc-line-cell" style={{ minHeight: '2rem', borderBottom: '1px solid #000' }}>&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function StructuredCertificateView({
  layout = [],
  sections = {},
  data = {},
  schoolSnapshot = {},
  certNumber = '',
  type = 'TC',
  locked = false,
  onChange,
  id = 'structured-print-area',
}) {
  const isMigration = type === 'MIGRATION';
  const {
    schoolName = '', udiseCode = '', logoUrl = '', schoolLocationLine = '',
  } = schoolSnapshot;

  // Use provided layout or built-in default rows for display
  const rows = layout;

  const photoSrc = resolvePhotoSrc(data.photoUrl || data.photo);
  const dateVal  = data.issueDate || data.issueFooterDate || '';

  return (
    <div
      id={id}
      className={`doc-print-area doc-sheet${isMigration ? ' doc-migration-sheet' : ''}`}
    >
      {/* ── Cert number ── */}
      {certNumber && (
        <div className="doc-cert-no doc-no-upper">Cert. No.: {certNumber}</div>
      )}

      {/* ── Header ── */}
      {!isMigration && (
        <table className="doc-header-table" role="presentation">
          <tbody>
            <tr>
              <td className="doc-h-left doc-no-upper">{sections.mottoLeft || 'বাংলার শিক্ষা'}</td>
              <td className="doc-h-center doc-no-upper">
                {logoUrl
                  ? <img src={resolvePhotoSrc(logoUrl)} alt="School logo" style={{ maxHeight: 52, maxWidth: 90, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                  : <div className="doc-header-logo-placeholder">Logo</div>
                }
                <div style={{ fontSize: '8.5pt', fontWeight: 600, marginTop: 2 }}>
                  {sections.tagline || 'শিক্ষা আনে সভ্যতা, সভ্যতা আনে মানবিকতা'}
                </div>
              </td>
              <td className="doc-h-right">{sections.mottoRight || 'EDUCATION FIRST'}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* ── School name ── */}
      <div className="doc-school-block doc-no-upper">
        <div className="doc-school-name-text">{schoolName}</div>
      </div>

      {/* ── UDISE + Location ── */}
      {isMigration ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: 4 }} role="presentation">
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', fontSize: '8.5pt', fontWeight: 700 }} className="doc-no-upper">
                {[schoolName, udiseCode && `UDISE: ${udiseCode}`].filter(Boolean).join('    ·    ')}
              </td>
              {certNumber && (
                <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
                  <span style={{ fontSize: '8.5pt', fontWeight: 700 }} className="doc-no-upper">Cert. No.: {certNumber}</span>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="doc-school-meta-row" style={{ fontSize: '8.5pt', fontWeight: 700, marginBottom: 2 }}>
          <span className="doc-upper">UDISE Code: {udiseCode}</span>
          {schoolLocationLine && <span className="doc-no-upper">&nbsp;|&nbsp;{schoolLocationLine}</span>}
        </div>
      )}

      {!isMigration && <hr className="doc-hr" />}

      {/* ── Title ── */}
      <div className={isMigration ? 'doc-migration-title' : 'doc-title'}>
        {isMigration ? 'Migration Certificate' : 'Transfer Certificate'}
      </div>

      {/* ── Migration intro ── */}
      {isMigration && (
        <p className="doc-migration-intro">
          This is to certify that the following pupil has been a bona fide student of this
          institution. Particulars are taken from the Admission Register.
        </p>
      )}

      {/* ── Body: fields + photo ── */}
      <table className="doc-main-outer" role="presentation">
        <tbody>
          <tr>
            <td className="doc-main-fields">
              <table className="doc-fields-table" role="presentation">
                <colgroup>
                  <col style={{ width: isMigration ? '46%' : '42%' }} />
                  <col style={{ width: isMigration ? '54%' : '58%' }} />
                </colgroup>
                <tbody>
                  {rows.map((row, i) => renderRow(row, data, locked, onChange, i))}
                </tbody>
              </table>
            </td>
            <td className="doc-main-photo">
              <StudentPhoto url={photoSrc} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Footer ── */}
      <table className="doc-footer-table" role="presentation">
        <tbody>
          <tr>
            <td style={{ width: '28%' }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2 }}>
                {isMigration ? 'Date of Issue' : 'Date'}
              </div>
              <FieldValue
                fieldKey={isMigration ? 'issueDate' : 'issueFooterDate'}
                value={dateVal}
                locked={locked}
                onChange={onChange}
              />
            </td>
            <td style={{ width: '38%', textAlign: 'center' }}>
              <div className="doc-footer-stamp doc-no-upper">Principal's stamp / seal</div>
            </td>
            <td style={{ width: '34%', textAlign: 'right' }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2, textAlign: 'center' }}>
                {isMigration ? 'Principal / Head of Institution' : 'Head of Institution'}
              </div>
              <div className="doc-line-cell" style={{ minHeight: '2rem', borderBottom: '1px solid #000' }}>&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── TC Acknowledgement ── */}
      {!isMigration && (
        <AcknowledgementSection data={data} locked={locked} onChange={onChange} />
      )}
    </div>
  );
}
