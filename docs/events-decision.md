# Events feature — keep, port, or delete

Status: **decided — option A, deleted.** API and web removed together on 2026-08-08.
What follows is the survey the decision was made on; see §9 for what was actually removed.

The events feature is the last cluster in `src-old` besides the three god-controllers.
It cannot be migrated mechanically like `academics` and `examination` were, because it is
not school-ERP code — it is college-fest code that was carried into this repo and left
wired up. This document is the evidence needed to decide what happens to it.

---

## 1. Files in scope

| File                                    | Lines   |
| --------------------------------------- | ------- |
| `src-old/controller/eventController.js` | 138     |
| `src-old/routes/eventRoutes.js`         | 18      |
| `src-old/models/event.js`               | 28      |
| `src-old/models/Faculty.js`             | 12      |
| `src-old/models/image.js`               | 8       |
| `src-old/repository/event-repo.js`      | 65      |
| `src-old/repository/faculty-repo.js`    | 14      |
| `src-old/repository/image-repo.js`      | 15      |
| **subtotal in `src-old`**               | **298** |

Two more files already live _outside_ `src-old` but exist only to serve this feature:

| File                                                     | Lines | Note                                                                                                                 |
| -------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `src/modules/people/models/Student.js`                   | 12    | Registers mongoose model `studentinfo`, schema `{name, number}`. **Not** the ERP student — that is `StudentProfile`. |
| `src/modules/communication/repositories/student-repo.js` | 14    | Wraps the above. Exposed as `communication.studentRepo`, whose only consumer is `eventController`.                   |

---

## 2. Endpoints

Mounted in `app.js` at bare **`/events`** — not `/api/v1/events` — with `order: 150`,
which places it _below_ the bare `/api/v1` complaint router. Router-level guards are
`varifyToken` then `schoolIsolation`, so every endpoint requires a valid school JWT.

| Method | Path                    | Handler       | Middleware                                                 | Web caller?                                  |
| ------ | ----------------------- | ------------- | ---------------------------------------------------------- | -------------------------------------------- |
| POST   | `/events/addevent`      | `createEvent` | `varifyToken`, `schoolIsolation`, `upload.single('image')` | **yes** — `AddEventForm.jsx:95`              |
| GET    | `/events/getevents`     | `getEvents`   | `varifyToken`, `schoolIsolation`                           | **yes** — `redux/reducers/EventSlice.jsx:17` |
| GET    | `/events/getevents/:id` | `getoneEvent` | `varifyToken`, `schoolIsolation`                           | **yes** — `ShowSingle.jsx:158`               |
| DELETE | `/events/deleteEvent`   | `deleteEvent` | `varifyToken`, `schoolIsolation`                           | no                                           |
| PATCH  | `/events/editEvent/:id` | `editEvent`   | `varifyToken`, `schoolIsolation`                           | no                                           |

`upload` here is `src-old/middlewares/upload.js` — the original-filename multer disk
writer covered by step 4 of the current work order. Deleting events does not by itself
retire that middleware; `admissions/routes/applicationRoutes.js` also imports it.

---

## 3. Frontend surface

The feature is **live in the web app**, not dead code. `apps/web` carries 6 routes, a
sidebar entry, a Redux slice registered in two stores, and 6 components.

| Web file                                                | What it does                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/redux/reducers/EventSlice.jsx:17`                  | `fetch(VITE_PORT + '/events/getevents')`                                                           |
| `src/components/students/events/ShowSingle.jsx:158`     | `fetch(VITE_PORT + '/events/getevents/:id')`                                                       |
| `src/components/students/events/AddEventForm.jsx:95`    | `fetch(VITE_PORT + '/events/addevent')`                                                            |
| `src/components/students/events/SingleEventCard.jsx:41` | renders `VITE_PORT + '/uploads/' + event.image.file`                                               |
| `src/modules/communication/pages/Eventpage.jsx`         | dispatches `fetchEvents()`                                                                         |
| `src/redux/reducers/FormSlice.jsx`                      | holds `isMainEvent`, `coordinatorType`, `studentCoordinator`, `facultyCoordinator`                 |
| `src/redux/store.jsx:16`, `src/store/Store.js:5`        | register `eventsReducer`                                                                           |
| `src/App.jsx`                                           | routes `/events`, `/description/:id`, `/eventmember`, `/addevent`, `/eventform`, `/groupeventform` |
| `src/pages/Sidebar.jsx:126`                             | **active** nav link "Create Events" → `/addevent`                                                  |

`eventform.jsx`, `groupEventform.jsx` and `eventmember.jsx` make no API calls — they are
form UI feeding `FormSlice`. The equivalent Homepage and Sidebar entries at
`Homepage.jsx:55,79` and `Sidebar.jsx:55` are commented out; `Sidebar.jsx:126` is not.

---

## 4. Why this is fest code, not ERP code

`createEvent` reads `isMainEvent`, `coordinatorType`, `facultyCoordinator` and
`studentCoordinator` off the request body. Those are college-fest concepts — a main
event with sub-events, each run by a named student or faculty coordinator reachable on
a phone number. A school ERP has no such notion.

The data model follows from that and matches nothing else in this codebase:

- `event.js` stores `date` as a **`String`**, not a `Date`.
- `facultyinfo` and `studentinfo` are both bare `{name, number}` contact rows, created
  fresh per event and never deduplicated or linked to `User`, `StudentProfile` or
  `TeacherProfile`.
- `image.js` stores a bare filename pointing into the multer disk directory that Render
  wipes on every redeploy.
- The controller uses a repository-class layer (`new EVENTRepo()`) that exists nowhere
  else in the API.

---

## 5. Defects found while surveying

These are pre-existing. None were introduced by the migration work, and none are fixed.

**a. No tenant isolation — cross-school data leak.** `schoolIsolation` runs on the
router, but no file in the feature has a `schoolId` field or filter. `event-repo.getAll()`
is `event.find()` with no argument, and `get(id)` is `findById(id)` with no school check.
Any authenticated user of any school reads, edits and deletes every school's events.
This is the only mount in the app where `schoolIsolation` is applied and then entirely
ignored by the data layer.

**b. `DELETE /events/deleteEvent` can never work.** The route declares no `:id`
parameter but the handler reads `req.params.id` (`eventController.js:80`), so it is
always `undefined` and the call becomes `findByIdAndDelete(undefined)`. No frontend
calls it, which is presumably why nobody noticed.

**c. OASES result publishing is silently broken by this feature's model.**
`oases/controllers/reportController.js:153` does
`Student = require('../../people').Student`, then
`Student.findOne({ rollNo, schoolId })`. But `people/models/Student.js` is the fest
`studentinfo` schema — `{name, number}` only, with no `rollNo` and no `schoolId`. The
query therefore always returns `null` and every published OASES result gets
`studentId: null`. The intended model is almost certainly `StudentProfile`.
**This one is worth fixing regardless of what is decided about events**, and it is
independent of the events endpoints themselves.

**d. Errors are swallowed.** Every catch in the controller and repositories is
`console.log` then implicit `return undefined`, so `createEvent` answers with a hung
request rather than a 5xx when the DB call fails. `console.*` also violates CLAUDE.md §6.

---

## 6. What breaks if the whole feature is deleted

**API** — the `/events` mount disappears. `legacyMounts` in `app.js` loses its last
entry, which unblocks step 5 of the current work order (removing the `legacyMounts`
argument and the loader's legacy-mount handling).

**Web — 3 live fetch call sites 404**, and their screens break:

- `Eventpage.jsx` (route `/events`) renders empty or errors on `fetchEvents()`.
- `ShowSingle.jsx` (route `/description/:id`) fails to load.
- `AddEventForm.jsx` (route `/addevent`) fails on submit. **This route is reachable from
  the active sidebar link at `Sidebar.jsx:126`,** so it is user-visible today.

**Data** — three mongoose collections stop being written: `event`, `facultyinfo`,
`studentinfo`. Existing documents are orphaned, not dropped. Nothing else in the ERP
reads them.

**Entangled cleanup** — deleting the API side alone leaves `communication.studentRepo`
and `people/models/Student.js` with zero consumers. `people/models/Student.js` must not
simply be deleted while `oases/reportController.js:153` still requires it: that line
needs to be repointed at `StudentProfile` first (defect **c**), or it will move from
silently returning `null` to throwing.

---

## 7. Options

**A — Delete the feature, API and web together.** Removes 298 lines from `src-old`,
empties the folder, unblocks step 5, and closes the cross-tenant leak (**a**) by
removing the surface. Requires deleting the 6 web routes, the sidebar entry, the Redux
slice and its two store registrations, and the 6 components. Must fix defect **c**
first. Highest cleanup value; irreversible outside git; removes a feature someone may
be using.

**B — Keep it, port it properly into `communication`.** Add `schoolId` to all three
schemas plus a backfill migration, filter every repository call by school, fix the
delete route, replace the repository classes with the module's service pattern, and
rename the fest fields. This is a rewrite, not a move — well beyond "MOVE and RENAME
only", and it invests in a data model that does not fit a school ERP.

**C — Freeze it where it is.** Leave `src-old` non-empty, leave step 5 blocked, leave
the cross-tenant leak open. Not recommended: **a** is a live isolation break, and
CLAUDE.md §9 already lists tenant isolation as convention-not-enforcement, so this
would be a known hole left deliberately open.

**Recommended: A**, on the evidence that the fields are fest concepts, the schemas carry
no `schoolId`, and two of the five endpoints have never been callable or called. But
the active sidebar link means real users can reach `/addevent` today, so this is a
product call, not a refactor call — hence the stop.

---

## 8. Decision

**Option A — delete completely, API and web in the same change.**

## 9. What was removed

**API (8 files, 298 lines)** — `controller/eventController.js`, `routes/eventRoutes.js`,
`models/{event,Faculty,image}.js`, `repository/{event,faculty,image}-repo.js`. The
`src-old/models/`, `src-old/repository/` and `src-old/routes/` directories are now gone.

**API, feature-only support files (2)** — `people/models/Student.js` (the fest
`studentinfo` schema) and `communication/repositories/student-repo.js`, plus their
getters on `people/index.js` and `communication/index.js`.

**API wiring** — the `/events` mount, and with it the last entry in `legacyMounts`.
`app.js` now calls `registerModules(app, { apiLimiter, authLimiter })` with no third
argument. Mount count 34 → 33; `tests/boot.test.js` updated to match. The loader's
`legacyMounts = []` parameter is left in place for step 5.

**Web (9 files)** — `components/students/events/` (all 6),
`modules/communication/pages/Eventpage.jsx`, `redux/reducers/EventSlice.jsx`,
`redux/reducers/FormSlice.jsx`. Plus 6 lazy imports and 6 routes from `App.jsx`, the
`form`/`events` reducers from both `redux/store.jsx` and `store/Store.js`, the active
"Create Events" sidebar link, and 4 live `/events` links in `Homepage.jsx`.

### Left behind deliberately

- **Defect c is not fixed.** `oases/controllers/reportController.js` now hard-codes
  `const Student = null` with a FIXME. Behaviour is byte-identical to before —
  `studentId` was always `null` because the query never matched — but the cause is now
  visible instead of hidden. Repointing at `StudentProfile` is a behaviour change and
  needs its own decision.
- **Static "Campus Events" markup in `Homepage.jsx`** — two hardcoded placeholder cards
  ("Robotics Club", "Career Development"). Never API-driven. Their dead CTA link was
  removed; the decorative cards remain, since deleting page sections is a design call.
- **`src-old/middlewares/upload.js`** still exists — `admissions/routes/applicationRoutes.js`
  also imports it. Covered by step 4.
