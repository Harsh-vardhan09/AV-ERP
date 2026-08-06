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
const { varifyToken } = require('./core/security/authenticate');

const app = express();

// Render/Vercel terminate TLS at a proxy: without this req.secure is always
// false and rate-limiting buckets every client into the proxy's single IP.
app.set('trust proxy', 1);

app.use(helmet(helmetConfig));
app.use(compression({ threshold: 1024 }));

app.use(express.json({ limit: '50mb' }));            // large import metadata
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('short'));
app.use(mongoSanitize({ replaceWith: '_' }));        // strip $ and . from input

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));                 // preflight, SAME options

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Health must precede the route block: complainBoxRoute mounts on the bare
// '/api/v1' path and would otherwise shadow /api/v1/health
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

// Temporary: one line moves to its module manifest as each module is migrated
app.use('/api/v1/user', authLimiter, require('../src-old/routes/authenticates'));

app.use('/api/v1/admin', apiLimiter, require('../src-old/routes/adminRoutes'));
app.use('/api/v1/teacher', apiLimiter, require('../src-old/routes/teacherRoutes'));
app.use('/api/v1/student', apiLimiter, require('../src-old/routes/studentRoutes'));
app.use('/api/v1/admission', apiLimiter, require('../src-old/routes/admissionRoutes'));
app.use('/api/v1/exam-controller', apiLimiter, require('../src-old/routes/examControllerRoutes'));
app.use('/api/v1/report-card', apiLimiter, require('../src-old/routes/reportCardRoutes'));
app.use('/api/v1/documents', apiLimiter, require('../src-old/routes/documentRoutes'));

app.use('/api/v1/assignment', apiLimiter, require('../src-old/routes/assignment'));
app.use('/api/v1/knowledgecenter', apiLimiter, require('../src-old/routes/knowledgecenter'));
app.use('/api/v1/chat', apiLimiter, require('../src-old/routes/chatroutes'));
app.use('/api/v1', apiLimiter, require('../src-old/routes/complainBoxRoute'));
app.use('/notice', apiLimiter, require('../src-old/routes/noticeRoutes'));
app.use('/events', apiLimiter, require('../src-old/routes/eventRoutes'));
app.use('/application', apiLimiter, require('../src-old/routes/applicationRoutes'));

app.use('/api/v1/fee', require('../src-old/routes/feeRoutes'));
app.use('/api/v1/oases', require('../src-old/routes/oases'));

// Platform owner (X-Platform-Secret header, not JWT)
app.use('/api/platform', require('../src-old/routes/platformRoutes'));
// Super Admin — separate JWT secret + cookie
app.use('/api/super-admin', apiLimiter, require('../src-old/routes/superAdminRoutes'));

app.use('/api/v1/staff', apiLimiter, require('../src-old/routes/staffRoutes'));
app.use('/api/v1/notifications', apiLimiter, require('../src-old/routes/notificationRoutes'));
app.use('/api/v1/notification-preferences', apiLimiter, require('../src-old/routes/notificationPreferenceRoutes'));
app.use('/api/v1/student-management', apiLimiter, require('../src-old/routes/studentManagementRoutes'));
app.use('/api/v1/teacher-management', apiLimiter, require('../src-old/routes/teacherManagementRoutes'));
app.use('/api/v1/custom-forms', apiLimiter, require('../src-old/routes/customFormRoutes'));
app.use('/api/v1/school', apiLimiter, require('../src-old/routes/schoolRoutes'));

// Payroll — varifyToken applied here, not inside the router
app.use('/api/v1/payroll', apiLimiter, varifyToken, require('../src-old/routes/payroll/payrollRoutes'));

// Bulk import — auth is embedded inside importRoutes
app.use('/api/v1/import', apiLimiter, require('../src-old/import-system/routes/importRoutes'));

// Biometric — /fingerprint is JWT-protected, /device is token-based (MORX hardware).
// Neither mount was rate-limited before the move: apiLimiter here would throttle
// punch ingestion, and /device carries no JWT to bucket per user
const biometric = require('./modules/biometric/module');
app.use(biometric.basePath, biometric.routes);
for (const mount of biometric.extraMounts) app.use(mount, biometric.routes);

app.use('/api/v1/dynamic-reports', apiLimiter, require('../src-old/routes/dynamicReportRoutes'));
app.use('/api/v1/report-templates', apiLimiter, require('../src-old/routes/reportTemplateRoutes'));
app.use('/api/v1/admission-templates', apiLimiter, require('../src-old/routes/admissionTemplateRoutes'));
app.use('/api/v1/library', apiLimiter, require('./modules/library/module').routes);

app.use(errorMiddleware);

module.exports = app;
