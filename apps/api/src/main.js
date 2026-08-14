require('dotenv').config();
const http = require('http');
const env = require('./core/config/env');
const connect = require('./core/config/database');
const app = require('./app');
const { attachSocket } = require('./core/realtime/socket');
const { bootWorkers } = require('./core/queue/registry');
const logger = require('./core/logging/logger');

/**
 * Last-resort net for Redis faults.
 *
 * An ioredis/Bull 'error' event with no listener is rethrown by Node as an
 * uncaught exception. That is how an exhausted Upstash quota killed this process
 * during bootJobs — before server.listen() — and the platform reported
 * "No open ports detected" → 502.
 *
 * Every known client now has a handler, so this should never fire. It is here
 * because "the cache is down" must never take the API down, and the next queue
 * someone adds will not necessarily remember. Deliberately NARROW: only Redis
 * connection/reply faults are swallowed. Anything else is a real bug and is
 * rethrown, so this cannot mask application errors.
 */
const isRedisFault = (err) =>
  err &&
  (err.name === 'ReplyError' ||
    err.name === 'MaxRetriesPerRequestError' ||
    /\b(ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EPIPE)\b/.test(err.code || '') ||
    /max requests limit exceeded|Connection is closed|Stream isn't writeable/i.test(
      err.message || ''
    ));

process.on('uncaughtException', (err) => {
  if (isRedisFault(err)) {
    logger.error('[Redis] Uncaught Redis fault swallowed — queues degraded, API stays up', {
      name: err.name,
      code: err.code,
      message: err.message,
    });
    return;
  }
  logger.error('Uncaught exception — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  if (isRedisFault(reason)) {
    logger.error('[Redis] Unhandled Redis rejection swallowed — API stays up', {
      message: reason?.message,
    });
    return;
  }
  logger.error('Unhandled rejection', { reason: reason?.message || String(reason) });
});

const start = async () => {
  await connect();
  bootWorkers();

  const server = http.createServer(app);
  attachSocket(server);

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀 School ERP API listening on ${env.PORT}`);
  });

  // No port-retry fallback: a taken port in production must crash loudly rather
  // than silently bind somewhere the load balancer is not pointing
  server.on('error', (err) => {
    logger.error('HTTP server error', { code: err.code, message: err.message });
    process.exit(1);
  });

  const gracefulShutdown = (signal) => {
    logger.warn(`${signal} received: closing HTTP server`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

start().catch((err) => {
  logger.error('Server failed to start', { error: err.message, stack: err.stack });
  process.exit(1);
});
