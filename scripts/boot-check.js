// Resolves every require in the API and mounts every module route. No database:
// main.js would connect and then listen forever, which a CI step cannot do.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const app = require('../apps/api/src/app.js');

const mounts = app._router.stack.filter((l) => l.handle && l.handle.stack).length;
console.log(`boot check ok — ${mounts} routers mounted`);

// Queue clients and their reconnect timers keep the loop alive
process.exit(0);
