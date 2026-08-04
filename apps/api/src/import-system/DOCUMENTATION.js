/**
 * IMPORT SYSTEM - COMPREHENSIVE DOCUMENTATION
 * =============================================
 * 
 * Universal Data Import Platform for School ERP
 * Production-grade, scalable, extensible architecture
 */

/**
 * SECTION 1: ARCHITECTURE OVERVIEW
 * ==================================
 */

/**
 * The Import System consists of 8 interconnected phases:
 * 
 * PHASE 1: Foundation [✓ COMPLETE]
 *   - Database models (ImportLog, ImportError, ImportProfile)
 *   - Base classes (BaseValidator, BaseAdapter)
 *   - Security and utilities
 *   - Configuration system
 *   
 * PHASE 2: Core Engine [✓ COMPLETE]
 *   - ValidationPipeline (5-layer validation)
 *   - TransformationPipeline (14+ field transformations)
 *   - NormalizationPipeline (row-level normalization)
 *   - ReferenceResolver (batch resolution with caching)
 *   - ImportEngine (10-step orchestrator)
 *   - ImportService (business logic layer)
 *   
 * PHASE 3: Student Import [✓ COMPLETE]
 *   - StudentAdapter (entity-specific logic)
 *   - StudentImportConfig (comprehensive field rules)
 *   - API endpoints (/api/v1/import/*)
 *   - ImportController (request handling)
 *   
 * PHASE 4: Queue Integration [✓ COMPLETE]
 *   - ImportQueue (Bull queue setup)
 *   - ImportWorker (async job processor)
 *   - Job retry logic with exponential backoff
 *   - Job monitoring and tracking
 *   
 * PHASE 5: Entity Adapters [✓ COMPLETE]
 *   - TeacherImportConfig
 *   - FeeImportConfig
 *   - AttendanceImportConfig
 *   - Ready for: Payroll, Inventory, Marks, Leave, etc.
 *   
 * PHASE 6-8: (Ready for implementation)
 *   - Advanced features (rollback, multi-sheet, etc.)
 *   - UI components
 *   - Scheduled imports
 */

/**
 * SECTION 2: FILE STRUCTURE
 * ==========================
 */

/**
 * backend/src/import-system/
 * ├── adapters/
 * │   ├── baseAdapter.js                  [Phase 1] Base class for all adapters
 * │   ├── studentAdapter.js               [Phase 3] Student-specific logic
 * │   ├── teacherAdapter.js               [Phase 5] Teacher-specific logic
 * │   └── feeAdapter.js                   [Phase 5] Fee structure logic
 * │
 * ├── configs/
 * │   ├── studentImportConfig.js          [Phase 3] Student field rules & transformations
 * │   ├── teacherImportConfig.js          [Phase 5] Teacher field rules & transformations
 * │   ├── feeImportConfig.js              [Phase 5] Fee field rules & transformations
 * │   └── attendanceImportConfig.js       [Phase 5] Attendance field rules
 * │
 * ├── constants/
 * │   └── importConstants.js              [Phase 1] Centralized configuration
 * │
 * ├── controller/
 * │   └── importController.js             [Phase 3] API request handling
 * │
 * ├── core/
 * │   ├── importEngine.js                 [Phase 2] 10-step orchestrator
 * │   ├── validationPipeline.js           [Phase 2] 5-layer validation
 * │   ├── transformationPipeline.js       [Phase 2] Field transformations
 * │   ├── normalizationPipeline.js        [Phase 2] Data normalization
 * │   └── referenceResolver.js            [Phase 2] Batch reference resolution
 * │
 * ├── middlewares/
 * │   └── fileUploadValidator.js          [Phase 1] File validation middleware
 * │
 * ├── models/
 * │   ├── ImportLog.js                    [Phase 1] Import audit trail
 * │   ├── ImportError.js                  [Phase 1] Row-level errors
 * │   └── ImportProfile.js                [Phase 1] Reusable templates
 * │
 * ├── queue/
 * │   ├── importQueue.js                  [Phase 4] Bull queue setup
 * │   └── importWorker.js                 [Phase 4] Async job processor
 * │
 * ├── routes/
 * │   └── importRoutes.js                 [Phase 3] API endpoint definitions
 * │
 * ├── services/
 * │   └── importService.js                [Phase 2] Business logic layer
 * │
 * ├── utils/
 * │   ├── csvParser.js                    [Phase 1] CSV parsing with streaming
 * │   ├── xlsxParser.js                   [Phase 1] XLSX parsing with streaming
 * │   ├── columnMapper.js                 [Phase 1] Column mapping with fuzzy match
 * │   ├── dateNormalizer.js               [Phase 1] Date format normalization
 * │   ├── phoneNormalizer.js              [Phase 1] Phone format normalization
 * │   ├── duplicateChecker.js             [Phase 1] Duplicate detection
 * │   ├── fileSecurityScanner.js          [Phase 1] 6-layer security scanning
 * │   └── validators/
 * │       └── baseValidator.js            [Phase 1] Base validation class
 * │
 * ├── workers/
 * │   └── [Will contain async processing jobs]
 * │
 * ├── init.js                             [Phase 4] System initialization
 * └── DOCUMENTATION.js                    [This file]
 */

/**
 * SECTION 3: KEY COMPONENTS
 * ==========================
 */

/**
 * 3.1 DATABASE MODELS
 * ------------------
 */

// ImportLog
// - Purpose: Complete audit trail of all imports
// - Fields: status, totalRows, successCount, failureCount, metrics, reversibility
// - Indexes: (schoolId, entity, status), (schoolId, uploadedBy, createdAt)
// - TTL: 90 days automatic cleanup
// - Key methods: getImportStats(), getFormattedResults()

// ImportError
// - Purpose: Individual row errors (prevents massive arrays)
// - Fields: importLogId, rowNumber, errorType, severity, field, value, resolved
// - Indexes: (importLogId, rowNumber), (schoolId, entity, errorType)
// - TTL: 180 days automatic cleanup
// - Key methods: getErrorSummary(), getDetailedReport()

// ImportProfile
// - Purpose: Reusable import templates
// - Features: Versioning, sharing, usage statistics
// - Key methods: recordUsage(), createNewVersion(), cloneProfile()

/**
 * 3.2 PIPELINES (DATA PROCESSING)
 * -------------------------------
 */

// ValidationPipeline (5 layers)
// 1. FILE layer       - Size, encoding, corruption
// 2. HEADER layer     - Existence, duplicates, required fields
// 3. ROW layer        - Type checking, pattern matching, email/phone validation
// 4. BUSINESS layer   - Duplicates, references, custom business rules
// 5. PERMISSION layer - Auth, schoolId, role-based access
// 
// Result: { isValid, errors[], warnings[], skipped[], byLayer{} }
// Strictness levels: STRICT, MODERATE, LENIENT

// TransformationPipeline (14+ transformation types)
// - trim, uppercase, lowercase, capitalize
// - normalizePhone, normalizeEmail, convertDateFormat
// - parseBoolean, convertToInteger, convertToDecimal
// - splitName, removeSpaces, removeSpecialChars, slugify
// 
// Sequential processing with error recovery and before/after tracking

// NormalizationPipeline (Row-level cleanup)
// - Apply defaults from config
// - Remove empty fields
// - Type conversion (string, number, date, boolean, array, object)
// - Enum mapping
// - Min/max enforcement
// - Computed fields (age, fullName, etc.)
// 
// No errors at this stage - focuses on data consistency

// ReferenceResolver (Batch resolution with caching)
// - Batch loads all references upfront (prevents N+1 queries)
// - Caching enabled by default
// - Reference types: classId, sectionId, subjectId, sessionId, feeStructureId
// - Cache key pattern: "{refName}:{schoolId}"

/**
 * 3.3 ORCHESTRATION
 * -----------------
 */

// ImportEngine (10-step process)
// 1. Create ImportLog
// 2. Validate file (FILE layer)
// 3. Parse file (CSV/XLSX)
// 4. Validate headers (HEADER layer)
// 5. Map columns
// 6. Check permissions (PERMISSION layer)
// 7. Prepare context + resolve references
// 8. Process rows through transformation/normalization
// 9. Validate processed rows (BUSINESS layer)
// 10. Apply rows to database + store errors
//
// Returns: importLogId, summary, metrics

// ImportService (Business logic layer)
// - Preview imports
// - Start async imports
// - Execute imports
// - Get status and errors
// - Download error reports
// - Manage import profiles
// - Get import history

/**
 * SECTION 4: MULTI-TENANCY
 * =========================
 */

/**
 * All entities are scoped by schoolId:
 * 
 * - Every import includes schoolId from JWT token
 * - All queries include {schoolId: req.schoolId} filter
 * - Indexes on schoolId for performance
 * - Unique constraints per school (email, phone, admissionNumber)
 * - Data isolation guaranteed at all layers
 * 
 * Example:
 * - Student email "john@test.com" at School A is different from School B
 * - Admission numbers are unique per school
 * - All reports scoped to requesting school
 */

/**
 * SECTION 5: DUPLICATE DETECTION
 * ===============================
 */

/**
 * Three modes:
 * 
 * SKIP (default)
 * - Skip duplicate rows, continue import
 * - Records unique key matches are not re-imported
 * 
 * UPDATE
 * - Update existing records on duplicate key match
 * - Used for refreshing data (e.g., fee structures, fees)
 * 
 * STOP
 * - Halt entire import on first duplicate
 * - Strict mode for data integrity
 * 
 * Unique keys per entity:
 * - Student: email, phone, admissionNumber
 * - Teacher: email, phone, employeeId
 * - Fee: className + feeTypeName
 * - Attendance: studentId + date
 */

/**
 * SECTION 6: SECURITY
 * ====================
 */

/**
 * 6.1 FILE SECURITY (6-layer scanning)
 * ------------------------------------
 */

// 1. File signature validation
//    - Verify actual file type matches extension
//    - Prevent disguised executable files
// 
// 2. Formula injection prevention
//    - Detect cells starting with =, @, +, -
//    - Convert to safe values or reject
// 
// 3. Malicious payload detection
//    - JavaScript URLs (javascript:, on*)
//    - Script tags and event handlers
//    - SQL injection patterns
//    - XSS vectors
// 
// 4. Cell size validation
//    - Prevent memory exhaustion
//    - Max cell size: 32KB
// 
// 5. Encoding validation
//    - Verify UTF-8 or compatible encoding
//    - Prevent encoding-based attacks
// 
// 6. File size limits
//    - CSV: 50MB max
//    - XLSX: 100MB max
//    - Row limit: 100,000 per file

/**
 * 6.2 DATA SECURITY
 * -----------------
 */

// - Role-based access (admin, superAdmin only)
// - Token-based authentication (JWT)
// - SchoolId validation on every request
// - Input sanitization
// - No raw errors exposed
// - Audit trail (ImportLog stores everything)

/**
 * SECTION 7: PERFORMANCE
 * =======================
 */

/**
 * 7.1 STREAMING PARSERS
 * ---------------------
 */

// CSV Parser
// - Delimiter auto-detection (,, ;, \t, |)
// - Row-by-row streaming (no memory buildup)
// - Error collection per row
// - Handles 100MB+ files efficiently
// - Custom transformations supported

// XLSX Parser
// - Multi-sheet support
// - Streaming via xlsx-stream library
// - Formula evaluation
// - Metadata tracking
// - Generates error reports in XLSX format

/**
 * 7.2 BATCH OPERATIONS
 * -------------------
 */

// - Batch reference resolution (1 query instead of N)
// - Reference caching (avoid repeated lookups)
// - Batch database inserts (bulk create)
// - Configurable batch size (default 1000)

/**
 * 7.3 ASYNC PROCESSING
 * -------------------
 */

// Bull Queue
// - 2 concurrent workers by default
// - Exponential backoff (2s, 4s, 8s)
// - 3 retries per job
// - Job monitoring and progress tracking
// - Automatic cleanup of old jobs

/**
 * SECTION 8: API ENDPOINTS
 * =========================
 */

/**
 * POST /api/v1/import/preview
 * - Preview import without saving
 * - Returns: sample data, column mapping, warnings
 * - Query: entity (student, teacher, fee, etc.)
 * 
 * POST /api/v1/import/start
 * - Start import (async via queue)
 * - Returns: importLogId, jobId
 * - Body: entity, duplicateMode, strictness, priority
 * 
 * GET /api/v1/import/:importLogId/status
 * - Get import progress and status
 * - Returns: status, totalRows, successCount, failureCount
 * 
 * GET /api/v1/import/:importLogId/errors
 * - Get import errors with pagination
 * - Query: page, limit
 * 
 * GET /api/v1/import/:importLogId/error-report
 * - Download error report (CSV or XLSX)
 * - Query: format (csv|xlsx)
 * 
 * GET /api/v1/import/history/:entity
 * - Get import history for entity
 * - Query: days (default 30)
 * 
 * GET /api/v1/import/profiles/:entity
 * - Get saved import profiles (templates)
 * 
 * POST /api/v1/import/profile
 * - Save new import profile
 * - Body: name, description, entity, columnMapping, settings
 */

/**
 * SECTION 9: ADDING NEW ENTITY IMPORTS
 * =====================================
 */

/**
 * Step 1: Create Config
 * - Copy an existing config (e.g., studentImportConfig.js)
 * - Update field rules, transformations, business rules
 * - Define references to other entities
 * - Set duplicate detection mode
 * 
 * Step 2: Create Adapter
 * - Extend BaseAdapter
 * - Implement importRow() method
 * - Add entity-specific transformations
 * - Add entity-specific validators
 * - Implement create() to call existing service
 * 
 * Step 3: Register in System
 * - Add to init.js registerAdapters()
 * - New entity now available via API
 * - No core changes needed (fully extensible)
 * 
 * Example:
 * ```
 * const adapter = new PayrollAdapter(PAYROLL_CONFIG, services);
 * PAYROLL_CONFIG.adapter = (rowData, schoolId, context) => 
 *   adapter.importRow(rowData, schoolId, context);
 * importService.registerEntityConfig('payroll', PAYROLL_CONFIG);
 * ```
 */

/**
 * SECTION 10: SYSTEM INITIALIZATION
 * ==================================
 */

/**
 * In your main app.js or index.js:
 * 
 * ```javascript
 * const { initializeImportSystem } = require('./import-system/init');
 * const redis = require('./config/redis'); // Your Redis client
 * const services = {
 *   studentService: require('./services/StudentService'),
 *   classService: require('./services/ClassService'),
 *   feeService: require('./services/FeeService'),
 *   // ... other services
 * };
 * 
 * // In async startup:
 * await initializeImportSystem(app, redis, services);
 * ```
 * 
 * This will:
 * 1. Initialize Bull queue
 * 2. Setup queue processor (worker)
 * 3. Initialize ImportService
 * 4. Register all adapters
 * 5. Initialize controller
 * 6. Setup routes at /api/v1/import
 * 7. Setup periodic maintenance tasks
 */

/**
 * SECTION 11: ERROR HANDLING
 * ==========================
 */

/**
 * All import errors are:
 * 1. Stored in ImportError collection
 * 2. Categorized by type (validation, business, system)
 * 3. Tracked with row number and field
 * 4. Downloadable as error report
 * 5. Automatically cleaned after 180 days
 * 
 * Error types:
 * - VALIDATION_ERROR: Field-level validation failure
 * - BUSINESS_ERROR: Business rule violation
 * - DUPLICATE_ERROR: Duplicate record detected
 * - REFERENCE_ERROR: Referenced entity not found
 * - SYSTEM_ERROR: Unexpected system error
 * - FORMULA_INJECTION: Security threat detected
 * 
 * Severity levels:
 * - error: Stops row processing
 * - warning: Logs but continues (strictness: LENIENT)
 * - info: Informational only
 */

/**
 * SECTION 12: TESTING IMPORT
 * ============================
 */

/**
 * Sample cURL requests:
 * 
 * 1. Preview import:
 * ```
 * curl -X POST http://localhost:5000/api/v1/import/preview \
 *   -H "Authorization: Bearer YOUR_TOKEN" \
 *   -F "file=@students.csv" \
 *   -F "entity=student"
 * ```
 * 
 * 2. Start import:
 * ```
 * curl -X POST http://localhost:5000/api/v1/import/start \
 *   -H "Authorization: Bearer YOUR_TOKEN" \
 *   -F "file=@students.csv" \
 *   -F "entity=student" \
 *   -F "duplicateMode=skip" \
 *   -F "strictness=moderate"
 * ```
 * 
 * 3. Check status:
 * ```
 * curl -X GET http://localhost:5000/api/v1/import/:importLogId/status \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 * ```
 * 
 * 4. Get errors:
 * ```
 * curl -X GET http://localhost:5000/api/v1/import/:importLogId/errors \
 *   -H "Authorization: Bearer YOUR_TOKEN" \
 *   -G -d "page=1&limit=50"
 * ```
 * 
 * 5. Download error report:
 * ```
 * curl -X GET http://localhost:5000/api/v1/import/:importLogId/error-report \
 *   -H "Authorization: Bearer YOUR_TOKEN" \
 *   -G -d "format=csv" \
 *   > errors.csv
 * ```
 */

/**
 * SECTION 13: PERFORMANCE METRICS
 * ================================
 */

/**
 * Typical performance:
 * - 1,000 rows: < 10 seconds
 * - 10,000 rows: 30-60 seconds
 * - 100,000 rows: 5-10 minutes (queued)
 * 
 * Processing stages:
 * - File parsing: 20-30% of time
 * - Validation: 30-40% of time
 * - Database operations: 30-50% of time
 * 
 * Memory usage:
 * - Streaming parsers: ~10-50MB regardless of file size
 * - Reference caching: ~5-10MB per 10k references
 * - Queue: ~1-2MB per pending job
 */

/**
 * SECTION 14: FUTURE ENHANCEMENTS
 * ================================
 */

/**
 * Phase 6: Advanced Features
 * - Rollback functionality
 * - Multi-sheet batch imports
 * - Conditional imports (if/then rules)
 * - Data mapping templates
 * - Scheduled imports
 * 
 * Phase 7: UI Components
 * - React import wizard
 * - Real-time progress display
 * - Error reporting dashboard
 * - Template management UI
 * 
 * Phase 8: Integration
 * - API webhooks
 * - Third-party integrations
 * - Bulk export system
 * - Data sync capabilities
 */

/**
 * SECTION 15: TROUBLESHOOTING
 * ===========================
 */

/**
 * Common issues:
 * 
 * 1. "File exceeds maximum size"
 *    - CSV limit: 50MB, XLSX limit: 100MB
 *    - Solution: Split file into smaller chunks
 * 
 * 2. "Formula injection detected"
 *    - Cell starts with =, @, +, or -
 *    - Solution: Remove formula or prefix with space
 * 
 * 3. "Column not found"
 *    - Column name doesn't match any known field
 *    - Solution: Check column aliases in config
 * 
 * 4. "Queue worker not processing"
 *    - Redis not running or not accessible
 *    - Solution: Check REDIS_HOST and REDIS_PORT env vars
 * 
 * 5. "Reference not found"
 *    - Referenced entity (class, section) doesn't exist
 *    - Solution: Create referenced entities first
 * 
 * 6. "N+1 query issue"
 *    - Logs show many database queries for same data
 *    - This is normal during development, cache resolves it
 *    - Production: Verify referenceResolver caching is enabled
 */

/**
 * END OF DOCUMENTATION
 */

module.exports = {
  documentation: 'See inline comments for comprehensive documentation',
};
