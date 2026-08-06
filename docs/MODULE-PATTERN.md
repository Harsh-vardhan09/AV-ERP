# Module pattern

How a business domain is laid out under `apps/api/src/modules/`. Established by
`library`, the first module migrated. Copy it exactly for the remaining 16.

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
└── models/
```

Create a folder only when a file needs to go in it. `validators/`, `jobs/` and
`__tests__/` are also allowed — library needed none of them.

Two files are the module's entire surface:

- **`module.js`** — how the app mounts it. Only `app.js` reads this.
- **`index.js`** — how other modules consume it. Nothing else may be imported
  across a module boundary.

---

## `module.js`

```js
module.exports = {
  key:            'library',
  label:          'Library',
  description:    'Book catalogue, issue and return, librarian accounts',
  defaultEnabled: true,
  canDisable:     true,
  dependsOn:      ['core', 'people'],
  basePath:       '/api/v1/library',
  routes:         require('./routes'),
  permissions:    require('./permissions'),
  jobs:           [],
  events:         [],
};
```

| field | meaning |
|---|---|
| `key` | stable id. Should match the key in `moduleConstants.js` — see gotcha 1 |
| `label` / `description` | shown in the Super Admin module toggles |
| `defaultEnabled` | value a new school gets |
| `canDisable` | `false` only for `core` |
| `dependsOn` | keys this module reads data from. Name the *intended* module even if it does not exist yet — that is the migration to-do list |
| `basePath` | must equal the path in `app.js`, character for character |
| `jobs` / `events` | `[]` when the module has none. Keep the keys so every manifest has the same shape |

---

## `permissions.js`

Transcribe the role strings **exactly** as the route file already uses them. This
is a description of current behaviour, not a redesign — do not tighten or widen a
role while migrating.

```js
const LIBRARIAN_AND_ADMIN = ['librarian', 'admin'];
const ADMIN_ONLY          = ['admin'];
const STUDENT_ONLY        = ['student'];

const permissions = {
  'library.dashboard.view':   LIBRARIAN_AND_ADMIN,
  'library.books.create':     LIBRARIAN_AND_ADMIN,
  'library.librarians.create': ADMIN_ONLY,
  'library.reminders.viewOwn': STUDENT_ONLY,
  // ...one key per route
};

module.exports = permissions;
module.exports.LIBRARIAN_AND_ADMIN = LIBRARIAN_AND_ADMIN;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
module.exports.STUDENT_ONLY = STUDENT_ONLY;
```

Key format: `<module>.<resource>.<action>`. One key per registered route — if the
counts differ, a route was missed.

The named role arrays are exported alongside the map so the route file imports its
roles from here instead of redeclaring them. **The action-key map itself is not
wired to anything yet** — nothing reads it, and `authorizeRoles` still does the
enforcing. That is deliberate: it lets every module publish its permission surface
before the enforcement layer is built.

---

## `index.js`

Export **only** what another module already imports. Not what one might plausibly
need — that is speculative API surface, and CLAUDE.md forbids it.

Library exports nothing, because nothing outside it imports it:

```js
// Public API of the library module. Nothing outside the module imports from it
// today, so nothing is exported — add a binding here the first time something does.
// Importers must go through this file, never into models/ or services/ directly.
module.exports = {};
```

A module that *is* consumed looks like this instead:

```js
// notificationService: used by fee, admission, report-cards, student
// Notification model: used by communication for the notice fan-out
module.exports = {
  notificationService: require('./services/notificationService'),
  Notification:        require('./models/Notification'),
};
```

Name the consumer in a comment for every export. If you cannot name one, delete
the export.

---

## `routes/index.js`

Composes the module's routers into one:

```js
const express = require('express');

const router = express.Router();

router.use(require('./libraryRoutes'));

module.exports = router;
```

With a single router this is one line of indirection. It exists so a module that
grows a second router changes only this file, never `app.js`. A module with several
routers mounts each on its sub-path here:

```js
router.use('/preferences', require('./preferenceRoutes'));
router.use(require('./notificationRoutes'));
```

---

## Wiring into `app.js`

One line, replacing the module's old route line **in the same position**:

```js
app.use('/api/v1/library', apiLimiter, require('./modules/library/module').routes);
```

Same path, same limiter, same position. Position matters: `complainBoxRoute` mounts
on the bare `/api/v1`, so anything registered after it can be shadowed.

---

## Import paths from inside a module

Depth is fixed by the layout, so these are always the same:

| from | to core | to a sibling module | to `src-old` |
|---|---|---|---|
| `modules/<n>/routes/` | `../../../core/…` | `../../<other>` | `../../../../src-old/…` |
| `modules/<n>/controllers/` | `../../../core/…` | `../../<other>` | `../../../../src-old/…` |
| `modules/<n>/services/` | `../../../core/…` | `../../<other>` | `../../../../src-old/…` |
| `modules/<n>/models/` | `../../../core/…` | `../../<other>` | `../../../../src-old/…` |

Rules:

- Import a sibling module **only** through its `index.js` — `require('../../people')`,
  never `require('../../people/models/User')`.
- `core/` never imports from `modules/`.
- Anything still reaching into `src-old/` gets a `// TEMP: moves to modules/<x>`
  comment on the line above. Those comments are the remaining migration backlog —
  `grep -rn "TEMP: moves to" src/` lists it.

---

## Migration checklist

1. `git mv` every file — never copy-then-delete, or history is lost.
2. Fix imports inside the moved files, then repo-wide. Grep the old paths and
   confirm **zero** hits, including `apps/web`.
3. Write `permissions.js` from the role strings already in the route file.
4. Write `routes/index.js`, `module.js`, `index.js`.
5. Repoint the `app.js` line.
6. Clean per CLAUDE.md: drop banner and restating comments, delete unused imports
   and dead code, `console.*` → `core/logging/logger`, extract anything appearing
   3+ times.
7. Verify:
   ```
   cd apps/api && node -e "require('./src/main.js')"
   npm run smoke
   ```
   Then check the route count and the permission-key count match, and hit at least
   one authenticated endpoint per module to confirm the response shape is unchanged.

---

## Gotchas found doing `library`

1. **The manifest `key` may not exist in `moduleConstants.js`.** `library` is absent
   from `MODULES`, so the route was never gated by `checkModuleAccess` and still is
   not. Adding a key there changes `DEFAULT_MODULES` and every school's
   `SchoolSettings` — a schema-affecting change that needs its own migration. Do not
   fold it into a move.

2. **Route order is load-bearing.** `/books/search` must stay registered before
   `/books/:id`, or `search` is parsed as an id. Preserve the original order exactly;
   verify by listing `router.stack` after the move.

3. **Watch for a local `authorize` alias.** The old route file defined
   `const authorize = (...r) => authorizeRoles(...r)`, which collides by name with the
   *different* `authorize` exported by `core/security/authorize.js`. Call
   `authorizeRoles` directly.

4. **Do not rename schema fields or core exports.** `varifyToken`, `varificationToken`
   and `varificationTokenExpired` are misspelled but are respectively a core export
   name and live User schema fields. "Fix misspellings within this module only" stops
   at the module boundary.

5. **The repeated catch block is always worth extracting.** Library had
   `logger.error(...); return serviceError(res, err);` 17 times; it collapsed to one
   `fail(res, err, action)` helper with identical status and body.
