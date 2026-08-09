/**
 * htmlCertificateRenderer.js
 * Converts a structured layout definition + student data
 * into a complete, self-contained A4 HTML string.
 *
 * No image overlay. No absolute positioning.
 * Output is clean, aligned, professional.
 */

'use strict';

// DEFAULT LAYOUTS  (fallback when admin has not defined a custom layout)

const DEFAULT_TC_LAYOUT = [
  { type: 'row', label: "Student's Name",                  key: 'studentName',       bold: true },
  { type: 'row-split', fields: [
    { label: 'Student Code', key: 'studentCode' },
    { label: 'PEN No.',      key: 'pen'         },
  ]},
  { type: 'row', label: "Father's Name",                    key: 'fatherName'        },
  { type: 'row', label: "Mother's Name",                    key: 'motherName'        },
  { type: 'row', label: 'Address',                          key: 'address', multiline: true },
  { type: 'row', label: 'District',                         key: 'district'          },
  { type: 'row', label: 'Date of Birth (Admission Reg.)',   key: 'dob'               },
  { type: 'row', label: 'Last Class Passed',                key: 'lastClassPassed'   },
  { type: 'row', label: 'Last Class Attended',              key: 'lastClassAttended' },
  { type: 'row', label: 'Reason for Transfer',              key: 'reasonForTransfer', multiline: true },
  { type: 'certify', label: 'Certified that the student has been transferred on', key: 'certificationStatementDate' },
];

const DEFAULT_MIGRATION_LAYOUT = [
  { type: 'row', label: 'Name of Pupil',                   key: 'studentName',       bold: true },
  { type: 'row', label: "Father's Name",                    key: 'fatherName'        },
  { type: 'row', label: "Mother's Name",                    key: 'motherName'        },
  { type: 'row', label: 'Date of Birth (Admission Reg.)',   key: 'dob'               },
  { type: 'row', label: 'Nationality',                      key: 'nationality'       },
  { type: 'row', label: 'Religion',                         key: 'religion'          },
  { type: 'row', label: 'Class Last Attended',              key: 'lastClassAttended' },
  { type: 'row', label: 'Passed Promotion Exam',            key: 'whetherPassed'     },
  { type: 'row', label: 'Conduct',                          key: 'conduct'           },
  { type: 'row', label: 'Date of Leaving / Migration',      key: 'dateOfLeaving'     },
  { type: 'row', label: 'Student Code',                     key: 'studentCode'       },
  { type: 'row', label: 'Remarks',                          key: 'remarks', multiline: true },
];

// INLINE CSS  (fully self-contained for Puppeteer)
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; min-height: 297mm; background: #fff; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #000;
    padding: 10mm 14mm 14mm;
  }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { padding: 0; }

  /* ── Cert number ── */
  .cert-no { text-align: right; font-size: 8.5pt; font-weight: 700; margin-bottom: 6px; }

  /* ── Header ── */
  .hdr-table td { vertical-align: middle; padding: 2px 4px; }
  .hdr-left  { width: 20%; font-size: 8.5pt; font-weight: 700; vertical-align: top; }
  .hdr-center { width: 60%; text-align: center; }
  .hdr-right { width: 20%; text-align: right; font-size: 8pt; font-weight: 800; vertical-align: top; }
  .hdr-logo  { max-height: 52px; max-width: 90px; object-fit: contain; display: block; margin: 0 auto; }
  .hdr-logo-placeholder {
    width: 52px; height: 52px; margin: 0 auto 2px;
    border: 1px dashed #999; display: flex;
    align-items: center; justify-content: center;
    font-size: 7pt; color: #aaa;
  }
  .school-name {
    font-size: 16pt; font-weight: 800; text-align: center;
    margin: 4px 0; text-transform: uppercase;
  }
  .school-meta { text-align: center; font-size: 9pt; font-weight: 600; margin-bottom: 2px; }
  hr.divider { border: none; border-top: 2px solid #000; margin: 6px 0 10px; }
  .cert-title {
    text-align: center; font-size: 14pt; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.03em; margin: 0 0 10px;
  }
  .migration-intro {
    font-size: 9.5pt; font-weight: 600; margin-bottom: 8px; line-height: 1.5;
  }
  .migration-double-border { border: 3px double #000; padding: 6mm; }

  /* ── Main layout: fields + photo ── */
  .main-outer > tbody > tr > td.fields-col {
    width: 76%; vertical-align: top; padding-right: 10px;
  }
  .main-outer > tbody > tr > td.photo-col {
    width: 24%; vertical-align: top; text-align: center;
  }

  /* ── Field rows ── */
  .fields-table > tbody > tr > td { vertical-align: top; padding: 3px 4px; }
  .td-label {
    width: 44%; font-weight: 700; font-size: 9pt;
    text-transform: uppercase; padding-right: 8px;
    white-space: normal; word-break: break-word; line-height: 1.3;
  }
  .td-value { width: 56%; vertical-align: bottom; }
  .value-line {
    display: block; width: 100%;
    border-bottom: 1px solid #000;
    min-height: 1.4em; font-weight: 700;
    font-size: 9.5pt; padding: 1px 2px 2px;
    word-break: break-word; text-transform: uppercase;
    line-height: 1.35;
  }
  .value-line.multiline { min-height: 2.6em; }
  .colon { font-weight: 700; }

  /* ── row-split ── */
  .split-table > tbody > tr > td { vertical-align: bottom; padding: 3px 4px; }
  .split-label { font-weight: 700; font-size: 9pt; text-transform: uppercase; white-space: nowrap; }

  /* ── certify row ── */
  .certify-row {
    font-size: 9.5pt; font-weight: 600;
    padding: 10px 4px 4px !important;
  }
  .certify-inline {
    display: inline-block; min-width: 110px;
    border-bottom: 1px solid #000;
    vertical-align: baseline; padding: 0 4px;
    font-weight: 700; text-transform: uppercase;
  }

  /* ── heading row ── */
  .heading-row {
    font-size: 10pt; font-weight: 800;
    text-transform: uppercase; text-align: center;
    padding: 8px 4px 4px !important;
    letter-spacing: 0.04em;
  }
  /* ── spacer row ── */
  .spacer-row { height: 8px !important; }

  /* ── Photo box ── */
  .photo-frame {
    width: 28mm; height: 35mm; margin: 0 auto;
    border: 1.5px solid #000; overflow: hidden;
    background: #f8f8f8; position: relative; display: block;
  }
  .photo-frame img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .photo-placeholder {
    width: 28mm; height: 35mm; margin: 0 auto;
    border: 1.5px solid #000; display: flex;
    align-items: center; justify-content: center;
    font-size: 7pt; color: #aaa; text-align: center;
    line-height: 1.3; padding: 4px;
  }

  /* ── Footer ── */
  .footer-table { margin-top: 18px; }
  .footer-table > tbody > tr > td {
    vertical-align: bottom; padding: 6px 4px;
    font-size: 8.5pt; font-weight: 700; text-transform: uppercase;
  }
  .stamp-box {
    text-align: center; font-size: 8pt; font-weight: 600; color: #555;
    border: 1px dashed #999; padding: 14px 6px; min-height: 58px;
    text-transform: none;
  }
  .sig-line { border-bottom: 1px solid #000; min-height: 2rem; }

  /* ── Acknowledgement ── */
  .ack { margin-top: 12px; padding-top: 8px; border-top: 2px dotted #000; }
  .ack-title {
    text-align: center; font-size: 10.5pt; font-weight: 800;
    margin-bottom: 10px; text-transform: uppercase;
  }

  @page { size: A4 portrait; margin: 8mm; }
  @media print {
    html, body { width: 210mm; }
    body { padding: 10mm 14mm; }
  }
`;

// ROW RENDERERS

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function valueCell(val, multiline) {
  const cls = multiline ? 'value-line multiline' : 'value-line';
  return `<span class="${cls}">${esc(val)}&nbsp;</span>`;
}

function renderRow(row, data) {
  const val  = data[row.key] !== undefined ? data[row.key] : '';
  const bold = row.bold ? 'font-weight:800;' : '';
  return `
    <tr>
      <td class="td-label" style="${bold}">${esc(row.label)} <span class="colon">:</span></td>
      <td class="td-value">${valueCell(val, row.multiline)}</td>
    </tr>`;
}

function renderRowSplit(row, data) {
  const fields = Array.isArray(row.fields) ? row.fields : [];
  const cols   = fields.map((f) => {
    const v = data[f.key] !== undefined ? data[f.key] : '';
    return `
      <td class="split-label" style="width:${f.labelWidth || '22%'}">${esc(f.label)} :</td>
      <td style="width:${f.valueWidth || '28%'}">${valueCell(v)}</td>`;
  });
  return `
    <tr>
      <td colspan="2" style="padding:3px 0">
        <table class="split-table"><tbody><tr>${cols.join('')}</tr></tbody></table>
      </td>
    </tr>`;
}

function renderCertifyRow(row, data) {
  const val = data[row.key] !== undefined ? data[row.key] : '';
  return `
    <tr>
      <td colspan="2" class="certify-row">
        ${esc(row.label)} <span class="certify-inline">${esc(val)}&nbsp;</span>.
      </td>
    </tr>`;
}

function renderHeading(row) {
  return `
    <tr>
      <td colspan="2" class="heading-row">${esc(row.label || '')}</td>
    </tr>`;
}

function renderSpacer() {
  return `<tr><td colspan="2" class="spacer-row"></td></tr>`;
}

function renderLayoutRows(layout, data) {
  return layout.map((row) => {
    switch (row.type) {
      case 'row':       return renderRow(row, data);
      case 'row-split': return renderRowSplit(row, data);
      case 'certify':   return renderCertifyRow(row, data);
      case 'heading':   return renderHeading(row);
      case 'spacer':    return renderSpacer();
      default:          return '';
    }
  }).join('');
}

// HEADER BLOCK
function renderHeader(sections = {}, schoolSnapshot = {}) {
  const { schoolName = '', udiseCode = '', logoUrl = '', schoolLocationLine = '' } = schoolSnapshot;
  const logoHtml = logoUrl
    ? `<img class="hdr-logo" src="${esc(logoUrl)}" alt="School logo">`
    : `<div class="hdr-logo-placeholder">Logo</div>`;

  const mottoLeft  = sections.mottoLeft  || 'बांग्लार शिक्षा';
  const mottoRight = sections.mottoRight || 'EDUCATION<br>FIRST';
  const tagline    = sections.tagline    || 'শিক্ষা আনে সভ্যতা, সভ্যতা আনে মানবিকতা';

  const metaParts = [`UDISE Code: ${esc(udiseCode)}`];
  if (schoolLocationLine) metaParts.push(schoolLocationLine);

  return `
    <table class="hdr-table"><tbody><tr>
      <td class="hdr-left">${mottoLeft}</td>
      <td class="hdr-center">
        ${logoHtml}
        <div style="font-size:8.5pt;font-weight:600;margin-top:2px">${tagline}</div>
      </td>
      <td class="hdr-right">${mottoRight}</td>
    </tr></tbody></table>
    <div class="school-name">${esc(schoolName)}</div>
    <div class="school-meta">${metaParts.join('&nbsp;|&nbsp;')}</div>
    <hr class="divider">`;
}

// FOOTER BLOCK
function renderFooter(sections = {}, data = {}, opts = {}) {
  const dateLabel = opts.type === 'TC' ? 'Date' : 'Date of Issue';
  const sigLabel  = opts.type === 'TC' ? 'Head of Institution' : 'Principal / Head of Institution';
  const dateVal   = data.issueDate || data.issueFooterDate || '';
  return `
    <table class="footer-table"><tbody><tr>
      <td style="width:28%">
        <div style="font-size:8pt;font-weight:700;margin-bottom:2px">${dateLabel}</div>
        <div class="value-line">${esc(dateVal)}&nbsp;</div>
      </td>
      <td style="width:38%;text-align:center">
        <div class="stamp-box">Principal's stamp / seal</div>
      </td>
      <td style="width:34%;text-align:center">
        <div style="font-size:8pt;font-weight:700;margin-bottom:2px">${sigLabel}</div>
        <div class="sig-line">&nbsp;</div>
      </td>
    </tr></tbody></table>`;
}

// ACKNOWLEDGEMENT BLOCK (TC only)
function renderAcknowledgement(data) {
  const ackRows = [
    { label: 'Student Name',   key: 'studentName' },
    { label: "Father's Name",  key: 'fatherName'  },
  ];
  const rowsHtml = ackRows.map((r) => renderRow(r, data)).join('');
  const splitHtml = renderRowSplit({
    type: 'row-split',
    fields: [
      { label: 'Student Code', key: 'studentCode' },
      { label: 'Last Class',   key: 'lastClassAttended' },
    ],
  }, data);

  const ackDate = data.acknowledgementDate || '';
  return `
    <div class="ack">
      <div class="ack-title">Acknowledgement on Receipt of Transfer Certificate</div>
      <table class="fields-table"><tbody>
        ${rowsHtml}
        ${splitHtml}
      </tbody></table>
      <table class="footer-table" style="margin-top:12px"><tbody><tr>
        <td style="width:28%">
          <div style="font-size:8pt;font-weight:700;margin-bottom:2px">Date</div>
          <div class="value-line">${esc(ackDate)}&nbsp;</div>
        </td>
        <td style="width:38%"></td>
        <td style="width:34%;text-align:center">
          <div style="font-size:8pt;font-weight:700;margin-bottom:2px">Signature of Guardian</div>
          <div class="sig-line">&nbsp;</div>
        </td>
      </tr></tbody></table>
    </div>`;
}

// PHOTO BLOCK
function renderPhoto(photoUrl) {
  if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim()) {
    return `
      <div class="photo-frame">
        <img src="${esc(photoUrl.trim())}" alt="Student photo">
      </div>`;
  }
  return `
    <div class="photo-placeholder">
      Affix<br>Passport<br>Size<br>Photo
    </div>`;
}

// MAIN RENDER FUNCTION

/**
 * Renders a complete, self-contained A4 HTML string for a certificate.
 *
 * @param {object} opts
 * @param {Array}  opts.layout         - Array of layout row definitions
 * @param {object} opts.sections       - Header/footer configuration object
 * @param {object} opts.data           - Student data map (key → value)
 * @param {object} opts.schoolSnapshot - School header fields
 * @param {string} opts.certNumber     - Certificate number string
 * @param {'TC'|'MIGRATION'} opts.type - Document type
 * @returns {string}  Full HTML document string
 */
function renderCertificateHtml({ layout, sections = {}, data = {}, schoolSnapshot = {}, certNumber = '', type = 'TC' }) {
  // Use provided layout or fall back to default
  const activeLayout = (Array.isArray(layout) && layout.length > 0)
    ? layout
    : (type === 'TC' ? DEFAULT_TC_LAYOUT : DEFAULT_MIGRATION_LAYOUT);

  const isMigration = type === 'MIGRATION';

  const certNoHtml = certNumber
    ? `<div class="cert-no">Cert. No.: ${esc(certNumber)}</div>`
    : '';

  const titleHtml = `<div class="cert-title">${isMigration ? 'Migration Certificate' : 'Transfer Certificate'}</div>`;

  const introHtml = isMigration
    ? `<p class="migration-intro">This is to certify that the following pupil has been a bona fide student of this institution. Particulars are taken from the Admission Register.</p>`
    : '';

  const bodyRowsHtml = renderLayoutRows(activeLayout, data);
  const photoHtml    = renderPhoto(data.photoUrl || data.photo || '');

  const headerHtml   = renderHeader(sections, schoolSnapshot);
  const footerHtml   = renderFooter(sections, data, { type });
  const ackHtml      = !isMigration ? renderAcknowledgement(data) : '';

  const sheetStyle = isMigration ? 'border:3px double #000;' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isMigration ? 'Migration' : 'Transfer'} Certificate — ${esc(certNumber)}</title>
  <style>${BASE_CSS}</style>
</head>
<body style="${sheetStyle}">
  ${certNoHtml}
  ${headerHtml}
  ${titleHtml}
  ${introHtml}

  <table class="main-outer"><tbody><tr>
    <td class="fields-col">
      <table class="fields-table"><tbody>
        ${bodyRowsHtml}
      </tbody></table>
    </td>
    <td class="photo-col">
      ${photoHtml}
    </td>
  </tr></tbody></table>

  ${footerHtml}
  ${ackHtml}
</body>
</html>`;
}

// EXPORTS
module.exports = {
  renderCertificateHtml,
  DEFAULT_TC_LAYOUT,
  DEFAULT_MIGRATION_LAYOUT,
};
