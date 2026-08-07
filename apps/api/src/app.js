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
// Mounts a module's extraMounts. Each entry is { path, routes, auth, limiter };
// `limiter` names a limiter or is null for deliberately unlimited paths.
const LIMITERS = { api: apiLimiter, auth: authLimiter };
const mountExtras = (mod) => {
  for (const m of mod.extraMounts || []) {
    const limiter = LIMITERS[m.limiter];
    if (limiter) app.use(m.path, limiter, m.routes);
    else app.use(m.path, m.routes);
  }
};

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
app.use('/api/v1/user', authLimiter, require('./modules/identity/module').routes);

app.use('/api/v1/admin', apiLimiter, require('./modules/people/routes/adminRoutes'));
app.use('/api/v1/teacher', apiLimiter, require('./modules/people/routes/teacherRoutes'));
app.use('/api/v1/student', apiLimiter, require('./modules/people/routes/studentRoutes'));
const admissions = require('./modules/admissions/module');
app.use(admissions.basePath, apiLimiter, admissions.routes);
app.use('/api/v1/exam-controller', apiLimiter, require('../src-old/routes/examControllerRoutes'));
const reportcards = require('./modules/reportcards/module');
app.use(reportcards.basePath, apiLimiter, reportcards.routes);
app.use('/api/v1/documents', apiLimiter, require('./modules/documents/module').routes);

app.use('/api/v1/assignment', apiLimiter, require('../src-old/routes/assignment'));
// /api/v1/knowledgecenter, /api/v1/chat, the bare /api/v1 (complaint box) and /notice,
// in that order. The bare /api/v1 mount carries a router-level varifyToken and so
// answers 401 for every unauthenticated /api/v1/* request that reaches it — the two
// mounts above it stay above it, and everything below stays below.
// Nothing is mounted at communication.basePath; see modules/communication/routes/index.js
const communication = require('./modules/communication/module');
mountExtras(communication);
app.use('/events', apiLimiter, require('../src-old/routes/eventRoutes'));
// /application, /api/v1/custom-forms and /api/v1/admission-templates. Must stay
// BELOW complainBoxRoute: it mounts on the bare /api/v1 with a router-level
// varifyToken, and moving these above it would silently un-shadow the public
// POST /api/v1/custom-forms/:token/submit, which answers 401 today
mountExtras(admissions);

// No apiLimiter: this mount never had one, and razorpay/webhook is called by
// Razorpay's infrastructure, not per-user
const fees = require('./modules/fees/module');
app.use(fees.basePath, fees.routes);
// No apiLimiter: the module applies its own generalOasesLimiter inside routes/index.js
const oases = require('./modules/oases/module');
app.use(oases.basePath, oases.routes);

// Tenancy — three mounts, three auth models. /api/platform stays unlimited and
// /api/super-admin keeps apiLimiter, exactly as before the move
const tenancy = require('./modules/tenancy/module');
mountExtras(tenancy);

app.use('/api/v1/staff', apiLimiter, require('./modules/people/routes/staffRoutes'));
const notifications = require('./modules/notifications/module');
app.use(notifications.basePath, apiLimiter, notifications.routes);
mountExtras(notifications);
app.use('/api/v1/student-management', apiLimiter, require('./modules/people/routes/studentManagementRoutes'));
app.use('/api/v1/teacher-management', apiLimiter, require('./modules/people/routes/teacherManagementRoutes'));
app.use(tenancy.basePath, apiLimiter, tenancy.routes);

// Payroll — varifyToken applied here, not inside the router
const payroll = require('./modules/payroll/module');
app.use(payroll.basePath, apiLimiter, varifyToken, payroll.routes);

// Bulk import — auth is embedded inside importRoutes
const imports = require('./modules/imports/module');
app.use(imports.basePath, apiLimiter, imports.routes);

// Biometric — /fingerprint is JWT-protected, /device is token-based (MORX hardware).
// Neither mount was rate-limited before the move: apiLimiter here would throttle
// punch ingestion, and /device carries no JWT to bucket per user
const biometric = require('./modules/biometric/module');
app.use(biometric.basePath, biometric.routes);
mountExtras(biometric);

// /api/v1/dynamic-reports and /api/v1/report-templates — kept at this position,
// after the basePath mount at the top of the block
mountExtras(reportcards);
app.use('/api/v1/library', apiLimiter, require('./modules/library/module').routes);

app.use(errorMiddleware);

module.exports = app;
