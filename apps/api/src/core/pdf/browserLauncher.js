/**
 * browserLauncher.js
 *
 * The single place that decides WHICH Chromium the PDF renderers drive.
 *
 * Why this exists: the repo disables Puppeteer's own Chromium download in four
 * places (.npmrc ×2, package.json build, render.yaml), so on Render there was a
 * Puppeteer library with no browser behind it. Every PDF route died inside
 * puppeteer.launch() with "Could not find Chrome", which the controllers
 * flattened into a generic 500 — the report card download looked broken with no
 * clue why. @sparticuz/chromium supplies a compact Linux binary instead.
 *
 * Resolution order:
 *   1. PUPPETEER_EXECUTABLE_PATH — explicit override, wins everywhere. Set this
 *      if the host already provides a browser (e.g. a Docker image with chromium).
 *   2. @sparticuz/chromium — Linux only. It ships a brotli-compressed x64 build
 *      and extracts it to /tmp on first call, which is why executablePath() is
 *      async and must be awaited once per process.
 *   3. puppeteer.executablePath() — the normal local-dev cache.
 *
 * Version note: @sparticuz/chromium is pinned to the same Chrome major that
 * puppeteer 21.11 speaks (121). Bumping one without the other risks CDP drift.
 */
'use strict';

const fs = require('fs');
const logger = require('../logging/logger');

/** Thrown when no browser can be found, so callers can report it distinctly. */
class BrowserUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BrowserUnavailableError';
    this.code = 'PDF_RENDERER_UNAVAILABLE';
  }
}

// Extraction costs a few hundred ms and writes to /tmp — do it once per process.
let _resolved = null;

const tryLocalPuppeteer = () => {
  try {
    const p = require('puppeteer').executablePath();
    return p && fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
};

const trySparticuz = async () => {
  // The published binary is linux-x64. On Windows/macOS dev machines it cannot
  // run, so fall through to the local puppeteer cache instead of failing.
  if (process.platform !== 'linux') return null;
  try {
    const chromium = require('@sparticuz/chromium');
    const execPath = await chromium.executablePath();
    if (!execPath || !fs.existsSync(execPath)) return null;
    return { execPath, chromium };
  } catch (err) {
    logger.warn('[pdf] @sparticuz/chromium unavailable', { error: err.message });
    return null;
  }
};

/**
 * Resolve the launch options every renderer should use.
 *
 * @param {string[]} [extraArgs] renderer-specific Chromium flags
 * @returns {Promise<{executablePath:string, args:string[], headless:'new'|boolean, source:string}>}
 * @throws {BrowserUnavailableError}
 */
const getLaunchOptions = async (extraArgs = []) => {
  if (!_resolved) {
    const override = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (override && fs.existsSync(override)) {
      _resolved = { executablePath: override, baseArgs: [], source: 'PUPPETEER_EXECUTABLE_PATH' };
    } else {
      const sparticuz = await trySparticuz();
      if (sparticuz) {
        _resolved = {
          executablePath: sparticuz.execPath,
          // Its args carry the single-process / shared-memory flags a small
          // container needs; dropping them is how you get silent OOM kills.
          baseArgs: sparticuz.chromium.args,
          source: '@sparticuz/chromium',
        };
      } else {
        const local = tryLocalPuppeteer();
        if (local) {
          _resolved = { executablePath: local, baseArgs: [], source: 'puppeteer cache' };
        }
      }
    }

    if (!_resolved) {
      throw new BrowserUnavailableError(
        'No Chromium executable is available to render PDFs. Chromium download is ' +
          'disabled (PUPPETEER_SKIP_DOWNLOAD), @sparticuz/chromium did not provide a ' +
          'binary for this platform, and no local puppeteer cache was found. Set ' +
          'PUPPETEER_EXECUTABLE_PATH to a Chromium binary, or deploy on Linux where ' +
          '@sparticuz/chromium can supply one.'
      );
    }

    logger.info(`[pdf] Chromium resolved via ${_resolved.source}: ${_resolved.executablePath}`);
  }

  // De-duplicate so a caller passing a flag sparticuz already sets is harmless.
  const args = [...new Set([..._resolved.baseArgs, ...extraArgs])];
  return {
    executablePath: _resolved.executablePath,
    args,
    headless: 'new',
    source: _resolved.source,
  };
};

/** True when a browser can actually be launched. Never throws. */
const isBrowserAvailable = async () => {
  try {
    await getLaunchOptions();
    return true;
  } catch {
    return false;
  }
};

/** Test seam — forget the memoised resolution. */
const _reset = () => {
  _resolved = null;
};

module.exports = { getLaunchOptions, isBrowserAvailable, BrowserUnavailableError, _reset };
