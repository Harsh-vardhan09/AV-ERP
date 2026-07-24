// ══════════════════════════════════════════════════════════════════
// OASES Security — AES-256-GCM Encryption Service (Sprint 7)
// Dedicated key from OASES_ENCRYPT_KEY env var (32-byte hex).
// Falls back to SHA-256 of JWT_SECRET ONLY for boot safety.
// KEY IS NEVER STORED IN DB. Must be in env/.vault only.
// ══════════════════════════════════════════════════════════════════
const crypto = require('crypto');

/**
 * Derive a 32-byte key from env.
 * Priority: OASES_ENCRYPT_KEY (32-byte hex) → SHA256 of JWT_SECRET
 */
const getKey = () => {
  const raw = process.env.OASES_ENCRYPT_KEY;
  if (raw) {
    if (raw.length !== 64) {
      throw new Error('OASES_ENCRYPT_KEY must be exactly 64 hex characters (32 bytes).');
    }
    return Buffer.from(raw, 'hex');
  }
  // Fallback: derive 32-byte key from JWT_SECRET (boot mode only)
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Neither OASES_ENCRYPT_KEY nor JWT_SECRET is set.');
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * @param  {string} plaintext
 * @returns {string}  "iv:authTag:ciphertext" (all hex)
 */
const encrypt = (plaintext) => {
  const key    = getKey();
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted  = cipher.update(plaintext, 'utf8', 'hex');
  encrypted     += cipher.final('hex');
  const authTag  = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt an "iv:authTag:ciphertext" string.
 * @param  {string} ciphertext
 * @returns {string|null}  plaintext, or null if decryption fails
 */
const decrypt = (ciphertext) => {
  try {
    const key            = getKey();
    const [ivHex, tagHex, data] = ciphertext.split(':');
    const iv    = Buffer.from(ivHex,  'hex');
    const tag   = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let out  = decipher.update(Buffer.from(data, 'hex'), undefined, 'utf8');
    out     += decipher.final('utf8');
    return out;
  } catch {
    return null;
  }
};

module.exports = { encrypt, decrypt };
