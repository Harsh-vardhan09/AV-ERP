# Tech debt

Known shortcuts and dead ends, with what it would take to resolve each.

## `modules/academics/pages/timetable.jsx` is a static mock

Routed at `/timetable` for students and teachers, and linked from the `/home`
quick-access tiles and the legacy sidebar.

The page renders a **hardcoded HTML timetable** and exports it with jsPDF. It
calls no API, and there is no timetable backend anywhere in `apps/api` — no
model, no controller, no route. Nothing a school enters is stored or read back;
every user of every school sees the same fabricated grid.

Kept because it is routed and linked. To resolve, either build a timetable
domain on the API and wire this page to it, or drop the route and the two links
that point at it.

## `/home` still runs a legacy shell

`/home` renders `app/layouts/LegacyHome`, which composes `LegacySidebar` and
`app/pages/Homepage` outside `DashboardLayout`. `LegacySidebar` is a standalone
hardcoded nav, unrelated to the role-driven `app/layouts/Sidebar`, and three of
its links point at routes that do not exist: `/dashboard`, `/online-exam` and
`/self-learning`. Homepage's tiles include two more dead paths,
`/knowlegecentercreate` and `/coding`.

Resolving means deciding whether `/home` earns its place next to the per-role
dashboards; if it does, its nav should come from `navConfig` like everything else.
