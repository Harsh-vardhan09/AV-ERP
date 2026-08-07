# Import system

Universal bulk-data import for the school ERP: CSV/XLSX upload, validation, transformation
and persistence, with an optional Bull queue for large files.

Converted from `import-system/DOCUMENTATION.js`, which was prose in a `.js` file. The
file-structure and status claims below have been corrected against the code — see
[Accuracy notes](#accuracy-notes) for what the original asserted that is not true.

Module lives at `apps/api/src/modules/imports/`. Supporting docs (delivery report, file
manifest, setup guide) are in [`docs/import-system/`](./import-system/).

---

## Architecture overview

The system was built in phases:

| Phase | Scope |
|---|---|
| 1 | Models (`ImportLog`, `ImportError`, `ImportProfile`), base classes, security, config |
| 2 | `ValidationPipeline`, `TransformationPipeline`, `NormalizationPipeline`, `ReferenceResolver`, `ImportEngine`, `ImportService` |
| 3 | `StudentAdapter`, `studentImportConfig`, `/api/v1/import/*`, `ImportController` |
| 4 | `ImportQueue` (Bull), `ImportWorker`, retry with exponential backoff |
| 5 | `teacherImportConfig`, `feeImportConfig`, `attendanceImportConfig` |
| 6–8 | Not implemented — rollback, multi-sheet, UI components, scheduled imports |

---

## File structure

```
apps/api/src/modules/imports/
├── adapters/
│   ├── baseAdapter.js              base class for all adapters
│   ├── studentAdapter.js           student-specific logic
│   └── teacherAdapter.js           teacher-specific logic
├── configs/
│   ├── studentImportConfig.js      field rules & transformations
│   ├── teacherImportConfig.js
│   ├── feeImportConfig.js          no adapter — see Accuracy notes
│   └── attendanceImportConfig.js   no adapter — see Accuracy notes
├── constants/
│   └── importConstants.js          centralised configuration
├── controller/
│   └── importController.js         API request handling
├── core/
│   ├── importEngine.js             10-step orchestrator
│   ├── validationPipeline.js       5-layer validation
│   ├── transformationPipeline.js   field transformations
│   ├── normalizationPipeline.js    row-level normalisation
│   └── referenceResolver.js        batch reference resolution
├── middlewares/
│   └── fileUploadValidator.js
├── models/
│   ├── ImportLog.js                import audit trail
│   ├── ImportError.js              row-level errors
│   └── ImportProfile.js            reusable templates
├── queue/
│   ├── importQueue.js              wraps core/queue/factory
│   └── importWorker.js             async job processor
├── routes/
│   └── importRoutes.js
├── services/
│   └── importService.js            business logic layer
├── utils/
│   ├── csvParser.js                streaming CSV
│   ├── xlsxParser.js               streaming XLSX
│   ├── columnMapper.js             fuzzy column matching
│   ├── dateNormalizer.js
│   ├── phoneNormalizer.js
│   ├── duplicateChecker.js
│   └── fileSecurityScanner.js      6-layer security scan
├── validators/
│   └── baseValidator.js
├── init.js                         system initialisation — currently unused
├── module.js / index.js / permissions.js
```

---

## Key components

### Database models

**ImportLog** — complete audit trail of every import.
Fields: `status`, `totalRows`, `successCount`, `failureCount`, metrics, reversibility.
Indexes: `(schoolId, entity, status)`, `(schoolId, uploadedBy, createdAt)`. TTL 90 days.
Methods: `getImportStats()`, `getFormattedResults()`.

**ImportError** — one document per failing row, so a bad file cannot produce a massive array.
Fields: `importLogId`, `rowNumber`, `errorType`, `severity`, `field`, `value`, `resolved`.
Indexes: `(importLogId, rowNumber)`, `(schoolId, entity, errorType)`. TTL 180 days.
Methods: `getErrorSummary()`, `getDetailedReport()`.

**ImportProfile** — reusable import templates with versioning, sharing and usage stats.
Methods: `recordUsage()`, `createNewVersion()`, `cloneProfile()`.

### Pipelines

**ValidationPipeline — 5 layers**

1. **FILE** — size, encoding, corruption
2. **HEADER** — existence, duplicates, required fields
3. **ROW** — type checking, pattern matching, email/phone validation
4. **BUSINESS** — duplicates, references, custom business rules
5. **PERMISSION** — auth, `schoolId`, role-based access

Result: `{ isValid, errors[], warnings[], skipped[], byLayer{} }`.
Strictness levels: `STRICT`, `MODERATE`, `LENIENT`.

**TransformationPipeline** — 14+ transformation types, applied sequentially with error
recovery and before/after tracking: `trim`, `uppercase`, `lowercase`, `capitalize`,
`normalizePhone`, `normalizeEmail`, `convertDateFormat`, `parseBoolean`, `convertToInteger`,
`convertToDecimal`, `splitName`, `removeSpaces`, `removeSpecialChars`, `slugify`.

**NormalizationPipeline** — row-level cleanup: apply config defaults, drop empty fields,
type conversion, enum mapping, min/max enforcement, computed fields (age, fullName).
Produces no errors — it exists purely for data consistency.

**ReferenceResolver** — batch-loads all references upfront to avoid N+1 queries, caching on
by default. Resolves `classId`, `sectionId`, `subjectId`, `sessionId`, `feeStructureId`.
Cache key pattern: `{refName}:{schoolId}`.

### Orchestration

**ImportEngine** — 10 steps: create ImportLog → validate file → parse → validate headers →
map columns → check permissions → resolve references → transform/normalise rows →
validate rows → apply to database and store errors. Returns `importLogId`, summary, metrics.

**ImportService** — preview, start async, execute, status, errors, error reports,
profile management, history.

---

## Multi-tenancy

Every entity is scoped by `schoolId`:

- `schoolId` comes from the JWT on every import
- every query filters on `{ schoolId: req.schoolId }`
- indexes on `schoolId`
- unique constraints are per school — email, phone and admission number
- isolation holds at all layers

A student email is distinct between School A and School B; admission numbers are unique per
school; all reports are scoped to the requesting school.

---

## Duplicate detection

| Mode | Behaviour |
|---|---|
| `SKIP` (default) | Skip duplicate rows, continue the import |
| `UPDATE` | Update the existing record on a key match — used for refreshing fee structures |
| `STOP` | Halt the whole import on the first duplicate |

Unique keys per entity: student `email`/`phone`/`admissionNumber`; teacher
`email`/`phone`/`employeeId`; fee `className + feeTypeName`; attendance `studentId + date`.

---

## Security

### File security — 6-layer scan

1. **File signature validation** — verify the real file type matches the extension, so a
   disguised executable is rejected.
2. **Formula injection prevention** — detect cells starting with `=`, `@`, `+` or `-` and
   either neutralise or reject them.
3. **Malicious payload detection** — `javascript:` URLs, `on*` handlers, script tags,
   SQL injection patterns, XSS vectors.
4. **Cell size validation** — max 32KB per cell, to prevent memory exhaustion.
5. **Encoding validation** — require UTF-8 or compatible, to block encoding-based attacks.
6. **File size limits** — CSV 50MB, XLSX 100MB, 100,000 rows per file.

### Data security

Role-based access, JWT authentication, `schoolId` validation on every request, input
sanitisation, no raw errors returned to the client, and a full audit trail in `ImportLog`.

---

## Performance

**Streaming parsers.** CSV: delimiter auto-detection (`,` `;` `\t` `|`), row-by-row
streaming, per-row error collection. XLSX: multi-sheet, streaming, formula evaluation,
metadata tracking, XLSX error reports.

**Batch operations.** Batch reference resolution (one query instead of N), reference
caching, bulk inserts, configurable batch size (default 1000).

**Async processing.** Bull queue, 2 concurrent workers, exponential backoff, 3 retries,
progress tracking, automatic cleanup of old jobs.

Typical throughput: 1,000 rows under 10s; 10,000 rows 30–60s; 100,000 rows 5–10 min
(queued). Time splits roughly 20–30% parsing, 30–40% validation, 30–50% database.
Memory: streaming parsers stay at ~10–50MB regardless of file size.

---

## API endpoints

All under `/api/v1/import`, all requiring a JWT; every route below `varifyToken` is
`admin` or `admission` only.

| Method | Path | Purpose |
|---|---|---|
| POST | `/preview` | Preview an import without saving. Returns sample data, column mapping, warnings |
| POST | `/start` | Start an import. Returns `importLogId`, `jobId` |
| GET | `/:importLogId/status` | Progress and status |
| GET | `/:importLogId/errors` | Errors, paginated (`page`, `limit`) |
| GET | `/:importLogId/error-report` | Download error report (`format=csv\|xlsx`) |
| GET | `/history/:entity` | Import history (`days`, default 30) |
| GET | `/profiles/:entity` | Saved import profiles |
| POST | `/profile` | Save a new import profile |

---

## Adding a new entity import

1. **Create a config** — copy an existing one such as `studentImportConfig.js`; set field
   rules, transformations, business rules, references and duplicate mode.
2. **Create an adapter** — extend `BaseAdapter`, implement `importRow()`, add
   entity-specific transformations and validators.
3. **Register it** — in `controller/importController.js`, which is where the live
   registration happens.

```js
const adapter = new PayrollAdapter(PAYROLL_CONFIG, services);
PAYROLL_CONFIG.adapter = (rowData, schoolId, context) =>
  adapter.importRow(rowData, schoolId, context);
importService.registerEntityConfig('payroll', PAYROLL_CONFIG);
```

---

## Error handling

Every error is stored in `ImportError`, categorised, tracked with row number and field,
downloadable as a report, and cleaned up after 180 days.

Types: `VALIDATION_ERROR`, `BUSINESS_ERROR`, `DUPLICATE_ERROR`, `REFERENCE_ERROR`,
`SYSTEM_ERROR`, `FORMULA_INJECTION`.

Severity: `error` stops the row; `warning` logs and continues under `LENIENT` strictness;
`info` is informational.

---

## Testing

```bash
# preview
curl -X POST http://localhost:4000/api/v1/import/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@students.csv" -F "entity=student"

# start
curl -X POST http://localhost:4000/api/v1/import/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@students.csv" -F "entity=student" \
  -F "duplicateMode=skip" -F "strictness=moderate"

# status
curl -X GET http://localhost:4000/api/v1/import/IMPORT_LOG_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# errors
curl -X GET http://localhost:4000/api/v1/import/IMPORT_LOG_ID/errors \
  -H "Authorization: Bearer YOUR_TOKEN" -G -d "page=1&limit=50"

# error report
curl -X GET http://localhost:4000/api/v1/import/IMPORT_LOG_ID/error-report \
  -H "Authorization: Bearer YOUR_TOKEN" -G -d "format=csv" > errors.csv
```

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| File exceeds maximum size | CSV 50MB, XLSX 100MB — split the file |
| Formula injection detected | Cell starts with `=`, `@`, `+` or `-` — remove it or prefix a space |
| Column not found | Column name matches no known field — check the aliases in the config |
| Queue worker not processing | Redis unreachable — check `REDIS_URL` / `REDIS_DISABLED` |
| Reference not found | The referenced class or section does not exist — create it first |

---

## Accuracy notes

The original `DOCUMENTATION.js` asserted several things that are not true of the code:

- It listed `adapters/feeAdapter.js`. **No such file exists.** `feeImportConfig.js` and
  `attendanceImportConfig.js` have configs but **no adapter**, so neither entity can
  actually be imported.
- It listed a `workers/` directory and placed `validators/` under `utils/`. Neither is
  true — `validators/` is top level and there is no `workers/`.
- Section 10 documented booting the system via `initializeImportSystem(app, redis, services)`
  from `init.js`. **Nothing calls it.** `app.js` mounts `routes/importRoutes.js` directly,
  which builds its own `ImportController`. `init.js` is currently dead code.
- Because nothing calls `init.js`, `app.locals.importQueue` is never set, so
  `ImportService` always takes its synchronous path regardless of Redis.
- Troubleshooting referred to `REDIS_HOST`/`REDIS_PORT`; the queue factory keys off
  `REDIS_URL` and `REDIS_DISABLED`. Corrected above.
