const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, errors } = format;

const isProd = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
});

const loggerTransports = [];

// ✅ Always allow console (Vercel logs will capture this)
loggerTransports.push(
  new transports.Console({
    format: isProd
      ? combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat)
      : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
  })
);

// ❌ Only use file logging if NOT on Vercel
if (isProd && !isVercel) {
  const path = require('path');

  loggerTransports.push(
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

const logger = createLogger({
  level: isProd ? 'warn' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: loggerTransports,
});

module.exports = logger;
