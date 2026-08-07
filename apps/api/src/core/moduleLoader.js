const fs = require('fs');
const path = require('path');

const logger = require('./logging/logger');
const { authenticate } = require('./security/authenticate');
const { schoolIsolation } = require('./security/tenantScope');
const { checkModuleAccess } = require('./security/moduleGate');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

const loadManifests = () =>
  fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(MODULES_DIR, e.name, 'module.js')))
    .map((e) => require(path.join(MODULES_DIR, e.name, 'module.js')));

// Depth-first topological sort. A dependsOn entry with no manifest behind it
// ('core', 'academics', 'examination') is external and ignored rather than fatal.
const topoSort = (manifests) => {
  const byKey = new Map(manifests.map((m) => [m.key, m]));
  const state = new Map();
  const sorted = [];

  const visit = (mod, trail) => {
    if (state.get(mod.key) === 'done') return;
    if (state.get(mod.key) === 'open') {
      throw new Error(`Circular module dependency: ${[...trail, mod.key].join(' -> ')}`);
    }
    state.set(mod.key, 'open');
    for (const dep of mod.dependsOn || []) {
      const target = byKey.get(dep);
      if (target) visit(target, [...trail, mod.key]);
    }
    state.set(mod.key, 'done');
    sorted.push(mod);
  };

  manifests.forEach((m) => visit(m, []));
  return sorted;
};

// Only these three auth values make the loader apply middleware. Every other value
// — false, 'router', 'custom', 'platform', 'superAdminToken', 'deviceToken' —
// declares that the router already applies its own guard, so the loader adds none.
// Applying authenticate on top of a router that already calls it would re-run the
// user lookup on every request and 401 the public routes inside it.
const CHAINS = {
  jwt:    () => [authenticate],
  scoped: () => [authenticate, schoolIsolation],
  gated:  (key) => [authenticate, schoolIsolation, checkModuleAccess(key)],
};

const chainFor = (auth, key) => (CHAINS[auth] ? CHAINS[auth](key) : []);

// communication reserves a basePath but its routes/index.js exports a router with no
// layers. Mounting it is a provable no-op, so skipping it keeps the loader uniform.
const isEmptyRouter = (r) => !r || !r.stack || r.stack.length === 0;

// Mount position is semantic in this app, not cosmetic: complainBoxRoute sits on the
// bare /api/v1 with a router-level varifyToken, so anything mounted below it answers
// 401 to unauthenticated requests. `order` pins that; topological order is the
// default for modules that do not care. Unordered modules mount last, in topo order.
const TOPO_ORDER_BASE = 1000;

const mountsOf = (mod, topoIndex) => {
  const order = mod.order ?? (topoIndex + 1) * TOPO_ORDER_BASE;
  const mounts = [];

  if (!isEmptyRouter(mod.routes)) {
    mounts.push({
      module:  mod.key,
      path:    mod.basePath,
      routes:  mod.routes,
      auth:    mod.auth,
      limiter: 'limiter' in mod ? mod.limiter : 'api',
      order,
    });
  }

  for (const extra of mod.extraMounts || []) {
    mounts.push({
      module:  mod.key,
      path:    extra.path,
      routes:  extra.routes,
      auth:    extra.auth,
      limiter: 'limiter' in extra ? extra.limiter : 'api',
      order:   extra.order ?? order,
    });
  }

  return mounts;
};

const permissionRegistry = new Map();
const jobPaths = [];
let mountTable = [];

// legacyMounts carries the routers still living in src-old. They take the same
// descriptor shape so they sort into position with everything else, and the
// parameter disappears when src-old does.
const registerModules = (app, { apiLimiter, authLimiter }, legacyMounts = []) => {
  const LIMITERS = { api: apiLimiter, auth: authLimiter };
  const modules = topoSort(loadManifests());

  for (const mod of modules) {
    permissionRegistry.set(mod.key, mod.permissions || {});
    for (const job of mod.jobs || []) jobPaths.push(job);
  }

  const mounts = [...modules.flatMap(mountsOf), ...legacyMounts]
    .map((m, seq) => ({ ...m, seq }))
    .sort((a, b) => a.order - b.order || a.seq - b.seq);

  for (const m of mounts) {
    const limiter = LIMITERS[m.limiter];
    const chain = [...(limiter ? [limiter] : []), ...chainFor(m.auth, m.module)];
    app.use(m.path, ...chain, m.routes);
  }

  mountTable = mounts;

  logger.info(
    `📦 Modules registered (${modules.length}): ${modules.map((m) => m.key).join(', ')}`
  );
  logger.info(
    `🔗 Route mounts (${mounts.length}): ${mounts.map((m) => `${m.path}[${m.module}]`).join(' ')}`
  );

  return mounts;
};

// Jobs are collected at registration but required here, so Bull processors start
// after the DB connection rather than while routes are still mounting.
const bootJobs = () => jobPaths.forEach((p) => require(p));

const getPermissions = (key) => permissionRegistry.get(key);

const getMountTable = () => mountTable;

module.exports = { registerModules, bootJobs, getPermissions, getMountTable };
