require('dotenv').config();
const http = require('http');
const env = require('./core/config/env');
const connect = require('./core/config/database');
const app = require('./app');
const { attachSocket } = require('./core/realtime/socket');
const { bootWorkers } = require('./core/queue/registry');
const logger = require('./core/logging/logger');

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
