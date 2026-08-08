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
const { registerModules } = require('./core/moduleLoader');

const app = express();

// Render/Vercel terminate TLS at a proxy: without this req.secure is always
// false and rate-limiting buckets every client into the proxy's single IP.
app.set('trust proxy', 1);

app.use(helmet(helmetConfig));
app.use(compression({ threshold: 1024 }));

app.use(express.json({ limit: '50mb' })); // large import metadata
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('short'));
app.use(mongoSanitize({ replaceWith: '_' })); // strip $ and . from input

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight, SAME options

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Health must precede the route block: complainBoxRoute mounts on the bare
// '/api/v1' path and would otherwise shadow /api/v1/health
app.get('/', (req, res) => res.json({ status: 'ok', message: 'School ERP API is running' }));

app.get('/api/v1/health', (req, res) =>
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  })
);

registerModules(app, { apiLimiter, authLimiter });

app.use(errorMiddleware);

module.exports = app;
