const fs = require('fs');

const PDFService = require('../src/core/pdf/htmlToPdf');

// CI installs with PUPPETEER_SKIP_DOWNLOAD=true, so there is no Chromium to
// drive there. Skipping beats a red build for a missing binary — the check
// still runs on any machine that has one.
const chromiumAvailable = () => {
  try {
    return fs.existsSync(require('puppeteer').executablePath());
  } catch {
    return false;
  }
};

const maybe = chromiumAvailable() ? test : test.skip;

// Report cards are the one feature that leaves the process to render. The
// failure mode is a valid-looking 200 carrying an HTML error page or an empty
// buffer, so the assertion is on the magic bytes rather than the status.
maybe(
  'the report card renderer returns bytes starting with %PDF-',
  async () => {
    const result = await PDFService.generatePDF({
      html: '<html><body><h1>Report Card</h1></body></html>',
      css: 'h1 { font-family: serif; }',
      // Zero margins on purpose: the report card templates own their page box via
      // @page, and letting Puppeteer add its own compresses the output.
      options: { format: 'A4', margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } },
    });

    expect(result.success).toBe(true);
    expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  },
  120000
);
