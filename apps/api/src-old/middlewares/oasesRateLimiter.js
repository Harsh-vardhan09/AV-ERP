// ══════════════════════════════════════════════════════════════════
// OASES Middleware — Rate Limiters (Sprint 7 — hardened)
// Uses express-rate-limit with Redis store (Upstash-compatible).
// Falls back to in-memory store gracefully if Redis is unavailable.
// ══════════════════════════════════════════════════════════════════
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Build a rate limiter that works with or without Redis.
 * Uses in-memory store (fail-open) — safe for development and
 * when Upstash/Redis does not support ioredis-compatible interface.
 * ipKeyGenerator() is required by express-rate-limit v7+ to handle IPv6.
 */
const makeOasesLimiter = ({ windowMs, max, message, keyGen }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders:   false,
    // In-memory store — no Redis dependency needed
    // This works reliably in dev and behind Upstash (which doesn't
    // support ioredis blocking commands required by rate-limit-redis)
    keyGenerator: keyGen || ((req) => {
      // Prefer authenticated user ID; fall back to IPv6-safe IP
      return (req.userid || req.user?._id)?.toString() || ipKeyGenerator(req) || 'anon';
    }),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error:   message || 'Too many requests. Please slow down.',
        errors:  [],
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    skip: (req) => req.path === '/health',
  });
};

// ── Login: 10 req / 15 min / IP ───────────────────────────────────
const loginLimiter = makeOasesLimiter({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  'Too many login attempts. Please wait 15 minutes.',
  keyGen:   (req) => ipKeyGenerator(req) || 'anon',
});

// ── Page fetch: 200 req / min / user ─────────────────────────────
const pageFetchLimiter = makeOasesLimiter({
  windowMs: 60 * 1000,
  max:      200,
  message:  'Page fetch limit exceeded. Slow down.',
});

// ── Mark save: 300 req / min / user ──────────────────────────────
const markSaveLimiter = makeOasesLimiter({
  windowMs: 60 * 1000,
  max:      300,
  message:  'Mark save limit exceeded.',
});

// ── General OASES: 600 req / min / user ──────────────────────────
const generalOasesLimiter = makeOasesLimiter({
  windowMs: 60 * 1000,
  max:      600,
  message:  'Request limit exceeded.',
});

module.exports = {
  loginLimiter,
  pageFetchLimiter,
  markSaveLimiter,
  generalOasesLimiter,
};
