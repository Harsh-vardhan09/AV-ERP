# Web route parity — before and after the router refactor

`App.jsx` was a single 825-line `<Routes>` tree with ~100 inline
`<ProtectedRoute allowedRoles={[...]}>` wrappers. It is now per-module route
arrays composed by `app/router.jsx`, with one guard reading `handle.roles` and
`handle.module`.

**Result: 275 paths before, 275 after. Nothing added, nothing dropped.**
16 paths differ, all in the fee hub, all explained below.

## How this table was produced

Neither column is hand-written.

- **Before** — `git show HEAD:apps/web/src/App.jsx` parsed as JSX: every
  `<Route>` walked with a stack, `allowedRoles` read off the enclosing
  `element`, roles inherited by children, and the three `/*` splats expanded
  with the child routes of `FeeModuleHub`, `PayrollModuleHub` and
  `OasesModuleHub` at HEAD.
- **After** — `app/routes.js` bundled with esbuild and imported, then walked
  the same way. It holds no React, only route data, so it can be loaded
  standalone. `router.jsx` consumes it; nothing is declared inline there.
- Roles **intersect** down the chain in the after column, matching how
  `RouteGuard` evaluates them.

## The 16 differences

All are the fee hub, and all come from the same place: `FeeModuleHub` used to
register its eight config screens only when `role === 'admin'`, inside a
`<Routes>` block. A static reading of the old JSX cannot see that runtime
condition, so the before column over-reports who could reach them.

| Path                                                                                 | Static before       | Reachable before                                                                              | After   |
| ------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------- | ------- |
| `/admin/fee/{dashboard,sessions,heads,structures,defaulters,reports,ledger,refunds}` | `admin` `admission` | admin only — an admission user fell through to the hub's `*` and got the "Select a tab" panel | `admin` |
| `/accounts/fee/{same eight}`                                                         | `accounts`          | nobody — never registered for a non-admin role, so the `*` panel again                        | nobody  |

**The role restrictions are therefore unchanged.** What changed is what a
disallowed user sees: the guard redirects them to their own dashboard instead
of rendering an empty "Select a tab" panel inside the fee chrome. The panel
itself still exists as `FeeHubFallback` on the hub's `*` child.

This is also why the guard intersects rather than letting the deepest `handle`
win. With deepest-wins, `/accounts/fee/dashboard` carrying `roles: ['admin']`
would have overridden the `/accounts` branch restriction and let an **admin**
load a route that has always been accounts-only. Intersection keeps both
constraints, so that path resolves to the empty set exactly as before.

## Intentional change: module gating

`handle.module` is new. Keys come from `packages/shared/modules.js`, and the
guard blocks on `modules[key] === false` — the same test `DashboardLayout`
already uses to hide sidebar links. So a module a school has switched off is
now unreachable by URL, not merely unlinked.

This is a behaviour change on purpose. It bites hardest on `biometric`, whose
`defaultEnabled` is `false`: `/admin/biometric/devices` and
`/admin/biometric/attendance` were reachable by URL for every school while
already being hidden from the sidebar. They now follow the sidebar.

OASES is the exception. It keeps reading `oasesSettings.isOasesEnabled`, which
`SchoolSettingsProvider` composes from the school toggle **and** the Super
Admin switch; `moduleSettings.oases` alone would open a route the school
disabled. Its per-mount redirect (`/admin/exams`, `/teacher/dashboard`) is
carried as `handle.moduleRedirect`, reproducing the old `OasesEnabledRoute`.

## Full table

`—` in the roles column means the path resolves to no role at all.
`⚠` marks a row where before and after differ.

| Path                                         | Roles before                                                                     | Roles after                                                                      | Module gate      |
| -------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- |
| `/`                                          | _public_                                                                         | _public_                                                                         | —                |
| `/accounts`                                  | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/fee`                              | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/fee/*`                            | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/fee/collect`                      | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/fee/dashboard`                    | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/defaulters`                   | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/heads`                        | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/ledger`                       | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/refunds`                      | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/reports`                      | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/sessions`                     | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/structures`                   | `accounts`                                                                       | — ⚠                                                                              | —                |
| `/accounts/fee/students`                     | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll`                          | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/*`                        | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/attendance`               | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/components`               | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/dashboard`                | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/employee-salaries`        | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/my-payslips`              | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/payment-batches`          | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/payslips`                 | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/reports`                  | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/runs`                     | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/runs/:id`                 | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/structures`               | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/accounts/payroll/tax-config`               | `accounts`                                                                       | `accounts`                                                                       | —                |
| `/addnotice`                                 | `admin` `student` `teacher`                                                      | `admin` `student` `teacher`                                                      | —                |
| `/admin`                                     | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/admission-forms/print`               | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/admission-forms/print/:id`           | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/admission-forms/settings`            | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/admission/templates`                 | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/admission/templates/:id/preview`     | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/biometric/attendance`                | `admin` `admission`                                                              | `admin` `admission`                                                              | `biometric`      |
| `/admin/biometric/devices`                   | `admin` `admission`                                                              | `admin` `admission`                                                              | `biometric`      |
| `/admin/bulk-import`                         | `admin` `admission`                                                              | `admin` `admission`                                                              | `imports`        |
| `/admin/class-list`                          | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/classes`                             | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/custom-forms`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | `custom_forms`   |
| `/admin/custom-forms/:id/edit`               | `admin` `admission`                                                              | `admin` `admission`                                                              | `custom_forms`   |
| `/admin/custom-forms/:id/leads`              | `admin` `admission`                                                              | `admin` `admission`                                                              | `custom_forms`   |
| `/admin/custom-forms/create`                 | `admin` `admission`                                                              | `admin` `admission`                                                              | `custom_forms`   |
| `/admin/custom-forms/deleted`                | `admin` `admission`                                                              | `admin` `admission`                                                              | `custom_forms`   |
| `/admin/dashboard`                           | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/documents`                           | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/documents/migration`                 | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/documents/migration/:studentId`      | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/documents/new/:type/:studentId`      | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/documents/preview/:id`               | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/documents/tc`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/documents/tc/:studentId`             | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/documents/template-config`           | `admin` `admission`                                                              | `admin` `admission`                                                              | `documents`      |
| `/admin/dynamic-reports`                     | `admin` `admission`                                                              | `admin` `admission`                                                              | `report_cards`   |
| `/admin/exams`                               | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/fee`                                 | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/fee/*`                               | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/fee/collect`                         | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/fee/dashboard`                       | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/defaulters`                      | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/heads`                           | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/ledger`                          | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/refunds`                         | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/reports`                         | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/sessions`                        | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/structures`                      | `admin` `admission`                                                              | `admin` ⚠                                                                        | —                |
| `/admin/fee/students`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/id-cards/students`                   | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/id-cards/teachers`                   | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/knowledge-center`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | `communication`  |
| `/admin/library`                             | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/library/books`                       | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/library/dashboard`                   | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/library/issue`                       | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/library/issued`                      | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/library/librarians`                  | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/library/overdue`                     | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/library/return`                      | `admin`                                                                          | `admin`                                                                          | `library`        |
| `/admin/marks-audit-log`                     | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/notifications`                       | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases`                               | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/admin/assignments`             | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/admin/audit`                   | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/admin/conflicts`               | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/admin/exam-setup`              | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/admin/reports`                 | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/admin/scheme/:examId`          | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/admin/sheets/:examId`          | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/dashboard`                     | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/evaluator/queue`               | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/evaluator/sheet/:sheetId`      | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/exam/:examId`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/exam/new`                      | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/exams`                         | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/head-examiner/conflicts`       | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/head-examiner/final`           | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/oases/scan-operator/upload`          | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll`                             | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/*`                           | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/attendance`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/components`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/dashboard`                   | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/employee-salaries`           | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/my-payslips`                 | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/payment-batches`             | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/payslips`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/reports`                     | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/runs`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/runs/:id`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/structures`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/payroll/tax-config`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/report-cards`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | `report_cards`   |
| `/admin/report-cards/:studentId`             | `admin` `admission`                                                              | `admin` `admission`                                                              | `report_cards`   |
| `/admin/sessions`                            | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/settings`                            | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/staff`                               | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students`                            | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/:id`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/:id/edit`                   | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/all`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/bulk-edit`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/deleted`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/dropped`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/passed`                     | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/promotion`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/students/suspended`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/subject-list`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/subjects`                            | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/teacher-assignment`                  | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/teacher-leaves`                      | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/teachers`                            | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/teachers/:id`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/teachers/:id/edit`                   | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/teachers/all`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/teachers/deleted`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admin/template-report-cards`               | `admin` `admission`                                                              | `admin` `admission`                                                              | `report_cards`   |
| `/admin/templates`                           | `admin` `admission`                                                              | `admin` `admission`                                                              | `report_cards`   |
| `/admission`                                 | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/admission-forms/print`           | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/admission-forms/print/:id`       | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/admission-forms/settings`        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/admission/templates`             | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/admission/templates/:id/preview` | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/dashboard`                       | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/register-student`                | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/register-teacher`                | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/students`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/students/:id`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/teachers`                        | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/admission/teachers/:id`                    | `admin` `admission`                                                              | `admin` `admission`                                                              | —                |
| `/application`                               | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/assignment`                                | `student`                                                                        | `student`                                                                        | —                |
| `/assignment/:subject`                       | `student`                                                                        | `student`                                                                        | —                |
| `/assignment/:subject/:assignmentid`         | `student`                                                                        | `student`                                                                        | —                |
| `/attendance`                                | `student`                                                                        | `student`                                                                        | —                |
| `/box`                                       | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/change-password`                           | `accounts` `admin` `admission` `exam_controller` `librarian` `student` `teacher` | `accounts` `admin` `admission` `exam_controller` `librarian` `student` `teacher` | —                |
| `/chatapp`                                   | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/complaintbox`                              | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/complaintform`                             | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/createtimetable`                           | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/exam-controller`                           | `exam_controller`                                                                | `exam_controller`                                                                | —                |
| `/exam-controller/audit-log`                 | `exam_controller`                                                                | `exam_controller`                                                                | —                |
| `/exam-controller/dashboard`                 | `exam_controller`                                                                | `exam_controller`                                                                | —                |
| `/exam-controller/exams`                     | `exam_controller`                                                                | `exam_controller`                                                                | —                |
| `/exam-controller/marks`                     | `exam_controller`                                                                | `exam_controller`                                                                | —                |
| `/finance`                                   | _public_                                                                         | _public_                                                                         | —                |
| `/forgot-password`                           | _public_                                                                         | _public_                                                                         | —                |
| `/forgot-password/:token`                    | _public_                                                                         | _public_                                                                         | —                |
| `/fullnotice/:id`                            | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/home`                                      | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/knowlegecenter`                            | `student`                                                                        | `student`                                                                        | `communication`  |
| `/leavesection`                              | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/librarian`                                 | `librarian`                                                                      | `librarian`                                                                      | `library`        |
| `/librarian/books`                           | `librarian`                                                                      | `librarian`                                                                      | `library`        |
| `/librarian/dashboard`                       | `librarian`                                                                      | `librarian`                                                                      | `library`        |
| `/librarian/issue`                           | `librarian`                                                                      | `librarian`                                                                      | `library`        |
| `/librarian/issued`                          | `librarian`                                                                      | `librarian`                                                                      | `library`        |
| `/librarian/overdue`                         | `librarian`                                                                      | `librarian`                                                                      | `library`        |
| `/librarian/return`                          | `librarian`                                                                      | `librarian`                                                                      | `library`        |
| `/login`                                     | _public_                                                                         | _public_                                                                         | —                |
| `/next/:id`                                  | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/noticeapprove`                             | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/notification-preferences`                  | `accounts` `admin` `admission` `exam_controller` `librarian` `student` `teacher` | `accounts` `admin` `admission` `exam_controller` `librarian` `student` `teacher` | —                |
| `/notifications`                             | `accounts` `admin` `admission` `exam_controller` `librarian` `student` `teacher` | `accounts` `admin` `admission` `exam_controller` `librarian` `student` `teacher` | —                |
| `/otp`                                       | _public_                                                                         | _public_                                                                         | —                |
| `/passkey`                                   | _public_                                                                         | _public_                                                                         | —                |
| `/payroll`                                   | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/*`                                 | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/attendance`                        | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/components`                        | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/dashboard`                         | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/employee-salaries`                 | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/my-payslips`                       | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/payment-batches`                   | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/payslips`                          | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/reports`                           | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/runs`                              | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/runs/:id`                          | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/structures`                        | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/payroll/tax-config`                        | `accounts` `admin`                                                               | `accounts` `admin`                                                               | —                |
| `/quiz`                                      | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/quizmember`                                | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/quizquestion`                              | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/quizscore`                                 | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/quizwinner`                                | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/register`                                  | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/request`                                   | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/roadmap`                                   | _public_                                                                         | _public_                                                                         | —                |
| `/roadmapshow`                               | _public_                                                                         | _public_                                                                         | —                |
| `/service-unavailable`                       | _public_                                                                         | _public_                                                                         | —                |
| `/showleaves/:filename`                      | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/signup2`                                   | _public_                                                                         | _public_                                                                         | —                |
| `/student`                                   | `student`                                                                        | `student`                                                                        | —                |
| `/student/assignments`                       | `student`                                                                        | `student`                                                                        | `assignments`    |
| `/student/attendance`                        | `student`                                                                        | `student`                                                                        | —                |
| `/student/complaints`                        | `student`                                                                        | `student`                                                                        | `communication`  |
| `/student/dashboard`                         | `student`                                                                        | `student`                                                                        | —                |
| `/student/fees`                              | `student`                                                                        | `student`                                                                        | `fee_management` |
| `/student/leave`                             | `student`                                                                        | `student`                                                                        | `communication`  |
| `/student/library`                           | `student`                                                                        | `student`                                                                        | `library`        |
| `/student/marks`                             | `student`                                                                        | `student`                                                                        | —                |
| `/student/materials`                         | `student`                                                                        | `student`                                                                        | `communication`  |
| `/student/notices`                           | `student`                                                                        | `student`                                                                        | `communication`  |
| `/student/report-card`                       | `student`                                                                        | `student`                                                                        | `report_cards`   |
| `/studentdesh`                               | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/superadmin`                                | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/admission-templates`            | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/dashboard`                      | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/login`                          | _public_                                                                         | _public_                                                                         | —                |
| `/superadmin/school-templates`               | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/schools`                        | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/schools/:id/modules`            | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/schools/:id/staff`              | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/schools/:id/templates`          | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/superadmin/templates`                      | _superadmin_                                                                     | _superadmin_                                                                     | —                |
| `/takeattendance`                            | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher`                                   | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/assignments`                       | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/attendance`                        | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/co-scholastic`                     | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/dashboard`                         | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/leave`                             | `teacher`                                                                        | `teacher`                                                                        | `communication`  |
| `/teacher/marks`                             | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/materials`                         | `teacher`                                                                        | `teacher`                                                                        | `communication`  |
| `/teacher/my-students`                       | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases`                             | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/admin/assignments`           | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/admin/audit`                 | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/admin/conflicts`             | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/admin/exam-setup`            | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/admin/reports`               | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/admin/scheme/:examId`        | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/admin/sheets/:examId`        | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/dashboard`                   | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/evaluator/queue`             | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/evaluator/sheet/:sheetId`    | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/exam/:examId`                | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/exam/new`                    | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/exams`                       | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/head-examiner/conflicts`     | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/head-examiner/final`         | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/oases/scan-operator/upload`        | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacher/payroll/my-payslips`               | `teacher`                                                                        | `teacher`                                                                        | `payroll`        |
| `/teacher/report-cards`                      | `teacher`                                                                        | `teacher`                                                                        | `report_cards`   |
| `/teacher/report-cards/:studentId`           | `teacher`                                                                        | `teacher`                                                                        | `report_cards`   |
| `/teacher/student-leaves`                    | `teacher`                                                                        | `teacher`                                                                        | `communication`  |
| `/teacher/template-report-cards`             | `teacher`                                                                        | `teacher`                                                                        | `report_cards`   |
| `/teacher/tests`                             | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacherassignment`                         | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacherassignmentupload`                   | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/teacherassignmentupload/:id`               | `teacher`                                                                        | `teacher`                                                                        | —                |
| `/timetable`                                 | `student` `teacher`                                                              | `student` `teacher`                                                              | —                |
| `/unauthorized`                              | _public_                                                                         | _public_                                                                         | —                |
