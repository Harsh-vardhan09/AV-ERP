# UNIVERSAL DATA IMPORT & MIGRATION SYSTEM
## Enterprise Architecture & Implementation Plan

**Project**: School ERP - Multi-tenant Universal Import Platform  
**Version**: 1.0 (Production)  
**Date**: May 22, 2026  
**Architect**: Senior Backend Engineer  
**Classification**: Enterprise-Grade Infrastructure

---

## 📊 EXECUTIVE SUMMARY

This document defines the complete architecture, design, and implementation strategy for a **Universal, Scalable, Enterprise-Grade Data Import System** for a multi-tenant School ERP SaaS platform.

The system enables school administrators to independently import large volumes of data (students, teachers, fees, attendance, classes, etc.) without developer assistance, without corrupting existing data, and without breaking existing business logic.

**Key Principles**:
- ✅ Orchestration layer only (business logic stays in services)
- ✅ Config-driven, extensible architecture
- ✅ Zero breaking changes to existing APIs
- ✅ Full multi-tenant isolation and security
- ✅ Production-ready, enterprise-grade reliability
- ✅ Scalable to handle future entity types

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Frontend)                      │
│  - Entity Selection                                             │
│  - Template Download                                            │
│  - File Upload                                                  │
│  - Auto Column Mapping                                          │
│  - Preview + Errors                                             │
│  - Import Submission                                            │
│  - Progress Tracking                                            │
│  - Completion Report                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    API LAYER (/api/v1/import)                   │
│  GET    /template/:entity          ← Download template         │
│  POST   /validate                  ← Validate + Preview        │
│  POST   /start                     ← Queue import job          │
│  GET    /:jobId/status             ← Poll job status           │
│  GET    /:jobId/errors             ← Error report              │
│  GET    /history                   ← Import history            │
│  POST   /profiles                  ← Save mapping profile      │
│  GET    /profiles                  ← List saved profiles       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              CORE IMPORT ENGINE (importManager.js)              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. File Validation                                       │  │
│  │    - MIME type, size, formula injection                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. File Parsing (CSV/XLSX streaming)                    │  │
│  │    - Memory-efficient streaming parser                   │  │
│  │    - Handle large files                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Header Validation & Column Mapping                   │  │
│  │    - Detect headers                                      │  │
│  │    - Validate required columns                           │  │
│  │    - Apply user mappings                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Data Normalization & Transformation                  │  │
│  │    - Normalize dates, enums, strings                     │  │
│  │    - Apply transformations                               │  │
│  │    - Sanitize data                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Reference Resolution                                 │  │
│  │    - Class name → classId                                │  │
│  │    - Section name → sectionId                            │  │
│  │    - Teacher code → teacherId                            │  │
│  │    - Batch lookup (avoid N+1)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. Row Validation                                        │  │
│  │    - Type checks                                         │  │
│  │    - Required fields                                     │  │
│  │    - Format validation                                   │  │
│  │    - Enum validation                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 7. Business Validation                                  │  │
│  │    - Permission checks                                   │  │
│  │    - Cross-entity validation                             │  │
│  │    - Custom business rules                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 8. Duplicate Detection                                  │  │
│  │    - Identify duplicates by configured keys              │  │
│  │    - Apply mode: skip/update/stop                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 9. Preview Generation                                   │  │
│  │    - Show parsed rows                                    │  │
│  │    - Show validation errors                              │  │
│  │    - Valid/invalid counts                                │  │
│  │    - NO database insertion                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                      Preview Mode?
                    ↙ (Yes) ↖ (No)
                   │         │
              [Display      [Continue]
               Errors]       │
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│         ENTITY-SPECIFIC ADAPTERS                                 │
│                                                                  │
│  ├─ StudentAdapter        ← Uses existing registerStudent       │
│  ├─ TeacherAdapter        ← Uses existing registerTeacher       │
│  ├─ AttendanceAdapter     ← Uses Attendance.create()            │
│  ├─ FeesAdapter           ← Uses FeeStructure/StudentFee        │
│  ├─ ClassesAdapter        ← Uses ClassModel.create()            │
│  ├─ SectionsAdapter       ← Uses SectionModel.create()          │
│  ├─ SubjectsAdapter       ← Uses SubjectMaster.create()         │
│  └─ Future: DynamicAdapter ← Config-based processor             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              BULL QUEUE + REDIS (Background Processing)         │
│                                                                 │
│  Queue Job: BULK_IMPORT_{entityType}                           │
│  - jobId (tracking)                                            │
│  - importLogId (audit)                                         │
│  - rows (batch of 100-500)                                     │
│  - config (entity-specific)                                    │
│  - duplicateMode (skip/update/stop)                            │
│                                                                 │
│  Features:                                                     │
│  - Automatic retries (3x, exponential backoff)                │
│  - Progress tracking                                          │
│  - Resumable from failed chunk                                │
│  - Idempotent processing                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│               IMPORT WORKER (importWorker.js)                   │
│                                                                 │
│  For each chunk:                                              │
│  1. Get entity adapter                                         │
│  2. For each row:                                              │
│     - Transform via adapter                                    │
│     - Call existing service (createStudent, etc.)             │
│     - Track success/failure                                    │
│  3. Batch insert/update                                        │
│  4. Collect errors                                             │
│  5. Update progress                                            │
│  6. Update ImportLog                                           │
│  7. Handle failures gracefully                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              EXISTING BUSINESS SERVICES                         │
│                                                                 │
│  ✅ createStudent() via admissionController.registerStudent    │
│  ✅ updateStudent() via admissionController.updateStudentDetails│
│  ✅ createTeacher() via admissionController.registerTeacher    │
│  ✅ Attendance.create()                                        │
│  ✅ FeeStructure.create() / StudentFee.create()               │
│  ✅ Notification system (non-blocking)                        │
│  ✅ Fee auto-assignment (assignFeeToStudent)                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              IMPORT LOG & AUDIT SYSTEM                          │
│                                                                 │
│  ImportLog:                                                    │
│  - uploadedBy (userId)                                        │
│  - schoolId (multi-tenancy)                                   │
│  - entity (student/teacher/fees/etc)                          │
│  - fileName                                                    │
│  - totalRows, successCount, failureCount, skippedCount       │
│  - duplicateMode                                              │
│  - status (pending/processing/completed/failed)              │
│  - startedAt, completedAt, duration                          │
│  - errorFileUrl (downloadable CSV)                           │
│                                                                │
│  ImportError (separate collection):                           │
│  - importLogId (foreign key)                                  │
│  - rowNumber                                                  │
│  - field                                                      │
│  - value                                                      │
│  - errorMessage                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              ERROR REPORTING SYSTEM                             │
│                                                                 │
│  Generate downloadable reports:                               │
│  - CSV format                                                 │
│  - XLSX format                                                │
│                                                                │
│  Content:                                                     │
│  rowNumber | field | error | value | suggestion              │
│                                                                │
│  Allow users to:                                             │
│  - Download error report                                      │
│  - Fix errors                                                 │
│  - Re-upload corrected file                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 📁 FOLDER STRUCTURE

```
/backend/src/import-system/
│
├── core/
│   ├── importEngine.js          ← Main orchestration engine
│   ├── validationPipeline.js    ← Multi-stage validator
│   ├── transformationPipeline.js ← Data transformation
│   ├── normalizationPipeline.js ← Data normalization
│   └── referenceResolver.js     ← Reference lookup engine
│
├── adapters/                     ← Entity-specific handlers
│   ├── baseAdapter.js            ← Abstract base class
│   ├── studentAdapter.js
│   ├── teacherAdapter.js
│   ├── attendanceAdapter.js
│   ├── feesAdapter.js
│   ├── classAdapter.js
│   ├── sectionAdapter.js
│   ├── subjectAdapter.js
│   └── adapterRegistry.js        ← Factory pattern
│
├── configs/                      ← Entity-specific configs
│   ├── studentImportConfig.js
│   ├── teacherImportConfig.js
│   ├── attendanceImportConfig.js
│   ├── feesImportConfig.js
│   ├── classImportConfig.js
│   ├── sectionImportConfig.js
│   ├── subjectImportConfig.js
│   └── configRegistry.js         ← Config loader
│
├── validators/                   ← Validation modules
│   ├── baseValidator.js
│   ├── fileValidator.js
│   ├── headerValidator.js
│   ├── rowValidator.js
│   ├── businessValidator.js
│   └── duplicateDetector.js
│
├── processors/                   ← Data processing
│   ├── chunkProcessor.js
│   ├── templateGenerator.js
│   └── columnMapper.js
│
├── services/                     ← Business logic
│   ├── importService.js          ← API service layer
│   ├── importManager.js          ← Orchestration
│   ├── previewService.js         ← Preview generation
│   ├── duplicateHandlerService.js
│   ├── errorReportService.js
│   └── importProfileService.js   ← Save/load profiles
│
├── workers/                      ← Already exists
│   └── importWorker.js           ← NEW: Chunk processor
│
├── models/                       ← Database schemas
│   ├── ImportLog.js              ← Audit tracking
│   ├── ImportError.js            ← Error details
│   └── ImportProfile.js          ← Saved mappings
│
├── routes/                       ← API endpoints
│   └── importRoutes.js
│
├── middlewares/                  ← Custom middleware
│   ├── importAuth.js             ← Role check (admin/accounts)
│   └── fileUploadValidator.js    ← File security
│
├── utils/                        ← Utilities
│   ├── csvParser.js
│   ├── xlsxParser.js
│   ├── fileSecurityScanner.js
│   ├── columnMatcher.js
│   ├── dateNormalizer.js
│   ├── duplicateChecker.js
│   └── transactionHandler.js
│
├── constants/                    ← Constants
│   ├── importConstants.js
│   ├── validationRules.js
│   └── duplicateModes.js
│
├── queues/                       ← Queue config
│   └── importQueue.js
│
├── templates/                    ← Generated templates
│   └── (dynamic generation)
│
└── reports/                      ← Error reports
    └── (dynamic generation)
```

---

## 🔄 DATA FLOW (Detailed)

### 1. TEMPLATE DOWNLOAD
```
Client: GET /api/v1/import/template/student?session=25-26
  ↓
importService.generateTemplate('student', params)
  ↓
Check entity config exists
Check user permissions
Get reference data (classes, sessions, sections)
Generate XLSX with:
  - Headers (from config)
  - Required field markers (*)
  - Sample data (2-3 rows)
  - Data validations (dropdowns if possible)
  - Help text/descriptions
  ↓
Stream XLSX to client
```

### 2. FILE UPLOAD & VALIDATION
```
Client: POST /api/v1/import/validate
  - file (multipart)
  - entity (student/teacher/etc)
  - duplicateMode (skip/update/stop)
  - importProfileId? (optional saved mapping)
  ↓
fileValidator.validateFile(file)
  - Check MIME type (application/vnd.openxmlformats, text/csv)
  - Check file size (max 100MB for XLSX, 50MB for CSV)
  - Check formula injection (scan for =, @, +, - at start)
  - Create temporary file/buffer
  ↓
Parse file (CSV or XLSX)
  - Use streaming parser for large files
  - Read headers
  - Sample first 100 rows for preview
  ↓
headerValidator.validateHeaders(headers, config)
  - Check required headers present
  - Check for duplicate headers
  - Return column mapping
  ↓
Apply user's saved import profile (if provided)
  - Override column mapping
  - Apply custom transformations
  ↓
normalizationPipeline.normalize(rows, config)
  - Normalize dates (DD/MM/YYYY → ISO)
  - Normalize enums (M/male/Male → male)
  - Trim strings, uppercase codes
  - Handle null/empty values
  ↓
transformationPipeline.transform(rows, config)
  - Apply field-level transformations
  - Concatenate fields if needed
  - Apply custom transforms
  ↓
referenceResolver.resolve(rows, config)
  - Batch lookup classes by name
  - Batch lookup sections by name
  - Batch lookup subjects by code
  - Store resolved IDs
  - Flag unresolved as errors
  ↓
rowValidator.validateRows(rows, config)
  - Type checking
  - Length validation
  - Required fields
  - Enum validation
  - Format validation (email, phone, date)
  ↓
businessValidator.validateBusiness(rows, schoolId, config)
  - Session exists and active
  - Class belongs to school
  - Email not already in school (if not updating)
  - Custom business rules
  ↓
duplicateDetector.detectDuplicates(rows, config, mode)
  - Compare rows against existing DB
  - Compare rows within batch (same import)
  - Apply duplicate handling mode:
    - SKIP: Skip duplicate rows
    - UPDATE: Mark for update (if unique key found)
    - STOP: Mark error, halt import
  ↓
Return preview response:
{
  success: true,
  preview: {
    totalRows: 500,
    validRows: 485,
    invalidRows: 15,
    duplicateRows: 0,
    warnings: 5,
    sampleRows: [...],
    errors: [
      { rowNumber: 5, field: 'email', error: 'Invalid format', value: 'not-an-email' },
      ...
    ]
  }
}
```

### 3. IMPORT START
```
Client: POST /api/v1/import/start
  - entity
  - fileName
  - duplicateMode
  - importProfileId?
  - dryRun? (false = real import, true = validate only)
  ↓
Create ImportLog record
  {
    uploadedBy: req.user._id,
    schoolId: req.schoolId,
    entity,
    fileName,
    totalRows: rows.length,
    status: 'pending',
    startedAt: now,
    duplicateMode
  }
  ↓
If dryRun = true:
  - Run validation only
  - Update ImportLog.status = 'completed_dry_run'
  - Return validation results (no DB changes)
  ↓
If dryRun = false:
  - Chunk rows into batches (100-500 per chunk)
  - For each chunk: Queue BULK_IMPORT_{entity} job
  - Each job has { importLogId, chunk, config, duplicateMode }
  - Update ImportLog.status = 'processing'
  - Return { jobId, importLogId } for polling
```

### 4. BACKGROUND PROCESSING (importWorker.js)
```
Bull Queue: BULK_IMPORT_STUDENT job
  - jobId: UUID
  - data: { importLogId, chunk: [row1, row2, ...], config, duplicateMode }
  ↓
For each row in chunk:
  ├─ Get adapter for entity (StudentAdapter)
  ├─ Call adapter.transform(row) → normalized data
  ├─ Call adapter.validate(data) → throws if invalid
  ├─ Call adapter.process(data, existingRecord?) → call registerStudent or updateStudent
  ├─ On success:
  │   └─ Increment successCount
  │   └─ Log entry in ImportLog
  ├─ On duplicate (if UPDATE mode):
  │   └─ Call adapter.update(existing, data)
  │   └─ Increment updateCount
  └─ On error:
      ├─ Create ImportError document
      ├─ Increment failureCount
      ├─ Add to error array (for download later)
      └─ Decide: continue or halt based on config
  ↓
Update ImportLog:
  - Increment processedRows
  - Add errors to ImportLog.errors[]
  - Update progress %
  ↓
If this is last chunk:
  - Calculate final stats
  - Generate error report (CSV/XLSX)
  - Update ImportLog.status = 'completed'
  - Update ImportLog.completedAt, duration
  - Emit socket event for real-time update
  ↓
Return job result:
  {
    success: true,
    stats: { totalRows, processedRows, successCount, failureCount, duplicateCount }
  }
```

---

## 🔐 SECURITY STRATEGY

### File Security
- **MIME Validation**: Only application/vnd.openxmlformats, text/csv, text/plain
- **File Size Limits**:
  - CSV: 50 MB max
  - XLSX: 100 MB max
  - Row limit: 100,000 rows per import
- **Formula Injection Protection**: Scan for `=`, `@`, `+`, `-` at cell start
- **Streaming Parser**: Never load entire file into memory
- **Malicious Payload Scanning**: Check for script tags, SQL, MongoDB operators

### Data Security
- **Multi-tenancy Enforcement**:
  - All records filtered by req.schoolId
  - Imported data always tagged with schoolId
  - No cross-school data access possible
- **Input Validation**: All fields validated before use
- **SQL/NoSQL Injection**: Mongoose sanitization, mongoSanitize middleware
- **Rate Limiting**: Import API rate-limited per school
- **Permission Checks**: Only admin/accounts roles can import

### Audit Trail
- **ImportLog**: Every import tracked with user, timestamp, counts
- **ImportError**: Every error logged with row, field, value, message
- **Change Audit**: Can trace all imports back to user
- **Rollback Capability**: Can delete import by importLogId (future enhancement)

---

## 🔄 DUPLICATE HANDLING MODES

### Mode 1: SKIP
- **Behavior**: If duplicate found, skip row, continue import
- **Use Case**: Uploading same file multiple times
- **Detection Keys** (configurable):
  - Student: admissionNumber, email, rollNo per class+section
  - Teacher: employeeId, email
  - Attendance: (classId, sectionId, date, studentId, status)
- **Result**: Dupes skipped, successCount unaffected

### Mode 2: UPDATE
- **Behavior**: If duplicate found, update existing record
- **Use Case**: Bulk updating student information
- **Process**:
  1. Find existing by unique key
  2. Call adapter.update(existing, newData)
  3. Increment updateCount (separate from successCount)
- **Safety**: Only updates whitelisted fields, never deletes
- **Result**: Changed records tracked separately

### Mode 3: STOP_IMPORT
- **Behavior**: If duplicate found, halt entire import
- **Use Case**: Strict no-duplicates requirement
- **Process**:
  1. Find duplicate
  2. Add to errors
  3. Set ImportLog.status = 'failed'
  4. Stop processing remaining rows
- **Result**: All rows skipped until duplicate resolved

---

## 🎯 VALIDATION LAYERS

### Layer 1: File Validation
- ✓ MIME type correct
- ✓ File not corrupted
- ✓ File size within limits
- ✓ No formula injection
- ✓ Can be parsed

### Layer 2: Header Validation
- ✓ Required headers present
- ✓ No duplicate headers
- ✓ Header names recognized or mappable
- ✓ Column order flexible

### Layer 3: Row Validation
- ✓ Required fields not empty
- ✓ Data types correct (string, number, date, enum)
- ✓ Field length within limits
- ✓ Format validation (email, phone, date)
- ✓ Enum values valid

### Layer 4: Business Validation
- ✓ Reference entities exist (class, section, session)
- ✓ Permission checks (user can import)
- ✓ Cross-entity consistency
- ✓ Business rules (no duplicate emails in school)
- ✓ Data integrity constraints

---

## 📊 IMPORT LOG MODEL

```javascript
ImportLog {
  _id: ObjectId,
  uploadedBy: UserId (indexed),
  schoolId: SchoolId (indexed),
  entity: 'student'|'teacher'|'fees'|'attendance'|etc,
  fileName: 'students_batch_1.xlsx',
  
  // Counts
  totalRows: 1500,
  processedRows: 1200,
  successCount: 1180,
  failureCount: 15,
  skippedCount: 5,
  updateCount: 0,
  
  // Configuration
  duplicateMode: 'skip'|'update'|'stop',
  importProfileId?: ImportProfileId,
  columnMapping?: { excelCol: 'fieldName', ... },
  
  // Status & Tracking
  status: 'pending'|'processing'|'completed'|'failed'|'cancelled',
  startedAt: Date,
  completedAt?: Date,
  duration?: Number (ms),
  lastUpdated: Date,
  
  // Error Tracking
  errorCount: 15,
  errorFileUrl?: 'https://s3.../error_report_2025_03_30.csv',
  errors?: [{ rowNumber, field, error, value }],  // First 100 only
  
  // Metadata
  metadata?: { customField: 'value' },
  tags?: ['batch_import', 'students_2025-26'],
  
  timestamps: true
}
```

---

## 🚀 PHASE-WISE IMPLEMENTATION

### Phase 1: Foundation (Days 1-2)
- [ ] Create folder structure
- [ ] ImportLog + ImportError + ImportProfile models
- [ ] Base validator + base adapter architecture
- [ ] File upload middleware (security)
- [ ] CSV/XLSX parser utilities
- [ ] Reference resolver framework

### Phase 2: Core Engine (Days 3-4)
- [ ] Validation pipeline (5 layers)
- [ ] Normalization pipeline
- [ ] Transformation pipeline
- [ ] Duplicate detector
- [ ] Config registry system
- [ ] Template generator

### Phase 3: Student Import (Days 5-6)
- [ ] Student import config
- [ ] Student adapter (reuse registerStudent)
- [ ] Preview service
- [ ] Error report service
- [ ] API endpoints (template, validate, start)

### Phase 4: Queue Integration (Day 7)
- [ ] Import worker setup
- [ ] Chunk processor
- [ ] Job progress tracking
- [ ] Status polling endpoints
- [ ] Error handling in worker

### Phase 5: Advanced Features (Days 8-9)
- [ ] Import profiles (save/load mappings)
- [ ] Teacher import
- [ ] Fees import
- [ ] Attendance import
- [ ] History endpoints

### Phase 6: Optimization (Days 10-11)
- [ ] Performance tuning
- [ ] Batch DB operations
- [ ] Caching for reference data
- [ ] Memory profiling
- [ ] Load testing

### Phase 7: Frontend Integration (Days 12-13)
- [ ] Import UI components
- [ ] File upload form
- [ ] Column mapping interface
- [ ] Preview table
- [ ] Error display
- [ ] Progress bar
- [ ] Download error report

### Phase 8: Testing & Documentation (Days 14-15)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E import scenarios
- [ ] Large file testing
- [ ] Documentation
- [ ] Deployment guide

---

## ✅ NON-NEGOTIABLE REQUIREMENTS

1. **Backward Compatibility**: ZERO changes to existing APIs
2. **Business Logic Reuse**: ALL existing services called, never bypassed
3. **Multi-tenancy Safety**: Every operation scoped to schoolId
4. **Auditability**: Complete import trail stored
5. **No Data Corruption**: Transactional safety, rollback on error
6. **Extensibility**: Config-driven, easy to add new entities
7. **Security**: Input validation, permission checks, rate limiting
8. **Performance**: Handle 100K+ row imports, streaming parsers
9. **Reliability**: Retry logic, error handling, graceful failures
10. **User Experience**: Simple, self-service, no developer needed

---

## 🎓 NEXT STEPS

1. ✅ Complete architecture review (this document)
2. ⏳ Implement Phase 1: Foundation
3. ⏳ Implement Phase 2: Core Engine
4. ⏳ Implement Phase 3: Student Import
5. ⏳ Full system testing
6. ⏳ Deployment to production

---

**Status**: Architecture Complete | Ready for Implementation

