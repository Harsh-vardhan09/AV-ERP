/**
 * puppeteerPdf.js
 * ─────────────────────────────────────────────────────
 * Converts an HTML string → PDF Buffer using Puppeteer.
 *
 * Browser instance is cached and reused across calls for performance.
 * Falls back gracefully if Puppeteer unavailable.
 */

'use strict';

let _browser = null;
let _launching = false;
const _queue = [];

/**
 * Get (or lazily launch) the shared Puppeteer browser instance.
 */
async function getBrowser() {
  if (_browser) return _browser;

  // If already launching, queue this request
  if (_launching) {
    return new Promise((resolve, reject) => _queue.push({ resolve, reject }));
  }

  _launching = true;
  try {
    const puppeteer = require('puppeteer');
    _browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    // Flush queue
    _queue.forEach(({ resolve }) => resolve(_browser));
    _queue.length = 0;
    _launching = false;

    // Reset on crash
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

/**
 * Generate a PDF buffer from an HTML string.
 *
 * @param {string} htmlString  Complete HTML document
 * @returns {Promise<Buffer>}  Raw PDF bytes
 */
async function generatePdfFromHtml(htmlString) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlString, { waitUntil: 'networkidle0', timeout: 30000 });

    // Disable animations / transitions so snapshot is instant
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top:    '8mm',
        right:  '8mm',
        bottom: '8mm',
        left:   '8mm',
      },
      preferCSSPageSize: true,
    });

    return pdfBuffer;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Check whether Puppeteer + Chromium are available on this system.
 * Call this at startup and log a warning if false.
 * @returns {Promise<boolean>}
 */
async function isPuppeteerAvailable() {
  try {
    require.resolve('puppeteer');
    const browser = await getBrowser();
    return !!browser;
  } catch {
    return false;
  }
}

/**
 * Gracefully close the shared browser instance (e.g. on process exit).
 */
async function closeBrowser() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

// Close browser on process exit
process.on('exit', () => { if (_browser) _browser.close().catch(() => {}); });
process.on('SIGINT',  () => closeBrowser().finally(() => process.exit(0)));
process.on('SIGTERM', () => closeBrowser().finally(() => process.exit(0)));

module.exports = { generatePdfFromHtml, isPuppeteerAvailable, closeBrowser };
