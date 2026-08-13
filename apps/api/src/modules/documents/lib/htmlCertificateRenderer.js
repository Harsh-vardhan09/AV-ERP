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
  /* @page owns the printable geometry (see bottom of this sheet). The body used
     to be pinned to width:210mm while @page also applied an 8mm margin, so the
     content box was 16mm wider than the area it printed into and the right edge
     clipped. Width is now auto: the body fills whatever @page leaves. */
  html, body { width: auto; background: #fff; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #000;
    padding: 0;
  }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { padding: 0; }

  /* ── Cert number ── */
  .cert-no { text-align: right; font-size: 8.5pt; font-weight: 700; margin-bottom: 6px; }

  /* ── Letterhead ──
     Three columns: logo | identity block | motto. The logo column collapses to
     zero width when no logo is uploaded, so the identity block re-centres on the
     page instead of sitting beside an empty gutter. */
  .hdr-table td { vertical-align: middle; padding: 2px 4px; }
  .hdr-logo-col { width: 26mm; text-align: center; vertical-align: middle; }
  .hdr-logo-col.is-empty { width: 0; padding: 0; }
  .hdr-center { text-align: center; vertical-align: middle; }
  .hdr-right { width: 26mm; text-align: right; font-size: 8pt; font-weight: 800; vertical-align: top; }
  .hdr-logo  { max-height: 22mm; max-width: 24mm; object-fit: contain; display: block; margin: 0 auto; }
  .school-name {
    font-size: 17pt; font-weight: 800; text-align: center;
    margin: 0 0 1px; text-transform: uppercase; letter-spacing: 0.01em;
    line-height: 1.15;
  }
  .school-tagline {
    text-align: center; font-size: 8.5pt; font-style: italic;
    color: #333; margin-bottom: 2px;
  }
  .school-addr {
    text-align: center; font-size: 8.5pt; font-weight: 600;
    line-height: 1.35; margin-bottom: 1px;
  }
  .school-meta { text-align: center; font-size: 8pt; font-weight: 700; margin-bottom: 1px; }
  .school-contact { text-align: center; font-size: 8pt; font-weight: 500; color: #222; }
  /* Double rule reads as a letterhead; the thin second line does the work */
  hr.divider { border: none; border-top: 2px solid #000; margin: 5px 0 0; }
  hr.divider-thin { border: none; border-top: 0.6px solid #000; margin: 1.2px 0 9px; }
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
  /* Signature image sits ON the rule, so the block keeps the same height
     whether or not a signature has been uploaded */
  .sig-slot { min-height: 2rem; border-bottom: 1px solid #000; text-align: center; }
  .sig-img  { max-height: 16mm; max-width: 44mm; object-fit: contain; display: block; margin: 0 auto; }

  /* ── Acknowledgement ── */
  .ack { margin-top: 12px; padding-top: 8px; border-top: 2px dotted #000; }
  .ack-title {
    text-align: center; font-size: 10.5pt; font-weight: 800;
    margin-bottom: 10px; text-transform: uppercase;
  }

  /* Single source of truth for page margins. puppeteerPdf passes
     preferCSSPageSize:true, so this wins over its own margin option — do not
     also pad the body or the two stack up. 12mm top/bottom, 14mm sides keeps
     the letterhead clear of the printable edge on a standard office printer. */
  @page { size: A4 portrait; margin: 12mm 14mm; }
  @media print {
    html, body { width: auto; }
    body { padding: 0; }
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
  const {
    schoolName = '',
    udiseCode = '',
    logoUrl = '',
    schoolLocationLine = '',
    addressLine = '',
    cityLine = '',
    affiliatedTo = '',
    affiliationNo = '',
    phone = '',
    email = '',
    website = '',
  } = schoolSnapshot;

  // No logo → the cell collapses instead of showing a dashed placeholder box.
  // A placeholder is a design smell on an official document that gets handed to
  // a parent; absence should read as "this school has no crest", not "broken".
  const logoCell = logoUrl
    ? `<td class="hdr-logo-col"><img class="hdr-logo" src="${esc(logoUrl)}" alt=""></td>`
    : `<td class="hdr-logo-col is-empty"></td>`;

  // Mottos are opt-in. They used to default to West Bengal board strings, which
  // is why every school's certificate looked like the same generic document.
  const mottoRight = sections.mottoRight || '';
  const mottoCell = mottoRight ? `<td class="hdr-right">${mottoRight}</td>` : '';

  const tagline = sections.tagline || '';

  const addrParts = [addressLine, cityLine].map((v) => (v || '').trim()).filter(Boolean);

  const metaParts = [];
  if (affiliatedTo) metaParts.push(`Affiliated to ${esc(affiliatedTo)}`);
  if (affiliationNo) metaParts.push(`Affiliation No.: ${esc(affiliationNo)}`);
  if (udiseCode) metaParts.push(`UDISE Code: ${esc(udiseCode)}`);
  if (schoolLocationLine) metaParts.push(schoolLocationLine);

  const contactParts = [];
  if (phone) contactParts.push(`Ph: ${esc(phone)}`);
  if (email) contactParts.push(esc(email));
  if (website) contactParts.push(esc(website));

  return `
    <table class="hdr-table"><tbody><tr>
      ${logoCell}
      <td class="hdr-center">
        <div class="school-name">${esc(schoolName)}</div>
        ${tagline ? `<div class="school-tagline">${tagline}</div>` : ''}
        ${addrParts.length ? `<div class="school-addr">${esc(addrParts.join(', '))}</div>` : ''}
        ${metaParts.length ? `<div class="school-meta">${metaParts.join('&nbsp;|&nbsp;')}</div>` : ''}
        ${contactParts.length ? `<div class="school-contact">${contactParts.join('&nbsp;&middot;&nbsp;')}</div>` : ''}
      </td>
      ${mottoCell}
    </tr></tbody></table>
    <hr class="divider">
    <hr class="divider-thin">`;
}

// FOOTER BLOCK
function renderFooter(sections = {}, data = {}, opts = {}, schoolSnapshot = {}) {
  const dateLabel = opts.type === 'TC' ? 'Date' : 'Date of Issue';
  const sigLabel  = opts.type === 'TC' ? 'Head of Institution' : 'Principal / Head of Institution';
  const dateVal   = data.issueDate || data.issueFooterDate || '';

  // A stored authority signature is drawn onto the rule. Without one the slot
  // keeps its height and stays a plain signing line — same layout either way.
  const sigUrl = schoolSnapshot.signatureUrl || '';
  const sigSlot = sigUrl
    ? `<div class="sig-slot"><img class="sig-img" src="${esc(sigUrl)}" alt=""></div>`
    : `<div class="sig-slot">&nbsp;</div>`;

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
        ${sigSlot}
        <div style="font-size:8pt;font-weight:700;margin-top:2px">${sigLabel}</div>
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
  const footerHtml   = renderFooter(sections, data, { type }, schoolSnapshot);
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
