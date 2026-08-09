const logger = require('../logging/logger');

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);                    // Postman, server-to-server
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, origin);
    if (origin.endsWith('.averp.com') || origin.endsWith('.unifiedcampus.com')) return callback(null, origin);
    if (origin.endsWith('.vercel.app')) return callback(null, origin);
    logger.warn('[CORS] Blocked origin:', origin);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform-Secret', 'x-platform-secret'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

module.exports = { ALLOWED_ORIGINS, corsOptions };