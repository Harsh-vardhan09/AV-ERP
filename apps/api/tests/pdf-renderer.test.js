const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getLaunchOptions,
  BrowserUnavailableError,
  _reset,
} = require('../src/core/pdf/browserLauncher');
const PDFService = require('../src/core/pdf/htmlToPdf');

// Chromium's download is disabled repo-wide, so CI may genuinely have no browser.
// The resolver tests run everywhere; the ones that actually render are skipped
// when nothing is installed rather than failing for a missing binary.
const hasBrowser = () => {
  try {
    return fs.existsSync(require('puppeteer').executablePath());
  } catch {
    return false;
  }
};
const maybe = hasBrowser() ? test : test.skip;

afterEach(() => {
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  _reset();
});

test('resolves a Chromium that exists on disk', async () => {
  _reset();
  const opts = await getLaunchOptions();
  console.log(`\n  resolved via "${opts.source}" → ${opts.executablePath}`);

  expect(opts.executablePath).toBeTruthy();
  expect(fs.existsSync(opts.executablePath)).toBe(true);
  expect(opts.headless).toBe('new');
  expect(Array.isArray(opts.args)).toBe(true);
});

test('PUPPETEER_EXECUTABLE_PATH overrides everything', async () => {
  // Any real file will do — the resolver only checks existence.
  const fake = path.join(os.tmpdir(), 'zz-fake-chrome');
  fs.writeFileSync(fake, '');
  process.env.PUPPETEER_EXECUTABLE_PATH = fake;
  _reset();

  const opts = await getLaunchOptions();
  expect(opts.executablePath).toBe(fake);
  expect(opts.source).toBe('PUPPETEER_EXECUTABLE_PATH');
  fs.unlinkSync(fake);
});

test('caller flags are merged with the platform flags and de-duplicated', async () => {
  _reset();
  const opts = await getLaunchOptions([
    '--no-sandbox',
    '--no-sandbox',
    '--font-render-hinting=none',
  ]);
  expect(opts.args).toContain('--no-sandbox');
  expect(opts.args.filter((a) => a === '--no-sandbox')).toHaveLength(1);
});

// The failure this whole change exists to make diagnosable. Previously a missing
// browser surfaced as a generic 500 with "Could not generate the PDF."
test('with no browser anywhere it throws a typed, actionable error', async () => {
  process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/chrome';
  _reset();

  jest.resetModules();
  jest.doMock('puppeteer', () => ({
    executablePath: () => '/also/nonexistent/chrome',
  }));
  const launcher = require('../src/core/pdf/browserLauncher');
  launcher._reset();

  await expect(launcher.getLaunchOptions()).rejects.toThrow(launcher.BrowserUnavailableError);
  await expect(launcher.getLaunchOptions()).rejects.toMatchObject({
    code: 'PDF_RENDERER_UNAVAILABLE',
  });
  expect(await launcher.isBrowserAvailable()).toBe(false);

  jest.dontMock('puppeteer');
  jest.resetModules();
});

test('BrowserUnavailableError carries the code the controllers branch on', () => {
  const err = new BrowserUnavailableError('nope');
  expect(err.code).toBe('PDF_RENDERER_UNAVAILABLE');
  expect(err.name).toBe('BrowserUnavailableError');
});

maybe(
  'the renderer still produces a real PDF through the resolver',
  async () => {
    const result = await PDFService.generatePDF({
      html: '<html><body><h1>Report Card</h1></body></html>',
      css: 'h1 { font-family: serif; }',
      options: { format: 'A4', margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } },
    });

    expect(result.success).toBe(true);
    expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    console.log(`\n  rendered ${result.buffer.length} bytes`);
  },
  120000
);

test('a render failure carries the code so callers can tell faults apart', async () => {
  const result = await PDFService.generatePDF({ html: null, css: '' });
  // Either it failed with a code, or it succeeded — what must not happen is a
  // failure with no way to distinguish "no browser" from "bad template".
  if (!result.success) {
    expect('code' in result).toBe(true);
  }
});
