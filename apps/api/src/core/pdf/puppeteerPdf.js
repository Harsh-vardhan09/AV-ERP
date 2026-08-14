// Browser instance is cached and reused: a cold Chromium launch costs ~1s per call
'use strict';

let _browser = null;
let _launching = false;
const _queue = [];

async function getBrowser() {
  if (_browser) return _browser;

  // Concurrent callers during launch must wait, not launch a second browser
  if (_launching) {
    return new Promise((resolve, reject) => _queue.push({ resolve, reject }));
  }

  _launching = true;
  try {
    const puppeteer = require('puppeteer');
    // Same resolver as htmlToPdf — one decision about which Chromium to drive.
    const { getLaunchOptions } = require('./browserLauncher');
    const launchOptions = await getLaunchOptions([
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ]);
    _browser = await puppeteer.launch(launchOptions);

    _queue.forEach(({ resolve }) => resolve(_browser));
    _queue.length = 0;
    _launching = false;

    // Chromium can die independently of this process
    _browser.on('disconnected', () => {
      _browser = null;
    });

    return _browser;
  } catch (err) {
    _launching = false;
    _queue.forEach(({ reject }) => reject(err));
    _queue.length = 0;
    throw err;
  }
}

async function generatePdfFromHtml(htmlString) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlString, { waitUntil: 'networkidle0', timeout: 30000 });

    // Animations would otherwise be captured mid-transition
    await page.addStyleTag({
      content:
        '*, *::before, *::after { transition: none !important; animation: none !important; }',
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm',
      },
      preferCSSPageSize: true,
    });

    return pdfBuffer;
  } finally {
    await page.close().catch(() => {});
  }
}

// Call at startup: Chromium is frequently absent on slim container images
async function isPuppeteerAvailable() {
  try {
    require.resolve('puppeteer');
    const browser = await getBrowser();
    return !!browser;
  } catch {
    return false;
  }
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

process.on('exit', () => {
  if (_browser) _browser.close().catch(() => {});
});
process.on('SIGINT', () => closeBrowser().finally(() => process.exit(0)));
process.on('SIGTERM', () => closeBrowser().finally(() => process.exit(0)));

module.exports = { generatePdfFromHtml, isPuppeteerAvailable, closeBrowser };
