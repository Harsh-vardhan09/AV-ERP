require('dotenv').config();
const env = require('./core/config/env');
const connect = require('./core/config/database');
const app = require('./app');
const http = require('http');
const { attachSocket } = require('./core/realtime/socket');
const logger = require('./core/logging/logger');

(async () => {
  await connect();
  require('./core/queue/registry').bootWorkers();   // replaces 6 require() lines
  const server = http.createServer(app);
  attachSocket(server);
  server.listen(env.PORT, '0.0.0.0', () => logger.info(`up on ${env.PORT}`));
})().catch((e) => { logger.error(e); process.exit(1); });