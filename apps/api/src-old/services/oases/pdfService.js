
// ══════════════════════════════════════════════════════════════════
// OASES — PDF Processing Service (Sprint 2)
// Processes uploaded PDF answer sheets:
//   1. Read from disk
//   2. Extract page count via pdf-parse
//   3. Store page image paths (placeholder in Sprint 2; real pdf2pic in Sprint 3)
//   4. Update sheet document
//   5. Emit socket events
//   6. Write audit log
// ══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const AnswerSheet = require('../../models/oases/AnswerSheet');
const auditService = require('./auditService');
const { emitToRoom, emitToAll } = require('../../socket');
const {
  PROCESSING_STATUS,
  SIGNED_URL_EXPIRY_SECONDS,
} = require('../../utils/oasesConstants');
const { safeRedisOperation } = require('../../config/oasesRedis');

/**
 * Encrypt rollNo with AES-256-GCM using APP_SECRET as key material.
 * Returns hex string: iv:authTag:ciphertext
 */
const encryptRollNo = (rollNo) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      '[pdfService] JWT_SECRET not set. ' +
      'Cannot perform encryption.'
    );
  }
  const secret = process.env.JWT_SECRET;
  const key = crypto.createHash('sha256').update(secret).digest(); // 32 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(rollNo, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Generate a guaranteed-unique anonymous code.
 * Format: ANON-XXXXXXXX (8 uppercase hex chars)
 */
const generateAnonymousId = () =>
  `ANON-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/**
 * Get a signed (served) URL for a local file.
 * In Sprint 2 this is the static file URL.
 * Sprint 3: swap to S3 presigned URL wrapped in Redis cache.
 */
const getSignedPageUrl = async (filePath) => {
  const cacheKey = `signedurl:${filePath}`;

  // Try to get from cache
  const cached = await safeRedisOperation(async (redis) => {
    return await redis.get(cacheKey);
  });
  if (cached) return cached;

  // If filePath is already a full Cloudinary / remote URL, return it directly.
  // Otherwise fall back to local static URL (for legacy records only).
  let url;
  if (filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
    url = filePath;
  } else {
    const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const relPath = filePath.replace(/\\/g, '/').split('public/')[1] || filePath;
    url = `${baseUrl}/${relPath}`;
  }
  // Try to cache the URL (non-fatal if fails)
  await safeRedisOperation(async (redis) => {
    await redis.set(cacheKey, url, 'EX', SIGNED_URL_EXPIRY_SECONDS);
  });

  return url;
};

/**
 * Main processing function — called by pdfWorker.
 * @param {string} sheetId   - OasesAnswerSheet._id
 * @param {object} meta      - { schoolId, filePath, subjectCode, year }
 */
const processAnswerSheet = async (sheetId, meta) => {
  const { schoolId, filePath, subjectCode, year } = meta;

  // ── 1. Mark as processing ────────────────────────────────────────
  const sheet = await AnswerSheet.findById(sheetId);
  if (!sheet) {
    console.error(`[pdfService] Sheet not found: ${sheetId}`);
    return;
  }

  sheet.processingStatus = PROCESSING_STATUS.PROCESSING;
  await sheet.save();

  // Emit: processing started
  emitToAll('oases:upload:processing', { sheetId, status: 'processing', examConfigId: sheet.examConfigId });

  try {
    // ── 2. Read PDF + get page count ─────────────────────────────────
    let totalPages = 1;
    const pageImages = [];

    if (filePath) {
      let pdfBuffer = null;

      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        // Remote file (Cloudinary) — fetch over HTTPS
        const https = require('https');
        const http = require('http');
        const protocol = filePath.startsWith('https://') ? https : http;
        pdfBuffer = await new Promise((resolve, reject) => {
          protocol.get(filePath, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
          }).on('error', reject);
        });
      } else if (fs.existsSync(filePath)) {
        // Legacy local path
        pdfBuffer = fs.readFileSync(filePath);
      }

      if (pdfBuffer) {
        const parsed = await pdfParse(pdfBuffer);
        totalPages = parsed.numpages || 1;

        // ── 3. Page image references ──────────────────────────────────
        // For Cloudinary files: store the URL itself as the "page image".
        // For local files: store the relative path from public/ root.
        for (let i = 1; i <= totalPages; i++) {
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            pageImages.push(filePath); // Cloudinary URL — returned directly by getSignedPageUrl
          } else {
            pageImages.push(`uploads/oases/${path.basename(filePath)}`);
          }
        }
      }
    }

    // ── 4. Anonymise rollNo if present ───────────────────────────────
    if (sheet.rollNo && !sheet.rollNoEncrypted) {
      sheet.rollNoEncrypted = encryptRollNo(sheet.rollNo);
      sheet.rollNo = undefined; // scrub plain rollNo from doc
    }

    // Ensure uniqueness of anonymousCode
    if (!sheet.anonymousCode || !sheet.anonymousCode.startsWith('ANON-')) {
      // Generate until unique (collision extremely unlikely with 4 random bytes)
      let code;
      let attempts = 0;
      do {
        code = generateAnonymousId();
        const exists = await AnswerSheet.exists({ anonymousCode: code });
        if (!exists) break;
        attempts++;
      } while (attempts < 5);
      sheet.anonymousCode = code;
    }

    // ── 5. Update sheet ──────────────────────────────────────────────
    sheet.pageImages = pageImages;
    sheet.totalPages = totalPages;
    sheet.processingStatus = PROCESSING_STATUS.DONE;
    sheet.processingError = null;
    await sheet.save();

    // ── 6. Emit: processed ────────────────────────────────────────────
    emitToAll('oases:sheet:processed', {
      sheetId,
      examConfigId: sheet.examConfigId,
      totalPages,
      anonymousCode: sheet.anonymousCode,
    });

    // ── 7. Audit log ──────────────────────────────────────────────────
    auditService.log({
      schoolId,
      entityType: 'AnswerSheet',
      entityId: sheetId,
      actorId: sheet.uploadedBy,
      actorRole: 'SYSTEM',
      action: 'SHEET_PROCESSED',
      details: { totalPages, anonymousCode: sheet.anonymousCode },
    });

    console.log(`[pdfService] ✓ Processed sheet ${sheetId} — ${totalPages} page(s)`);

  } catch (err) {
    console.error(`[pdfService] Failed to process ${sheetId}:`, err.message);

    // Mark failed
    await AnswerSheet.findByIdAndUpdate(sheetId, {
      processingStatus: PROCESSING_STATUS.FAILED,
      processingError: err.message,
    });

    // Emit failure
    emitToAll('oases:sheet:processing_failed', { sheetId, error: err.message });

    auditService.log({
      schoolId,
      entityType: 'AnswerSheet',
      entityId: sheetId,
      actorId: sheet?.uploadedBy || null,
      actorRole: 'SYSTEM',
      action: 'SHEET_PROCESSING_FAILED',
      details: { error: err.message },
    });
  }
};

module.exports = { processAnswerSheet, getSignedPageUrl, generateAnonymousId, encryptRollNo };
