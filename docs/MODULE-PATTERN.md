# Module pattern

How a business domain is laid out under `apps/api/src/modules/`. Established by
`library` and refined by `biometric`, `documents`, `notifications`, `identity` and
`tenancy`. Copy it for the remaining modules.

Read `CLAUDE.md` first — it governs comments, code style and refactor safety. This
document only covers module *shape*.

---

## Folder layout

```
apps/api/src/modules/<name>/
├── module.js          manifest — the only thing app.js touches
├── index.js           public API — the only thing other modules touch
├── permissions.js     flat action -> [roles] map
├── routes/
│   ├── index.js       composes the module's routers, exports one
│   └── <name>Routes.js
├── controllers/
├── services/
├── models/
├── jobs/              queue workers, booted by core/queue/registry
└── lib/               module-local helpers that are not services
```

`validators/` and `__tests__/` are also allowed. Create a folder only when a file
needs to go in it.

> `lib/` is **not** in CLAUDE.md's allowed-folder list but is used by `documents`,
> `notifications`, `identity` and `tenancy` for pure helpers (renderers, template
> strings, token builders) that are not request-scoped services. Either add it to
> CLAUDE.md or fold these into `services/` — but do it once, everywhere.

---

## `module.js`

```js
module.exports = {
  key:            'tenancy',
  label:          'Tenancy & Platform',
  description:    'Schools, per-school module settings, super admin and platform onboarding',
  defaultEnabled: true,
  canDisable:     false,
  dependsOn:      ['core', 'identity'],
  basePath:       '/api/v1/school',

  extraMounts: [
    {
      path:    '/api/super-admin',
      routes:  require('./routes/superAdminRoutes'),
      auth:    'superAdminToken',
      limiter: 'api',
    },
  ],

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
```

| field | meaning |
|---|---|
| `key` | stable id. Must match a key in `@av-erp/shared` if the module is toggleable |
| `label` / `description` | shown in the Super Admin module toggles |
| `defaultEnabled` | value a new school gets |
| `canDisable` | `false` for `core`, `identity`, `notifications`, `tenancy` |
| `dependsOn` | keys this module reads data from. Name the *intended* module even if it does not exist yet — that is the migration to-do list |
| `basePath` | must equal the path in `app.js`, character for character |
| `extraMounts` | additional mounts — see below. Omit when there are none |
| `routes` / `permissions` | `require('./routes')`, `require('./permissions')` |
| `jobs` | `require.resolve(...)` per worker, `[]` when none |
| `events` | `[]`, or `{ channels: [...] }` where the module emits |

### `extraMounts` — one shape

Every entry is exactly `{ path, routes, auth, limiter }`. No other shape.

```js
extraMounts: [
  {
    path:    '/api/v1/device',
    routes:  require('./routes'),   // may be the basePath router, or a different one
    auth:    'deviceToken',
    limiter: null,
  },
],
```

- **`path`** — the mount path, exactly as it appears in `app.js`.
- **`routes`** — the router. Point at the *same* router as `basePath` when one
  router serves two paths (biometric), or a *different* one when the mount is its
  own surface (notifications' preferences, tenancy's super-admin).
- **`auth`** — describes the mount's auth model. Declarative only; nothing reads it
  yet. Values in use: `'jwt'`, `'deviceToken'`, `'superAdminToken'`, `'platformSecret'`.
- **`limiter`** — `'api'`, `'auth'`, or **`null`** for a deliberately unlimited path.
  `null` is load-bearing: biometric's `/api/v1/device` and tenancy's `/api/platform`
  were never rate-limited, and adding a limiter would throttle device punches and
  platform onboarding.

Current mounts:

| module | path | auth | limiter |
|---|---|---|---|
| biometric | `/api/v1/device` | `deviceToken` | `null` |
| notifications | `/api/v1/notification-preferences` | `jwt` | `api` |
| tenancy | `/api/super-admin` | `superAdminToken` | `api` |
| tenancy | `/api/platform` | `platformSecret` | `null` |

---

## `permissions.js`

Transcribe the role strings **exactly** as the route files already use them. This
describes current behaviour; do not tighten or widen a role while migrating.

```js
const ADMIN_ONLY = ['admin'];
const ANY_AUTHENTICATED = [];   // token required, no role check
const PUBLIC = [];              // no token at all

const permissions = {
  'library.books.create': ADMIN_ONLY,
  'library.reminders.viewOwn': ['student'],
};

module.exports = permissions;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
```

Key format: `<module>.<resource>.<action>`, one key per registered route.
**Route count should equal permission-key count** — if it doesn't, a route was
missed. Two documented exceptions:

- `documents` — 11 routes at its basePath + 7 mounted under `/api/super-admin`
  by tenancy = 18 keys.
- `tenancy` — `/api/super-admin` (29 routes) and `/api/platform` (3) authorise by
  token and header, not by role, so they collapse to two wildcard keys.

Export the named role arrays alongside the map so route files import their roles
from here instead of redeclaring them. **The action-key map is not wired to
anything yet** — `authorizeRoles` still does the enforcing.

---

## `index.js` — use getters

Export **only** what another module already imports, and name the consumer beside
each export. If you cannot name one, delete the export.

**Use getters, not eager `require`s.** An eager barrel loads its controllers'
entire dependency tree at import time, which is how a real cycle formed:

```
tenancy/index -> superAdminController -> identity/index -> otpController
             -> notifications/index -> notificationService -> tenancy/index
```

`notificationService` bound `SchoolSettings` to `undefined` because `tenancy/index`
was still initialising. Node warned `Accessing non-existent property
'SchoolSettings' of module exports inside circular dependency`. Deferring to first
access fixes it — a consumer loads only the file it actually names.

```js
module.exports = {
  // School — consumers: modules/library, modules/documents, ~28 src-old controllers
  get School() { return require('./models/School'); },

  // SchoolSettings — consumers: core/security/moduleGate, notifications
  get SchoolSettings() { return require('./models/SchoolSettings'); },
};
```

A module nothing imports yet exports an empty object:

```js
// Nothing outside the module imports from it today — add a binding here the
// first time something does.
module.exports = {};
```

---

## `routes/index.js`

Composes the module's routers into one:

```js
const express = require('express');

const router = express.Router();

router.use(require('./libraryRoutes'));

module.exports = router;
```

A module with several routers on sub-paths mounts each here. Routers that need
their *own* top-level path go in `extraMounts` instead, not here.

---

## Wiring into `app.js`

```js
const tenancy = require('./modules/tenancy/module');
app.use(tenancy.basePath, apiLimiter, tenancy.routes);
mountExtras(tenancy);
```

`mountExtras` is declared once in `app.js` and resolves the `limiter` name:

```js
const LIMITERS = { api: apiLimiter, auth: authLimiter };
const mountExtras = (mod) => {
  for (const m of mod.extraMounts || []) {
    const limiter = LIMITERS[m.limiter];
    if (limiter) app.use(m.path, limiter, m.routes);
    else app.use(m.path, m.routes);
  }
};
```

Same path, same limiter, same position. **Position matters**: `complainBoxRoute`
mounts on the bare `/api/v1` with a router-level `varifyToken`, so it answers 401
for every unauthenticated `/api/v1/*` request before later mounts are reached.

---

## The shared module registry

`packages/shared/modules.js` is the single source of truth for the module registry
— `MODULES`, `DEFAULT_MODULES`, `MODULE_KEYS`, `isModuleEnabled`. It replaced
duplicated copies in `apps/api` and `apps/web`.

```js
const { MODULES, isModuleEnabled } = require('@av-erp/shared');   // api
import { DEFAULT_MODULES } from '@av-erp/shared';                 // web
```

Rules:

- It is **CommonJS** so Node can `require` it, and must stay **dependency-free** so
  Vite can bundle it for the browser.
- npm workspaces symlink it *outside* `node_modules`, so Rollup's commonjs plugin
  skips it by default and named imports fail. `apps/web/vite.config.js` carries
  `build.commonjsOptions.include = [/packages[\\/]shared/, /node_modules/]`.
  **Any future CJS package under `packages/` must be added there.**
- Keys are persisted in `SchoolSettings.modules` documents. Adding a key is safe;
  renaming one needs a migration.

---

## Import paths from inside a module

| from | to core | to a sibling module | to `@av-erp/shared` | to `src-old` |
|---|---|---|---|---|
| `modules/<n>/<sub>/` | `../../../core/…` | `../../<other>` | `'@av-erp/shared'` | `../../../../src-old/…` |

- Import a sibling module **only** through its `index.js` — `require('../../people')`,
  never `require('../../people/models/User')`.
- `core/` should never import from `modules/`. It currently does in three places —
  `queue/registry.js`, `security/authenticate.js`, `security/superAdminAuth.js` —
  each added deliberately. Do not add a fourth without deciding whether the rule
  or the code is wrong.
- Anything still reaching into `src-old/` gets `// TEMP: moves to modules/<x>`
  naming a module in `dependsOn`. `grep -rn "TEMP: moves to" src/` is the backlog.

---

## Migration checklist

1. `git mv` every file — never copy-then-delete, or history is lost.
2. Fix imports inside the moved files, then repo-wide. Grep the old paths and
   confirm **zero** hits, including `apps/web` and other modules' comments.
3. Write `permissions.js` from the role strings already in the route files.
4. Write `routes/index.js`, `module.js`, `index.js` (getters).
5. Repoint the `app.js` line(s); add `mountExtras(<mod>)` if the module has extras.
6. Clean per CLAUDE.md: drop banner and restating comments, delete unused imports
   and dead code, `console.*` → `core/logging/logger`, extract anything appearing
   3+ times.
7. Verify:
   ```
   cd apps/api && node -e "require('./src/main.js')"
   npm run smoke
   ```
   Then check route count vs permission-key count, hit at least one authenticated
   endpoint per mount, and confirm the boot log has **no** circular-dependency
   warnings.

---

## Gotchas found so far

1. **The manifest `key` may not exist in the registry.** `library` was absent until
   tenancy added it; `identity` and `notifications` are deliberately absent because
   they are not toggleable. A declared `key` does not mean the routes are gated —
   gating requires `checkModuleAccess` in the route file.

2. **`checkModuleAccess` must run *after* `varifyToken`.** It reads `req.schoolId`;
   mounted before, it hits its no-school-context escape and silently gates nothing.
   `documents` had this bug and it made the whole toggle a no-op.

3. **Route order is load-bearing.** `/books/search` must precede `/books/:id`, and
   `/templates/:type` must precede `/:type/:studentId` — two-segment paths match a
   two-param catch-all first and silently run the wrong handler. Verify by listing
   `router.stack` after the move.

4. **Watch for a local `authorize` alias.** Old route files defined
   `const authorize = (...r) => authorizeRoles(...r)`, colliding by name with the
   *different* `authorize` from `core/security/roleMiddleware`. Call the real one.

5. **Do not rename schema fields, core exports or public route paths.**
   `varifyToken`, `varificationToken`, `/cheak-auth` and `/varify-email` are all
   misspelled and all must stay — they are DB fields, core export names, or URLs
   the frontend calls.

6. **`__dirname` moves.** `CERT_PDF_DIR` and the multer upload dirs resolved
   relative to the old location; after a move they silently point somewhere new.
   Recompute the depth and assert the resolved path is byte-identical.

7. **The repeated catch block is always worth extracting.** Library had one
   `logger.error(...); return serviceError(...)` pair 17 times, biometric 12.

8. **"Binary/encoding" flags on ingest have been false positives twice**
   (`documentController.js`, `user.js`). Both were valid UTF-8 with no BOM; the
   trigger was a high non-ASCII count from emoji and box-drawing in comments.
   Verify with a byte check before re-saving anything.
