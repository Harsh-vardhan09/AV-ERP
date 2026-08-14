const fs = require('fs');
const path = require('path');

const Parser = require('../src/modules/reportcards/services/templateParserService');

/**
 * The Super Admin "Create Global Template" editor loads a worked example so the
 * placeholder names do not have to be guessed. If that example ever stops
 * resolving, every template authored from it inherits the breakage — and the
 * author sees a "Missing Fields" banner on the very first preview.
 *
 * Reads the web lib as text rather than importing it: the file is ESM and lives
 * in the other workspace, but the template itself is a plain string literal.
 */
const STARTER_LIB = path.join(
  __dirname,
  '..',
  '..',
  'web',
  'src',
  'modules',
  'tenancy',
  'lib',
  'starterReportTemplate.js'
);

test('every placeholder in the starter template resolves', () => {
  const src = fs.readFileSync(STARTER_LIB, 'utf8');
  const match = src.match(/STARTER_TEMPLATE_HTML = `([\s\S]*?)`;/);
  expect(match).not.toBeNull();
  const html = match[1];

  const data = {
    schoolLogoUrl: 'https://example.com/logo.png',
    schoolName: 'Demo Public School',
    session: '2025-2026',
    class: 'V',
    className: 'V',
    studentName: 'Aarav Sharma',
    rollNo: '01',
    admissionNumber: 'RCD-ADM-01',
    dob: '12th March 2014',
    fatherName: 'Ramesh Sharma',
    motherName: 'Sunita Sharma',
    address: '14 Nehru Marg',
    studentPhotoUrl: '',
    subjects: [
      {
        name: 'English',
        t1_pertest: 9,
        t1_nb: 5,
        t1_se: 4,
        t1_halfyearly: 71,
        t1_total: 89,
        t2_pertest: 8,
        t2_nb: 5,
        t2_se: 4,
        t2_yearly: 66,
        t2_total: 83,
        grandtotal: 172,
        grade: 'A',
        term1: { total: 89 },
        term2: { total: 83 },
      },
    ],
    attendance: { str: '180/200 (90%)' },
    'total-marks': 172,
    percentage: 86,
    'overall-grade': 'A',
    result: 'PASS',
  };

  const r = Parser.render(html, data);
  console.log('\n  missingFields:', r.missingFields.length, r.missingFields.join(', ') || '(none)');
  console.log('  logo rendered as <img>? ->', /<img[^>]+example\.com\/logo\.png/.test(r.html));
  console.log(
    '  subject row values      ->',
    (r.html.match(/<td>\d+<\/td>/g) || []).slice(0, 5).join(' ')
  );
  console.log('  school name in output   ->', r.html.includes('Demo Public School'));

  expect(r.success).toBe(true);
  expect(r.missingFields).toEqual([]);
  expect(r.html).toContain('Demo Public School');
  expect(r.html).toMatch(/<img[^>]+example\.com\/logo\.png/);
  expect(r.html).toContain('71'); // t1_halfyearly reached the cell
  expect(r.html).toContain('172'); // grandtotal
});
