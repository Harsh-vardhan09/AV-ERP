/**
 * Self-check for the certificate branding render path.
 * Run: node src/modules/documents/__tests__/certificateBranding.check.js
 *
 * Mirrors reportcards/__tests__/reportCardBranding.check.js — same shape, same
 * concern, for the other renderer that puts a school's crest on a document.
 *
 * Covers the logic that isn't obvious by reading:
 *   - the uploaded logo reaching the <img> instead of the dashed placeholder
 *   - an inlined data: URI surviving into the header untouched
 *   - a school with nothing uploaded still rendering a complete letterhead
 */
const assert = require('assert');
const { toSchoolSnapshot } = require('../services/schoolBrandingService');
const { renderCertificateHtml } = require('../lib/htmlCertificateRenderer');

const CLOUD_LOGO = 'https://res.cloudinary.com/demo/image/upload/crest.png';
const DATA_LOGO = 'data:image/png;base64,iVBORw0KGgo=';

const branding = (over = {}) => ({
  schoolName: 'Demo Public School',
  shortName: '',
  address: '27 Nehru Marg',
  cityLine: 'Barasat, West Bengal, 700124',
  phone: '+91 33 2542 1188',
  email: 'office@demo.edu.in',
  website: '',
  affiliatedTo: 'CBSE',
  affiliationNo: '2430091',
  udiseCode: '19010200104',
  logoUrl: '',
  logoDataUri: '',
  signatureUrl: '',
  signatureDataUri: '',
  ...over,
});

const html = (snap) =>
  renderCertificateHtml({ data: { studentName: 'ASHA' }, schoolSnapshot: snap, type: 'TC' });

// 1. The uploaded logo reaches the header as an <img>
{
  const snap = toSchoolSnapshot(branding({ logoUrl: CLOUD_LOGO }));
  const out = html(snap);
  assert(out.includes(`src="${CLOUD_LOGO}"`), 'logo URL should be in the img src');
  // class="..." and not a bare substring: the class names also appear in BASE_CSS
  assert(out.includes('class="hdr-logo"'), 'logo img should carry its class');
}

// 2. An inlined data: URI is preferred over the remote URL, so the PDF never
//    depends on network timing
{
  const snap = toSchoolSnapshot(branding({ logoUrl: CLOUD_LOGO, logoDataUri: DATA_LOGO }));
  assert.strictEqual(snap.logoUrl, DATA_LOGO, 'data URI should win over the remote URL');
  assert(html(snap).includes(DATA_LOGO), 'data URI should reach the img src');
}

// 3. No logo uploaded → no <img>, and no dashed placeholder box either
{
  const out = html(toSchoolSnapshot(branding()));
  assert(!out.includes('class="hdr-logo"'), 'must not emit a logo img without a logo');
  assert(!out.includes('src=""'), 'must not emit an empty src');
  assert(!out.includes('hdr-logo-placeholder'), 'placeholder box must not come back');
  assert(out.includes('is-empty'), 'the logo cell should collapse');
}

// 4. The letterhead still carries the school identity with no logo
{
  const out = html(toSchoolSnapshot(branding()));
  assert(out.includes('Demo Public School'), 'school name must render');
  assert(out.includes('27 Nehru Marg'), 'address must render');
  assert(out.includes('Affiliated to CBSE'), 'board must render');
  assert(out.includes('2430091'), 'affiliation number must render');
  assert(out.includes('19010200104'), 'UDISE code must render');
}

// 5. A school with nothing but a name renders no empty label fragments
{
  const bare = toSchoolSnapshot(
    branding({
      address: '',
      cityLine: '',
      phone: '',
      email: '',
      affiliatedTo: '',
      affiliationNo: '',
      udiseCode: '',
    })
  );
  const out = html(bare);
  assert(out.includes('Demo Public School'), 'school name must still render');
  assert(!out.includes('Affiliated to'), 'no dangling board label');
  assert(!out.includes('Affiliation No.'), 'no dangling affiliation label');
  assert(!out.includes('UDISE Code'), 'no dangling UDISE label');
  assert(!out.includes('Ph:'), 'no dangling phone label');
}

// 6. The West Bengal board mottos are no longer baked in as defaults — that is
//    what made every school's certificate look like the same document
{
  const out = html(toSchoolSnapshot(branding()));
  assert(!out.includes('বাংলার শিক্ষা'), 'no hardcoded motto');
  assert(!out.includes('EDUCATION<br>FIRST'), 'no hardcoded motto');
}

// 7. A stored authority signature is drawn into the footer; absence keeps the line
{
  const withSig = toSchoolSnapshot(branding({ signatureDataUri: DATA_LOGO }));
  assert(html(withSig).includes('class="sig-img"'), 'signature image should render');

  const noSig = toSchoolSnapshot(branding());
  const out = html(noSig);
  assert(out.includes('class="sig-slot"'), 'signing slot must remain');
  assert(!out.includes('class="sig-img"'), 'no img without a stored signature');
}

console.log('certificateBranding.check.js — all assertions passed');
