# Attendance models — how they differ, and what merging would cost

Three models now sit in `apps/api/src/modules/attendance/models/`. They were moved
there unchanged; **nothing has been merged**. This document exists so the merge can
be decided on evidence rather than on the fact that all three have "attendance" in
the name.

**Recommendation up front: merge `TeacherAttendance` and `FacultyAttendance`. Leave
`attendance` (student) alone.** Reasoning below.

---

## The three models at a glance

|                       | `attendance.js`                                    | `TeacherAttendance.js`                                     | `FacultyAttendance.js`                                                 |
| --------------------- | -------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| Model name            | `Attendance`                                       | `TeacherAttendance`                                        | `FacultyAttendance`                                                    |
| Collection            | `attendances`                                      | `teacherattendances`                                       | `facultyattendances`                                                   |
| Subject of the record | a **class + section**                              | one **teacher**                                            | one **faculty member**                                                 |
| Grain                 | **one document per class period**                  | one document per teacher per day                           | one document per faculty per day                                       |
| Who is inside         | `records[]` — an array of students                 | a single `teacherId`                                       | a single `facultyId`                                                   |
| Source of truth       | a teacher taking a register                        | an admin marking staff                                     | a **biometric device**                                                 |
| Status values         | `present, absent, late, leave`                     | `present, absent, half_day, on_leave, holiday, weekly_off` | `present, absent, late, half_day, on_leave`                            |
| Unique index          | none — duplicate prevention is in application code | `{schoolId, teacherId, date}` **unique**                   | `{schoolId, facultyId, date}` **unique**                               |
| Times                 | none                                               | none                                                       | `punchIn`, `punchOut`, `totalHours`, `rawPunches[]`                    |
| Hooks                 | none                                               | none                                                       | `pre('save')` computes `totalHours` and derives status from punch time |
| Files importing it    | 4                                                  | 4                                                          | 3                                                                      |

---

## Why student attendance is a different shape entirely

`attendance.js` is **not** a per-person daily record. One document represents _one
class period_ and carries an embedded `records[]` array of every student in it:

```js
records: [{ studentId, status, leaveId }];
```

It is keyed by `classId + sectionId + subjectId + date + attendanceType`, and it
carries `attendanceType: 'subject' | 'hall'` because a school takes both
subject-wise and hall (homeroom) attendance on the same day.

The two staff models are keyed by `person + date`, one row per person per day.

Merging student attendance into that shape would mean **exploding every embedded
`records[]` array into one document per student per period**. For a school of 1,000
students × 8 periods × 200 school days that is 1.6M documents a year where there are
currently 200K. Every read path — the register screen, the monthly summary, the
report-card attendance block — would need rewriting from "fetch the period" to
"aggregate the students".

There is no benefit on offer that justifies that. **Leave `attendance.js` alone.**

---

## Why the two staff models are genuinely redundant

`TeacherAttendance` and `FacultyAttendance` describe the same real-world fact — _did
this staff member turn up today_ — at the same grain (one row per person per day),
both keyed on a `TeacherProfile` reference, both with a unique index on
`{schoolId, person, date}`.

They differ only in how the fact arrives:

- `TeacherAttendance` is **manually marked** (`markedBy`, `remarks`) and can express
  calendar states the device knows nothing about: `holiday`, `weekly_off`.
- `FacultyAttendance` is **device-populated** (`punchIn`, `punchOut`, `rawPunches[]`,
  `source: 'device' | 'manual'`) and derives its status from punch times in a
  `pre('save')` hook.

That is one entity with two provenances, not two entities. The giveaway is
`FacultyAttendance.source === 'manual'`, which is exactly what `TeacherAttendance`
already is.

### The overlap is already a live bug risk

Both models can hold a record for the same teacher on the same date, and neither
knows about the other. Their unique indexes are per-collection, so nothing stops
`TeacherAttendance` saying `on_leave` while `FacultyAttendance` says `present` from
a punch. Any payroll deduction that reads one and not the other will disagree with
the attendance screen that reads the other. `payroll/services/attendanceDeductionService.js`
consumes `TeacherAttendance`; the biometric module writes `FacultyAttendance`.

---

## What a migration would have to do

Target: keep `FacultyAttendance` as the surviving schema (it is the strict superset —
it already has `source`, and adding two enum values is cheaper than adding punch
tracking to `TeacherAttendance`), renamed to `StaffAttendance`.

1. **Widen the surviving enum** to the union:
   `present, absent, late, half_day, on_leave, holiday, weekly_off`.
2. **Add the manual-marking fields** `TeacherAttendance` has and `FacultyAttendance`
   lacks: `markedBy`, `remarks`, `leaveId`. `manuallyUpdatedBy` and `markedBy` overlap —
   collapse to `markedBy` and backfill.
3. **Reconcile the person reference.** `TeacherAttendance` carries **both**
   `teacherId` (TeacherProfile) and `userId` (User); `FacultyAttendance` carries only
   `facultyId` (TeacherProfile). Either add `userId` to the survivor, or resolve it at
   read time. Check whether anything queries `TeacherAttendance` by `userId` before
   dropping it — that is a code search, not a guess.
4. **Copy every `TeacherAttendance` row** into the survivor with
   `source: 'manual'`, `facultyId := teacherId`, `punchIn/punchOut: null`.
5. **Resolve collisions.** This is the part that needs a decision, not code: where
   both collections hold a row for the same `{schoolId, person, date}`, which wins?
   The unique index will reject the second insert. Suggested rule — a manual
   `holiday`/`weekly_off`/`on_leave` overrides a device punch (an admin explicitly
   said so); otherwise the device record wins (it is evidence). **Count the
   collisions before choosing**, with an aggregation over both collections on
   `{schoolId, teacherId|facultyId, date}`.
6. **Guard `totalHours`.** The `pre('save')` hook only computes it when both
   `punchIn` and `punchOut` exist, so migrated manual rows keep `totalHours: 0`.
   Confirm no report divides by it.
7. **Repoint the 4 + 3 importing files**, then delete `TeacherAttendance.js`.
8. **Leave the old collection in place** until a full payroll cycle has run against
   the merged one. Dropping it is a separate, later commit.

### Migration is not reversible without a backup

Step 5 discards data on collision. Take a dump of both collections first; the
rollback path is restore, not un-merge.

---

## What to check before committing to any of this

- **Row counts** in `teacherattendances` and `facultyattendances` in production. If
  one is empty, this is a delete, not a merge.
- **Collision count** on `{schoolId, person, date}` across the two. That number
  decides whether step 5 is a footnote or the whole project.
- Whether anything reads `TeacherAttendance.userId` directly.
- Whether the biometric device flow ever writes `source: 'manual'` today — if it
  does, the two models are already being used interchangeably somewhere and that
  code needs finding first.
  ffdfsasdfasdfsd
