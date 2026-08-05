/**
 * PDFService — Production-grade HTML-to-PDF using Puppeteer
 *
 * Key design decisions:
 *  1. generateFromTemplate() renders once then calls _renderToPDF() directly
 *     — NO double-wrapping of the HTML document.
 *  2. Viewport is set to A4 width (794px) so layout matches the CSS.
 *  3. @page CSS owns the margins; Puppeteer margin is always {0,0,0,0}.
 *  4. preferCSSPageSize:true + scale:1 prevent any auto-shrink.
 *  5. printBackground:true preserves all colours and borders.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const uuidv4 = async () => {
  const { v4 } = await import('uuid');
  return v4();
};

// A4 at 96 dpi: 210mm × 297mm → 794 × 1123 px
const A4_W = 794;
const A4_H = 1123;

class PDFService {

  // ─────────────────────────────────────────────────────────────
  // Primary entry point (used by dynamicReportController)
  // ─────────────────────────────────────────────────────────────

  /**
   * Render a report template + data → save PDF to disk.
   * This is the ONLY place TemplateParserService is called;
   * _wrapInDocument is called exactly once here.
   */
  static async generateFromTemplate({ template, data, css = '', fileName, outputDir, options = {} }) {
    const TemplateParserService = require('../../../src-old/services/templateParserService');
    const startTime = Date.now();

    // 1. Render Handlebars/template → inner HTML
    const renderResult = TemplateParserService.renderFinalHTML(template, data, css);
    if (!renderResult.success) {
      return {
        success: false,
        error: `Template rendering failed: ${renderResult.error}`,
        missingFields: renderResult.missingFields,
      };
    }

    // 2. Wrap in a full print-ready document (done ONCE)
    const fullHtml = this._wrapInDocument(renderResult.html, css, options);

    // 3. Puppeteer → PDF buffer
    const pdfResult = await this._renderToPDF(fullHtml, options);
    if (!pdfResult.success) {
      return { success: false, error: pdfResult.error };
    }

    // 4. Save to disk
    await fs.mkdir(outputDir, { recursive: true });
    const finalFileName = fileName || `report_${uuidv4()}.pdf`;
    const filePath = path.join(outputDir, finalFileName);
    await fs.writeFile(filePath, pdfResult.buffer);

    return {
      success: true,
      filePath,
      fileName: finalFileName,
      size: pdfResult.buffer.length,
      generationTime: Date.now() - startTime,
      renderTime: renderResult.renderTime,
      missingFields: renderResult.missingFields,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Generic public API (for arbitrary HTML)
  // ─────────────────────────────────────────────────────────────

  /** Returns { success, buffer, size, generationTime } */
  static async generatePDF({ html, css = '', options = {} }) {
    const startTime = Date.now();
    const fullHtml = this._isFullDocument(html) ? html : this._wrapInDocument(html, css, options);
    const result = await this._renderToPDF(fullHtml, options);
    return { ...result, generationTime: Date.now() - startTime };
  }

  /** Generate PDF and write to disk. */
  static async generateAndSave({ html, css = '', fileName, outputDir = './output/reports', options = {} }) {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      const result = await this.generatePDF({ html, css, options });
      if (!result.success) return result;
      const finalFileName = fileName || `report_${uuidv4()}.pdf`;
      const filePath = path.join(outputDir, finalFileName);
      await fs.writeFile(filePath, result.buffer);
      return { success: true, filePath, fileName: finalFileName, size: result.size, generationTime: result.generationTime };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /** Batch generation (backwards-compatible). */
  static async generateBatch(reports, options = {}) {
    const results = [];
    const outputDir = options.outputDir || './output/reports';
    await fs.mkdir(outputDir, { recursive: true });
    const BATCH_SIZE = 5;
    for (let i = 0; i < reports.length; i += BATCH_SIZE) {
      const batch = reports.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (r) => {
        const res = await this.generateAndSave({ html: r.html, css: r.css, fileName: r.fileName, outputDir, options: r.options || options });
        return { studentId: r.studentId, ...res };
      }));
      results.push(...batchResults);
    }
    return results;
  }

  // ─────────────────────────────────────────────────────────────
  // Private: core Puppeteer rendering (called ONCE per document)
  // ─────────────────────────────────────────────────────────────

  static async _renderToPDF(fullHtml, options = {}) {
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--font-render-hinting=none',
          '--force-color-profile=srgb',
        ],
      });

      const page = await browser.newPage();

      // Viewport = A4 width at screen resolution — prevents auto-shrink
      await page.setViewport({ width: A4_W, height: A4_H, deviceScaleFactor: 1 });

      await page.setContent(fullHtml, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 45000,
      });

      // Wait for all web fonts to be ready before rendering
      await page.evaluateHandle('document.fonts.ready');

      // Brief settle for any CSS transitions / lazy layout
      await new Promise((r) => setTimeout(r, 250));

      const buffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,      // preserve all colours, backgrounds, borders
        preferCSSPageSize: true,    // honour the @page size declaration in CSS
        // Margins MUST be 0 here — @page CSS in _wrapInDocument owns the margins.
        // Letting Puppeteer also set margins causes double-margin compression.
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        scale: 1,                   // no auto-scale / shrink
        displayHeaderFooter: false,
        omitBackground: false,
      });

      return { success: true, buffer };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      if (browser) await browser.close();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private: build a print-safe HTML shell around template HTML
  // ─────────────────────────────────────────────────────────────

  static _isFullDocument(html) {
    return /^\s*<!DOCTYPE/i.test(html);
  }

  /**
   * Wraps inner HTML in a complete, print-optimised document.
   * If the content is already a full document (<!DOCTYPE …>) it is returned as-is.
   */
  static _wrapInDocument(content, css = '', options = {}) {
    if (this._isFullDocument(content)) return content;

    const fmt = options.format || 'A4';
    const mt = options.margin?.top || '10mm';
    const mr = options.margin?.right || '10mm';
    const mb = options.margin?.bottom || '10mm';
    const ml = options.margin?.left || '10mm';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=794, initial-scale=1.0">
  <title>Report Card</title>
  <style>
    /* ── Page geometry (single source of truth for margins) ── */
    @page {
      size: ${fmt} portrait;
      margin: ${mt} ${mr} ${mb} ${ml};
    }

    /* ── Box model reset ──────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; }

    /* ── Root / body ──────────────────────────────────────── */
    html {
      width: 210mm;
      /* Disable browser auto-shrink to fit page */
      -webkit-text-size-adjust: 100%;
    }

    body {
      margin: 0;
      padding: 0;
      width: 210mm;
      background: #fff;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      /* Preserve all background colours and images in print */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    /* ── Page-break helpers ───────────────────────────────── */
    .page-break  { page-break-after: always; break-after: page; }
    .no-break    { page-break-inside: avoid; break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }

    /* ── Table defaults ───────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #333;
      padding: 4px 6px;
      text-align: center;
      vertical-align: middle;
    }
    th { font-weight: bold; }

    /* ── Images ───────────────────────────────────────────── */
    img { max-width: 100%; height: auto; }

    /* ── Typography helpers ───────────────────────────────── */
    h1 { font-size: 16pt; margin-bottom: 8px; }
    h2 { font-size: 14pt; margin-bottom: 6px; }
    h3 { font-size: 12pt; margin-bottom: 4px; }
    p  { margin-bottom: 6px; }

    /* ── Utility classes ──────────────────────────────────── */
    .text-center { text-align: center; }
    .text-right  { text-align: right; }
    .text-left   { text-align: left; }
    .bold        { font-weight: bold; }
    .uppercase   { text-transform: uppercase; }
    .underline   { text-decoration: underline; }

    /* ── Print media overrides ────────────────────────────── */
    @media print {
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
    }

    /* ── Template-specific CSS (highest specificity) ─────── */
    ${css}
  </style>
</head>
<body>
${content}
</body>
</html>`;
  }

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────

  static getMetadata(buffer) {
    return {
      size: buffer.length,
      sizeKB: Math.round(buffer.length / 1024 * 100) / 100,
      sizeMB: Math.round(buffer.length / (1024 * 1024) * 100) / 100,
    };
  }

  static async cleanup(outputDir = './output/reports', maxAge = 24) {
    try {
      const files = await fs.readdir(outputDir);
      const now = Date.now();
      const maxAgeMs = maxAge * 60 * 60 * 1000;
      let deleted = 0;
      for (const file of files) {
        const fp = path.join(outputDir, file);
        const stats = await fs.stat(fp);
        if (now - stats.mtimeMs > maxAgeMs) { await fs.unlink(fp); deleted++; }
      }
      return deleted;
    } catch (err) {
      console.error('[PDFService] cleanup error:', err);
      return 0;
    }
  }
}

module.exports = PDFService;
