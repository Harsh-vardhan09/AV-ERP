// apps/api/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const helmetConfig = require('./core/config/helmet');
const { corsOptions } = require('./core/config/cors');
const { apiLimiter, authLimiter } = require('./core/security/rateLimiters');
const errorMiddleware = require('./core/http/errorMiddleware');
const { varifyToken } = require('./core/security/authenticates');
// const { registerModules } = require('./core/moduleLoader');   // ← enable after ~5 modules

const app = express();

// Render/Vercel terminate TLS at a proxy: without this req.secure is always
// false and rate-limiting buckets every client into the proxy's single IP.
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet(helmetConfig));

// ── Compression ─────────────────────────────────────────────────────────────
app.use(compression({ threshold: 1024 }));

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));            // large import metadata
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('short'));
app.use(mongoSanitize({ replaceWith: '_' }));        // strip $ and . from input

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));                 // preflight, SAME options

// ── Static uploads (legacy — both destinations, for backward compat) ────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// ── Health — MUST be before the routes, complainRoutes mounts on bare /api/v1 ─
app.get('/', (req, res) =>
  res.json({ status: 'ok', message: 'School ERP API is running' }));

app.get('/api/v1/health', (req, res) =>
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  }));

// ════════════════════════════════════════════════════════════════════════════
// TEMPORARY ROUTING — one line disappears each time a module moves.
// When all 35 are gone, delete this block and uncomment registerModules below.
// ════════════════════════════════════════════════════════════════════════════

// Auth — strict rate limit
app.use('/api/v1/user', authLimiter, require('./routes/authenticates'));

// Role-based module routes
app.use('/api/v1/admin', apiLimiter, require('./routes/adminRoutes'));
app.use('/api/v1/teacher', apiLimiter, require('./routes/teacherRoutes'));
app.use('/api/v1/student', apiLimiter, require('./routes/studentRoutes'));
app.use('/api/v1/admission', apiLimiter, require('./routes/admissionRoutes'));
app.use('/api/v1/exam-controller', apiLimiter, require('./routes/examControllerRoutes'));
app.use('/api/v1/report-card', apiLimiter, require('./routes/reportCardRoutes'));
app.use('/api/v1/documents', apiLimiter, require('./routes/documentRoutes'));

// Feature routes (legacy paths, kept for backward compatibility)
app.use('/api/v1/assignment', apiLimiter, require('./routes/assignment'));
app.use('/api/v1/knowledgecenter', apiLimiter, require('./routes/knowledgecenter'));
app.use('/api/v1/chat', apiLimiter, require('./routes/chatroutes'));
app.use('/api/v1', apiLimiter, require('./routes/complainBoxRoute'));
app.use('/notice', apiLimiter, require('./routes/noticeRoutes'));
app.use('/events', apiLimiter, require('./routes/eventRoutes'));
app.use('/application', apiLimiter, require('./routes/applicationRoutes'));

app.use('/api/v1/fee', require('./routes/feeRoutes'));
app.use('/api/v1/oases', require('./routes/oases'));

// Platform owner (X-Platform-Secret header, not JWT)
app.use('/api/platform', require('./routes/platformRoutes'));
// Super Admin — separate JWT secret + cookie
app.use('/api/super-admin', apiLimiter, require('./routes/superAdminRoutes'));

app.use('/api/v1/staff', apiLimiter, require('./routes/staffRoutes'));
app.use('/api/v1/notifications', apiLimiter, require('./routes/notificationRoutes'));
app.use('/api/v1/notification-preferences', apiLimiter, require('./routes/notificationPreferenceRoutes'));
app.use('/api/v1/student-management', apiLimiter, require('./routes/studentManagementRoutes'));
app.use('/api/v1/teacher-management', apiLimiter, require('./routes/teacherManagementRoutes'));
app.use('/api/v1/custom-forms', apiLimiter, require('./routes/customFormRoutes'));
app.use('/api/v1/school', apiLimiter, require('./routes/schoolRoutes'));

// Payroll — varifyToken applied here, not inside the router
app.use('/api/v1/payroll', apiLimiter, varifyToken, require('./routes/payroll/payrollRoutes'));

// Bulk import — auth is embedded inside importRoutes
app.use('/api/v1/import', apiLimiter, require('./import-system/routes/importRoutes'));

// Biometric — /fingerprint is JWT-protected, /device is token-based (MORX hardware)
app.use('/api/v1/fingerprint', require('./routes/fingerprintRoutes'));
app.use('/api/v1/device', require('./routes/fingerprintRoutes'));

app.use('/api/v1/dynamic-reports', apiLimiter, require('./routes/dynamicReportRoutes'));
app.use('/api/v1/report-templates', apiLimiter, require('./routes/reportTemplateRoutes'));
app.use('/api/v1/admission-templates', apiLimiter, require('./routes/admissionTemplateRoutes'));
app.use('/api/v1/library', apiLimiter, require('./routes/libraryRoutes'));

// ── All API routes (enable when the block above is empty) ───────────────────
// registerModules(app, { apiLimiter, authLimiter });

// ── Errors — must be last, and only once ───────────────────────────────────
app.use(errorMiddleware);

module.exports = app;