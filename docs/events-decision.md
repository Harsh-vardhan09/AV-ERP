# Events feature — keep or delete

The events code was left out of the `communication` migration deliberately. It is a
leftover from a college-fest app (`isMainEvent`, `coordinatorType`, `facultyCoordinator`,
a `studentinfo` collection of name + phone number). This document lists what exists, what
calls it, and what breaks if it goes — so the call can be made on evidence.

**Nothing here has been changed.** All files named below are still where they were.

---

## 1. Endpoints it exposes

Mounted at `app.js` as `app.use('/events', apiLimiter, require('../src-old/routes/eventRoutes'))`.
The whole router sits behind `varifyToken` + `schoolIsolation`.

| Method | Path | Handler | Called by frontend? |
|---|---|---|---|
| POST | `/events/addevent` | `createEvent` (multer `image`) | **Yes** — `AddEventForm.jsx:95` |
| GET | `/events/getevents` | `getEvents` | **Yes** — `EventSlice.jsx:17` |
| GET | `/events/getevents/:id` | `getoneEvent` | **Yes** — `ShowSingle.jsx:158` |
| DELETE | `/events/deleteEvent` | `deleteEvent` | **No caller anywhere** |
| PATCH | `/events/editEvent/:id` | `editEvent` | **No caller anywhere** |

Verified live against a running server:

```
AUTH  GET /events/getevents        201  {"success":true,"events":[]}
ANON  GET /events/getevents        401  {"success":false,"message":"Token is required. Please login."}
AUTH  GET /events/getevents/:id    201  {"success":true,"events":null}
```

So the endpoints work, are authenticated, and currently hold **zero rows**.

---

## 2. Backend files

| File | Lines | Purpose |
|---|---|---|
| `src-old/routes/eventRoutes.js` | 19 | the 5 routes above |
| `src-old/controller/eventController.js` | 138 | create / delete / edit / list / get one |
| `src-old/repository/event-repo.js` | 65 | event CRUD |
| `src-old/repository/faculty-repo.js` | 14 | faculty CRUD |
| `src-old/repository/image-repo.js` | 15 | image CRUD |
| `src-old/models/event.js` | 28 | `title`, `date`, `description`, `image`, `student[]`, `faculty[]` |
| `src-old/models/Faculty.js` | 12 | `name`, `number` — both commented out as required |
| `src-old/models/image.js` | 8 | `file` |
| `src-old/models/Student.js` | 13 | `name`, `number` — **not** `StudentProfile` |

Nothing outside this set imports any of them. `eventController` also used
`repository/student-repo.js`, which moved into `modules/communication/repositories/`
during the communication migration; its import was repointed to
`require('../../src/modules/communication').studentRepo` and the controller still loads.

### Two things worth knowing before deciding

**`models/event.js` has no `schoolId`.** The events collection is not multi-tenant. Every
school shares one global event list — a school admin would see and be able to delete
another school's events. `schoolIsolation` runs on the router but the controller never
filters on it. Any decision to *keep* events means adding `schoolId` plus a migration.

**`models/Student.js` is a second, unrelated student model** (`name` + `number`, collection
`studentinfo`) sitting alongside the real `StudentProfile`. It exists only to satisfy
`event.student[]` and `student-repo`. Keeping events keeps this duplicate model alive.

---

## 3. Frontend surface

### Pages and components

| File | Routed at | Notes |
|---|---|---|
| `modules/communication/pages/Eventpage.jsx` | `/events` | moved here in the communication migration |
| `components/students/events/AddEventForm.jsx` | `/addevent` | role-guarded, POSTs to `/events/addevent` |
| `components/students/events/ShowSingle.jsx` | `/description/:id` | GETs `/events/getevents/:id` |
| `components/students/events/SingleEventCard.jsx` | — | used by `Eventpage` |
| `components/students/events/eventmember.jsx` | `/eventmember` | |
| `components/students/events/eventform.jsx` | `/eventform` | role-guarded |
| `components/students/events/groupEventform.jsx` | `/groupeventform` | role-guarded |

That is **7 routes** in `App.jsx`: lines 454, 455, 456, 665, 683, 684 plus the `/events`
entry itself.

### Redux

- `redux/reducers/EventSlice.jsx` — `fetchEvents` thunk, session-storage cache.
  Registered in **both** `redux/store.jsx:16` and `store/Store.js:5`.
- `redux/reducers/FormSlice.jsx` — carries `isMainEvent`, `coordinatorType`,
  `facultyCoordinator`, `facultyContact`. These fields exist **only** for the event form.

### Navigation entry points

- `pages/Homepage.jsx` — links to `/events` at lines 276, 293, 363 and 608
- `pages/Sidebar.jsx:126` — "Create Events" → `/addevent`

### A detail that suggests it is already half-dead

None of the three frontend fetches send credentials:

```js
fetch(`${import.meta.env.VITE_PORT}/events/getevents`)          // EventSlice.jsx:17
fetch(`${VITE_PORT}/events/addevent`, { method: 'POST', body }) // AddEventForm.jsx:95
fetch(`${VITE_PORT}/events/getevents/${id}`)                    // ShowSingle.jsx:158
```

`fetch` defaults to `credentials: 'same-origin'`. In production `VITE_PORT` resolves to `''`,
so the URL is relative and the cookie rides along — it works. **In development `VITE_PORT`
points at `http://localhost:4000` while the app runs on `:3000`, so the request is
cross-origin, the cookie is not sent, and every one of these calls gets 401.** The events
UI is therefore broken for every developer running locally, which is consistent with it
having gone unnoticed.

---

## 4. What breaks if the whole feature is deleted

### Nothing in the ERP proper

No student, teacher, admission, fee, report-card, attendance, document, payroll, import or
communication code imports any events file. The only cross-link was `student-repo`, already
resolved. Deleting events cannot affect any other module.

### What you would have to remove together

Deleting only the backend leaves the frontend calling dead URLs, so it has to go as a set:

**Backend (9 files)** — the table in §2, plus the `app.use('/events', ...)` line in `app.js`.

**Frontend (7 files)** — `Eventpage.jsx` and the six `components/students/events/*`.

**Frontend edits (5 files)**
- `App.jsx` — 6 lazy imports and 7 routes
- `redux/store.jsx` and `store/Store.js` — drop `eventsReducer`
- `redux/reducers/EventSlice.jsx` — delete
- `redux/reducers/FormSlice.jsx` — drop `isMainEvent`, `coordinatorType`,
  `facultyCoordinator`, `facultyContact`
- `pages/Homepage.jsx` (4 links) and `pages/Sidebar.jsx` (1 link)

**Database** — the `events`, `imgs`, `facultyinfos` and `studentinfos` collections become
orphaned. All are empty on the environment probed.

### Risk of deleting

Low. The collections are empty, no other module touches the code, and the two write
endpoints (`deleteEvent`, `editEvent`) have no caller at all. The one real risk is a school
that has been using the events page in production — check whether the `events` collection
is non-empty in prod before removing anything.

### Cost of keeping

To make it production-grade you would need: `schoolId` on `event` plus a backfill
migration, `schoolId` filtering in `eventController`, retirement or merge of the duplicate
`Student`/`studentinfo` model, `credentials: 'include'` on the three fetches, and a decision
about the college-fest fields (`isMainEvent`, `coordinatorType`, `facultyCoordinator`) which
have no meaning in a school ERP.

---

## Recommendation

**Delete**, unless the production `events` collection has rows. It is ~250 lines of backend
and ~7 frontend files serving a feature whose data model does not match the product, is not
multi-tenant, and drags a duplicate student model along with it. If school event listings
are wanted later, they should be built fresh against `StudentProfile` and `schoolId` — that
is less work than retrofitting this.

The one thing to keep in mind: `Eventpage.jsx` was moved into
`modules/communication/pages/` during the communication migration, so a delete now touches
that module's folder too.
