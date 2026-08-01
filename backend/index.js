require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connect = require("./src/config/database"); 
const bodyParser = require("body-parser");
const morgan = require('morgan'); 
const path = require("path");
const cookieParser = require('cookie-parser');
const { setIo } = require('./src/socket'); 
const logger = require('./src/utils/logger'); 
const mongoSanitize = require('express-mongo-sanitize'); // FIX 15: NoSQL injection protection 

// Route imports
const authRoutes = require('./src/routes/authenticates');
const adminRoutes = require('./src/routes/adminRoutes');
const teacherRoutes = require('./src/routes/teacherRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const admissionRoutes = require('./src/routes/admissionRoutes');
const assignmentRoutes = require('./src/routes/assignment');
const knowledgeRoutes = require('./src/routes/knowledgecenter');
const noticeRoutes = require('./src/routes/noticeRoutes');
const chatRoutes = require('./src/routes/chatroutes');
const complainRoutes = require('./src/routes/complainBoxRoute');
const eventRoutes = require('./src/routes/eventRoutes');

const applicationRoutes = require('./src/routes/applicationRoutes');
const feeRoutes = require('./src/routes/feeRoutes');
const platformRoutes = require('./src/routes/platformRoutes');
const oasesRoutes = require('./src/routes/oases'); // OASES — Online Answer Sheet Evaluation System
const fingerprintRoutes = require('./src/routes/fingerprintRoutes');
const reportCardRoutes = require('./src/routes/reportCardRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes'); // Phase 1 — Super Admin panel
const staffRoutes = require('./src/routes/staffRoutes');      // Staff Credential Management
const notificationRoutes = require('./src/routes/notificationRoutes');           // Phase 1 — Notification System
const notificationPreferenceRoutes = require('./src/routes/notificationPreferenceRoutes'); // Phase 3 — Notification Preferences
const studentManagementRoutes = require('./src/routes/studentManagementRoutes'); // Student Management
const teacherManagementRoutes = require('./src/routes/teacherManagementRoutes'); // Teacher Management
const customFormRoutes        = require('./src/routes/customFormRoutes');         // Custom Forms
const schoolRoutes            = require('./src/routes/schoolRoutes');              // School info (name/logo for topbar)
const dynamicReportRoutes     = require('./src/routes/dynamicReportRoutes');         // Dynamic Report Card Generation
const reportTemplateRoutes    = require('./src/routes/reportTemplateRoutes');      // Report Template Management
const admissionTemplateRoutes = require('./src/routes/admissionTemplateRoutes');    // Admission Form Template Management
const libraryRoutes           = require('./src/routes/libraryRoutes');               // Library Management System
const payrollRoutes           = require('./src/routes/payroll/payrollRoutes');      // 💰 Payroll Module
const importRoutes            = require('./src/import-system/routes/importRoutes');  // 📥 Bulk Import System
const examControllerRoutes    = require('./src/routes/examControllerRoutes');         // 📋 Exam Controller Role

// Boot workers (Bull queue processors)
require('./src/workers/attendanceWorker');
require('./src/workers/pdfWorker');         // Sprint 2 — PDF processing (shared: report-card + payroll)
require('./src/workers/notificationWorker'); // Phase 2 — Scheduled notification queues
require('./src/workers/digestWorker');       // Phase 3 — Daily email digest
require('./src/workers/payrollWorker');      // 💰 Payroll — salary calculations
require('./src/workers/emailWorker');        // 💰 Payroll — payslip email delivery

const errorMiddleware = require('./src/middlewares/error');

const PORT = parseInt(process.env.PORT, 10) || 4000;

const Setupserver = async () => {
  try {
    await connect();

    // FIX MED-9: Verify SMTP on boot — non-blocking early warning for email misconfig
    require('./src/utils/emailService').verifyTransporter().catch(() => { });

    // ── Sprint 7: Helmet security headers ───────────────────────────

    const ALLOWED_ORIGINS = [
      process.env.CLIENT_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://campus-nexus.nexisparkx.com',
      'https://testing-erp.vercel.app',
      'https://testing-erp-qqhi.vercel.app',
      'https://nitaipublicschool.nexisparkx.com',
      'https://phsschool.nexisparkx.com',
      'https://gayatrishikshaniketan.nexisparkx.com',
      'https://gsphsschool.nexisparkx.com',
      'https://ssnvmschool.nexisparkx.com'
    ].filter(Boolean);

    const CF_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';
    const S3_DOMAIN = process.env.S3_BUCKET_DOMAIN || '';

    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Allow Razorpay checkout script to load
          scriptSrc: ["'self'", "https://checkout.razorpay.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // Cloudinary hosts every uploaded image (school logos, student photos,
          // signatures). Without it, any HTML served from this origin — e.g. the
          // report-card preview route — renders with broken images, since
          // CF_DOMAIN / S3_DOMAIN are usually unset and filtered out below.
          imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', CF_DOMAIN, S3_DOMAIN, 'https://*.razorpay.com'].filter(Boolean),
          // Allow XHR/fetch to Razorpay payment API and our own origins
          connectSrc: ["'self'", ...ALLOWED_ORIGINS, "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          // Allow Razorpay checkout modal iframe
          frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff: true,
      // Remove frameguard: 'deny' since we need Razorpay iframe to work
      frameguard: false,
      xssFilter: true,
      hidePoweredBy: true,
    }));

    // ── Rate limiting ────────────────────────────────────────────────────────
    // Auth endpoints: strict — 15 attempts per 15 min per IP
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    });
    // General API: 300 requests per 15 min per IP
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    });

    // ── Sprint 7: Response compression ─────────────────────────────
    app.use(compression({ threshold: 1024 }));

    // Middlewares
    app.use(bodyParser.json({ limit: '50mb' }));          // increased for large import metadata
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.use(cookieParser());
    app.use(morgan('short'));
    // ── FIX 15: Strip NoSQL injection characters ($, .) from all request bodies/params ──
    app.use(mongoSanitize({ replaceWith: '_' }));
    // ── Fix B: Dynamic CORS — handles all school subdomains + Vercel previews ──
    const corsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);

        // Check if origin is in ALLOWED_ORIGINS
        if (ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, origin);
        }

        // Allow any nexisparkx.com subdomain dynamically
        if (origin.endsWith('.nexisparkx.com')) {
          return callback(null, origin);
        }

        // Allow Vercel preview deployments (*.vercel.app)
        if (origin.endsWith('.vercel.app')) {
          return callback(null, origin);
        }

        logger.warn('[CORS] Blocked origin:', origin);
        callback(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 'Authorization',
        'X-Platform-Secret', 'x-platform-secret',
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204
    };

    app.use(cors(corsOptions));

    // Handle preflight OPTIONS requests for all routes using SAME options
    app.options('*', cors(corsOptions));

    // Static files — serve both upload destinations for backward compat
    app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));
    app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

    // Root health check
    app.get("/", (req, res) => {
      res.json({ status: 'ok', message: 'School ERP API is running' });
    });

    // ── /api/v1/health — used by frontend ServiceUnavailable monitor ──
    // No auth required. Returns server status + uptime so the client
    // can detect when the backend is back online and auto-recover.
    app.get("/api/v1/health", (req, res) => {
      res.status(200).json({
        status: 'ok',
        message: 'Server is healthy',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
      });
    });

    // ── FIX 2: Debug endpoint REMOVED — was exposing JWT cookie in response body ──

    // ── TEMPORARY: SMTP debug endpoint — protected by Platform Secret ──────────
    // Call: GET /api/v1/debug/smtp-test with header X-Platform-Secret
    // Remove this after confirming SMTP works on Vercel
    app.get('/api/v1/debug/smtp-test', async (req, res) => {
      const secret = req.headers['x-platform-secret'];
      if (!secret || secret !== process.env.PLATFORM_SECRET) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const smtpConfig = {
        SMTP_HOST:    process.env.SMTP_HOST   || '❌ MISSING',
        SMTP_PORT:    process.env.SMTP_PORT   || '❌ MISSING',
        SMTP_SECURE:  process.env.SMTP_SECURE || '❌ MISSING',
        SMTP_USER:    process.env.SMTP_USER   || '❌ MISSING',
        SMTP_PASS:    process.env.SMTP_PASS   ? `✓ ${process.env.SMTP_PASS.length} chars` : '❌ MISSING',
        SMTP_FROM:    process.env.SMTP_FROM   || '❌ MISSING',
        CLIENT_URL:   process.env.CLIENT_URL  || '❌ MISSING',
        NODE_ENV:     process.env.NODE_ENV    || 'not set',
      };
      try {
        const { getTransporter } = require('./src/utils/emailService');
        const transporter = getTransporter();
        await transporter.verify();
        return res.json({ success: true, message: 'SMTP verified ✓', config: smtpConfig });
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: 'SMTP verification FAILED',
          error: err.message,
          code: err.code,
          config: smtpConfig,
        });
      }
    });

    // ========================
    // API ROUTES (v1)
    // ========================

    // Auth (login, signup, password reset) — strict rate limit
    app.use('/api/v1/user', authLimiter, authRoutes);

    // Role-based module routes — general rate limit
    app.use('/api/v1/admin', apiLimiter, adminRoutes);
    app.use('/api/v1/teacher', apiLimiter, teacherRoutes);
    app.use('/api/v1/student', apiLimiter, studentRoutes);
    app.use('/api/v1/admission', apiLimiter, admissionRoutes);
    // Exam Controller — MARKS_ALL_ACCESS role (school-wide marks management)
    app.use('/api/v1/exam-controller', apiLimiter, examControllerRoutes);
    app.use('/api/v1/report-card', apiLimiter, reportCardRoutes);
    app.use('/api/v1/documents', apiLimiter, documentRoutes);

    // Feature routes (legacy — kept for backward compatibility, now rate-limited)
    app.use('/api/v1/assignment', apiLimiter, assignmentRoutes);
    app.use('/api/v1/knowledgecenter', apiLimiter, knowledgeRoutes);
    app.use('/api/v1/chat', apiLimiter, chatRoutes);
    app.use('/api/v1', apiLimiter, complainRoutes);
    app.use('/notice', apiLimiter, noticeRoutes);
    app.use('/events', apiLimiter, eventRoutes);
    app.use('/application', apiLimiter, applicationRoutes);

    // Fee module (admin + accounts roles)
    app.use('/api/v1/fee', feeRoutes);

    // OASES — Online Answer Sheet Evaluation System
    app.use('/api/v1/oases', oasesRoutes);

    // Platform owner routes (school creation) — protected by X-Platform-Secret header
    // env var: PLATFORM_SECRET=<your-private-secret>
    app.use('/api/platform', platformRoutes);

    // Super Admin panel — Phase 1 (separate JWT secret + cookie, zero overlap with school users)
    app.use('/api/super-admin', apiLimiter, superAdminRoutes);

    // Staff Credential Management — admin creates admission/accounts staff
    app.use('/api/v1/staff', apiLimiter, staffRoutes);

    // Notification System — Phase 1
    app.use('/api/v1/notifications', apiLimiter, notificationRoutes);

    // Notification Preferences — Phase 3 (per-user + admin school settings)
    app.use('/api/v1/notification-preferences', apiLimiter, notificationPreferenceRoutes);

    // Student Management — 7 sub-features
    app.use('/api/v1/student-management', apiLimiter, studentManagementRoutes);

    // Teacher Management — paginated list, soft-delete, restore
    app.use('/api/v1/teacher-management', apiLimiter, teacherManagementRoutes);

    // Custom Forms — build & manage school enquiry forms
    app.use('/api/v1/custom-forms', apiLimiter, customFormRoutes);

    // School info — returns current school name/logo for topbar
    app.use('/api/v1/school', apiLimiter, schoolRoutes);

    // ─────────────────────────────────────────────────────────────────────────
    // 💰 PAYROLL MODULE — Staff Salary, Payslips, Tax Config, Reports
    // Routes: /api/v1/payroll/*
    // Auth:   main ERP varifyToken (HttpOnly cookie) — same as all other routes
    // Roles:  admin, accounts (management), teacher (self-service payslips)
    // ─────────────────────────────────────────────────────────────────────────
    const { varifyToken } = require('./src/middlewares/varifyToken');
    app.use('/api/v1/payroll', apiLimiter, varifyToken, payrollRoutes);

    // ─────────────────────────────────────────────────────────────────────────
    // 📥 IMPORT SYSTEM — Bulk Data Import for Schools (Students + Teachers)
    // Routes: /api/v1/import/*
    // Auth:   varifyToken (embedded in importRoutes) + authorize('admin','admission')
    // Upload: multer memory storage (up to 100MB CSV/XLSX)
    // Redis:  synchronous fallback active (Bull queue disabled until Redis is set up)
    // ─────────────────────────────────────────────────────────────────────────
    app.use('/api/v1/import', apiLimiter, importRoutes);

    // Fingerprint / Biometric Attendance
    // Admin management routes (JWT protected)
    app.use('/api/v1/fingerprint', fingerprintRoutes);
    // Device punch endpoint (token-based, no JWT — called by MORX device)
    app.use('/api/v1/device', fingerprintRoutes);

    // Dynamic Report Card Generation System
    app.use('/api/v1/dynamic-reports', apiLimiter, dynamicReportRoutes);
    app.use('/api/v1/report-templates', apiLimiter, reportTemplateRoutes);

    // Admission Form Template Management System
    app.use('/api/v1/admission-templates', apiLimiter, admissionTemplateRoutes);

    // Library Management System — isolated module (admin + librarian roles)
    app.use('/api/v1/library', apiLimiter, libraryRoutes);

    // Error handling
    app.use(errorMiddleware);

    // ── Sprint 2: wrap with http server + socket.io ─────────────────
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: corsOptions,
    });
    setIo(io); // make io available to services/workers

    // ── FIX 5: Socket.io JWT Authentication Middleware ──────────────────
    const jwt = require('jsonwebtoken');
    io.use((socket, next) => {
      try {
        // Read JWT from cookie header (HttpOnly cookies sent on WS upgrade)
        const cookieHeader = socket.handshake.headers?.cookie || '';
        const tokenCookie = cookieHeader
          .split(';')
          .find(c => c.trim().startsWith('token='));
        const token = tokenCookie?.split('=').slice(1).join('=').trim();

        if (!token) {
          // Fallback: Authorization Bearer header
          const authHeader = socket.handshake.headers?.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            const bearerToken = authHeader.split(' ')[1];
            const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
            socket.userId = decoded.userid;
            return next();
          }
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userid;
        next();
      } catch (err) {
        next(new Error('Invalid or expired token'));
      }
    });
    // ── END Socket.io Auth Middleware ───────────────────────────────────

    io.on('connection', (socket) => {
      // Auto-join personal notification room on connect
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Allow joining school/class/chat rooms but NOT arbitrary user rooms
      socket.on('join:room', (room) => {
        const allowedPrefixes = ['school:', 'class:', 'chat:'];
        const isAllowed = allowedPrefixes.some(prefix => room.startsWith(prefix));
        if (isAllowed) {
          socket.join(room);
        }
        // 'user:' rooms auto-joined above — clients cannot manually join user rooms
      });

      logger.info('[Socket.io] Client connected', { socketId: socket.id, userId: socket.userId });
      socket.on('disconnect', () => {
        logger.info('[Socket.io] Client disconnected', { socketId: socket.id });
      });
    });

    // Start server with port reuse and graceful shutdown
    server.setsockopt = server.setsockopt || function () { };

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 School ERP Server running on port ${PORT}`);
      console.log(`📚 API Base: http://localhost:${PORT}/api/v1`);
      console.log(`👤 Auth:      /api/v1/user`);
      console.log(`🔧 Admin:     /api/v1/admin`);
      console.log(`👨‍🏫 Teacher:   /api/v1/teacher`);
      console.log(`👨‍🎓 Student:   /api/v1/student`);
      console.log(`📋 Admission: /api/v1/admission`);
      console.log(`💰 Fee:       /api/v1/fee`);
      console.log(`📝 OASES:     /api/v1/oases`);
      console.log(`🎓 ExamCtrl:  /api/v1/exam-controller`);
    });

    // Handle port errors — try next port for both EADDRINUSE and EACCES
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        const nextPort = PORT + 1;
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is already in use. Retrying on port ${nextPort}...`);
        } else {
          console.error(`❌ Port ${PORT} permission denied (reserved by OS). Retrying on port ${nextPort}...`);
        }
        server.removeAllListeners('error');
        server.listen(nextPort, '0.0.0.0', () => {
          console.log(`🚀 School ERP Server running on fallback port ${nextPort}`);
        });
        server.on('error', (err2) => {
          console.error('❌ Fallback port also failed:', err2.message);
          process.exit(1);
        });
      } else {
        throw error;
      }
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} signal received: closing HTTP server`);
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Error setting up server:', error);
    process.exit(1);
  }
};

Setupserver();
