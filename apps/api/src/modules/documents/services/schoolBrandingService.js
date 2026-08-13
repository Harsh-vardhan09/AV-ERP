/**
 * schoolBrandingService.js
 *
 * The single place the documents module resolves a school's branding for a
 * rendered certificate. Mirrors reportcards' DataAggregatorService._fetchSchool
 * so both renderers read branding the same way and a school that uploads a logo
 * once sees it on report cards AND certificates.
 *
 * Logo precedence: SchoolSettings.schoolProfile.schoolLogo (what
 * /admission/school-settings/upload-logo actually writes) → School.logoUrl
 * (declared but never written by any code path — kept only for hand-seeded rows).
 *
 * Every field defaults to '' so a school that has uploaded nothing still renders
 * a complete certificate, just without the logo.
 */
'use strict';

const https = require('https');
const http = require('http');

const { School, SchoolSettings } = require('../../tenancy');
const logger = require('../../../core/logging/logger');

// Certificates are generated in bulk (a whole class at a time). Re-fetching the
// same logo per student would be one HTTP round trip each, so the encoded image
// is cached by URL for the lifetime of the process.
// ponytail: unbounded Map keyed by URL — a school has a handful of logos, but if
// this ever caches per-student assets, swap in an LRU with a size cap.
const _dataUriCache = new Map();
const FETCH_TIMEOUT_MS = 8000;
const MAX_INLINE_BYTES = 2 * 1024 * 1024; // 2 MB — a letterhead logo is far below this

const EMPTY_BRANDING = {
  schoolName: '',
  shortName: '',
  address: '',
  cityLine: '',
  phone: '',
  email: '',
  website: '',
  affiliatedTo: '',
  affiliationNo: '',
  udiseCode: '',
  logoUrl: '',
  logoDataUri: '',
  signatureUrl: '',
  signatureDataUri: '',
};

/**
 * Download a remote image and return a `data:` URI.
 *
 * Puppeteer's waitUntil:'networkidle0' does wait for remote images, so this is
 * not strictly required to make the logo appear — but inlining removes the PDF's
 * dependency on network timing and on the asset host staying reachable at
 * generation time. Returns '' on any failure: a missing logo must never fail the
 * certificate.
 */
const toDataUri = (url) =>
  new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return resolve('');
    if (_dataUriCache.has(url)) return resolve(_dataUriCache.get(url));

    const client = url.startsWith('https://') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode !== 200) {
        logger.warn(`[branding] logo fetch returned ${res.statusCode} — rendering without it`, {
          url,
        });
        res.resume();
        _dataUriCache.set(url, '');
        return resolve('');
      }

      const type = res.headers['content-type'] || 'image/png';
      const chunks = [];
      let size = 0;

      res.on('data', (c) => {
        size += c.length;
        if (size > MAX_INLINE_BYTES) {
          req.destroy();
          logger.warn('[branding] logo exceeds inline limit — falling back to remote URL', { url });
          _dataUriCache.set(url, '');
          return resolve('');
        }
        chunks.push(c);
      });

      res.on('end', () => {
        const uri = `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`;
        _dataUriCache.set(url, uri);
        resolve(uri);
      });
    });

    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy();
      logger.warn('[branding] logo fetch timed out — rendering without it', { url });
      resolve('');
    });

    req.on('error', (err) => {
      logger.warn('[branding] logo fetch failed — rendering without it', {
        url,
        error: err.message,
      });
      resolve('');
    });
  });

/** Join the non-empty parts of a city/state/pin line. */
const joinCityLine = (p, school) =>
  [p.city, p.state, p.pincode || p.pinCode]
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .join(', ') || (school?.city ? String(school.city).trim() : '');

/**
 * Resolve one school's branding.
 *
 * @param {ObjectId|string} schoolId
 * @param {object} [opts]
 * @param {boolean} [opts.inlineImages=true] - base64-inline the logo/signature
 * @returns {Promise<object>} branding object; all keys present, '' when unset
 */
const getSchoolBranding = async (schoolId, opts = {}) => {
  const { inlineImages = true } = opts;
  if (!schoolId) return { ...EMPTY_BRANDING };

  const [school, settings] = await Promise.all([
    School.findById(schoolId)
      .select('name code address city phone email logoUrl udiseCode')
      .lean()
      .catch(() => null),
    SchoolSettings.findOne({ schoolId })
      .select('schoolProfile')
      .lean()
      .catch(() => null),
  ]);

  const p = settings?.schoolProfile || {};

  const logoUrl = (p.schoolLogo || school?.logoUrl || '').trim();
  const signatureUrl = (p.authoritySignature || '').trim();

  const branding = {
    ...EMPTY_BRANDING,
    schoolName: p.fullName || school?.name || '',
    shortName: p.shortName || school?.name || '',
    address: p.address || school?.address || '',
    cityLine: joinCityLine(p, school),
    phone: p.phoneNumber || p.mobileNumber || school?.phone || '',
    email: p.emailId || school?.email || '',
    website: p.website || '',
    affiliatedTo: p.affiliatedTo || p.affiliatedToText || '',
    affiliationNo: p.affiliationCode || '',
    udiseCode: p.udiseCode || school?.udiseCode || '',
    logoUrl,
    signatureUrl,
  };

  if (inlineImages) {
    const [logoDataUri, signatureDataUri] = await Promise.all([
      toDataUri(logoUrl),
      toDataUri(signatureUrl),
    ]);
    branding.logoDataUri = logoDataUri;
    branding.signatureDataUri = signatureDataUri;
  }

  return branding;
};

/**
 * Shape the branding into the schoolSnapshot the certificate renderer consumes.
 * `extra` carries the caller's already-computed fields (e.g. the TC location
 * line built from the School's cert* columns) without this service having to
 * know about them.
 *
 * logoUrl prefers the inlined data URI so the PDF never depends on the network.
 */
const toSchoolSnapshot = (branding, extra = {}) => ({
  schoolName: branding.schoolName,
  udiseCode: branding.udiseCode,
  schoolLocationLine: '',
  ...extra,
  logoUrl: branding.logoDataUri || branding.logoUrl || '',
  signatureUrl: branding.signatureDataUri || branding.signatureUrl || '',
  addressLine: branding.address,
  cityLine: branding.cityLine,
  affiliatedTo: branding.affiliatedTo,
  affiliationNo: branding.affiliationNo,
  phone: branding.phone,
  email: branding.email,
  website: branding.website,
});

module.exports = { getSchoolBranding, toSchoolSnapshot, _toDataUri: toDataUri };
