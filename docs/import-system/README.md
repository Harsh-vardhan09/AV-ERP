# Universal Data Import System - README

> **Production-Grade, Scalable, Enterprise-Ready Import Platform**

## Quick Start

### Installation

```bash
# Install dependencies
npm install bull redis xlsx fast-csv

# Set environment variables
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Basic Usage

```javascript
// In your app.js
const { initializeImportSystem } = require('./import-system/init');
const redis = require('redis').createClient();

const services = {
  studentService: require('./services/StudentService'),
  classService: require('./services/ClassService'),
  feeService: require('./services/FeeService'),
};

// Initialize in async startup
await initializeImportSystem(app, redis, services);

// API now available at /api/v1/import/*
```

## API Endpoints

### 1. Preview Import
```http
POST /api/v1/import/preview
Content-Type: multipart/form-data

Parameters:
  - file: CSV or XLSX file
  - entity: 'student' | 'teacher' | 'fee' | 'attendance'

Response:
{
  "success": true,
  "preview": {
    "totalRows": 100,
    "headers": ["firstName", "lastName", "email"],
    "columnMapping": { "firstName": "First Name", ... },
    "sampleData": [...]
  }
}
```

### 2. Start Import
```http
POST /api/v1/import/start
Content-Type: multipart/form-data

Parameters:
  - file: CSV or XLSX file
  - entity: entity type
  - duplicateMode: 'skip' | 'update' | 'stop' (optional)
  - strictness: 'strict' | 'moderate' | 'lenient' (optional)

Response:
{
  "success": true,
  "importLogId": "507f1f77bcf86cd799439011",
  "jobId": "507f1f77bcf86cd799439011",
  "message": "Import queued for processing"
}
```

### 3. Get Status
```http
GET /api/v1/import/:importLogId/status

Response:
{
  "success": true,
  "status": "completed",
  "entity": "student",
  "totalRows": 100,
  "results": {
    "success": 95,
    "failure": 3,
    "skipped": 2
  },
  "duration": 15000,
  "metrics": {
    "avgProcessingTimePerRow": 150,
    "rowsPerSecond": "6.67",
    "errorRate": "3.00"
  }
}
```

### 4. Get Errors
```http
GET /api/v1/import/:importLogId/errors?page=1&limit=50

Response:
{
  "success": true,
  "errors": [
    {
      "rowNumber": 5,
      "field": "email",
      "errorType": "VALIDATION_ERROR",
      "errorMessage": "Email format is invalid",
      "value": "invalid-email",
      "severity": "error"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "pages": 1
  }
}
```

### 5. Download Error Report
```http
GET /api/v1/import/:importLogId/error-report?format=csv

Returns: CSV or XLSX file with all errors
```

### 6. Import History
```http
GET /api/v1/import/history/:entity?days=30

Response:
{
  "success": true,
  "imports": [
    {
      "importLogId": "...",
      "fileName": "students.csv",
      "status": "completed",
      "totalRows": 100,
      "successCount": 95,
      "failureCount": 3,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "stats": {
    "totalImports": 45,
    "successRate": 94.5,
    "avgRowsPerImport": 250
  }
}
```

## Supported File Formats

- **CSV**: Delimiters auto-detected (,, ;, \t, |)
- **XLSX**: All sheets supported
- **Max size**: 50MB (CSV), 100MB (XLSX)
- **Max rows**: 100,000 per file
- **Max columns**: Unlimited

## Data Types

| Type | Validation | Example |
|------|-----------|---------|
| STRING | Length, pattern | "John Doe" |
| EMAIL | Email format | "john@example.com" |
| PHONE | Phone format | "9876543210" |
| NUMBER | Min/max range | 1000, 99.99 |
| DATE | ISO 8601 or custom | "2024-01-15" |
| ENUM | Predefined values | "Male", "Female" |
| BOOLEAN | true/false, yes/no | "true", "yes" |

## Supported Entities

### Student
**Fields**: firstName, lastName, email, phone, dateOfBirth, gender, classId, sectionId, session
- Auto-generate: admissionNumber, studentId, rollNo, password (from DOB)
- Auto-assign: Fees based on class

### Teacher
**Fields**: firstName, lastName, email, phone, qualifications, designation, department, experience
- Auto-generate: employeeId
- Validate: Experience vs age

### Fee
**Fields**: className, feeTypeName, amount, dueDate, lateFeePercentage
- Update mode: Updates existing fees for class

### Attendance
**Fields**: studentId, date, status, remarks
- Status values: present, absent, leave, half-day
- Strict validation

## Duplicate Detection Modes

### SKIP (Default)
- Skips duplicate rows
- Continues processing remaining rows
- Best for: Initial data load

### UPDATE
- Updates existing records on match
- Useful for refreshing data
- Best for: Fee structures, existing data updates

### STOP
- Halts import on first duplicate
- Best for: Critical data requiring manual review

## Validation Strictness Levels

### STRICT
- Fails on any validation error
- Best for: Critical data

### MODERATE (Default)
- Fails on errors, allows some warnings
- Best for: Most scenarios

### LENIENT
- Allows warnings, processes all valid rows
- Best for: Initial bulk loads

## Error Handling

All errors are:
1. **Logged**: Stored in ImportError collection
2. **Tracked**: Row number and field identified
3. **Categorized**: Type and severity assigned
4. **Downloadable**: Export as CSV/XLSX
5. **Retained**: 180 days for audit trail

### Error Types
- `VALIDATION_ERROR`: Field-level validation
- `BUSINESS_ERROR`: Business rule violation
- `DUPLICATE_ERROR`: Duplicate record
- `REFERENCE_ERROR`: Foreign key not found
- `FORMULA_INJECTION`: Security threat
- `SYSTEM_ERROR`: Unexpected error

## Security Features

✓ **6-Layer Security Scanning**
- File signature validation
- Formula injection prevention
- Malicious payload detection
- Cell size limits
- Encoding validation
- File size limits

✓ **Multi-Tenancy**
- All data scoped to schoolId
- Complete data isolation
- Role-based access (admin/superAdmin only)

✓ **Audit Trail**
- Every import logged
- All errors recorded
- User tracking
- Timestamp tracking

## Performance

| Size | Time | Memory |
|------|------|--------|
| 1K rows | < 5s | ~20MB |
| 10K rows | 30-60s | ~30MB |
| 100K rows | 5-10m | ~50MB |

**Key Features**:
- Streaming parsers (no memory buildup)
- Batch reference resolution (no N+1 queries)
- Queue processing (background workers)
- Configurable batch sizes

## Configuration

### Student Import Config Example
```javascript
const STUDENT_IMPORT_CONFIG = {
  entity: 'student',
  requiredFields: ['firstName', 'lastName', 'classId'],
  fieldRules: {
    firstName: { required: true, minLength: 2, maxLength: 100 },
    email: { type: 'email', email: true },
  },
  transformationRules: {
    firstName: { transformations: ['trim', 'capitalize'] },
  },
  businessRules: {
    uniqueKeys: ['email', 'phone', 'admissionNumber'],
  },
};
```

## Adding Custom Entities

### Step 1: Create Config
```javascript
// Create configs/myEntityImportConfig.js
module.exports = {
  entity: 'myEntity',
  requiredFields: [...],
  fieldRules: {...},
  // ... all required fields
};
```

### Step 2: Create Adapter
```javascript
// Create adapters/myEntityAdapter.js
class MyEntityAdapter extends BaseAdapter {
  async importRow(rowData, schoolId, context) {
    // Your import logic
    return { success: true, id: entityId };
  }
}
```

### Step 3: Register
```javascript
// In init.js registerAdapters()
const adapter = new MyEntityAdapter(CONFIG, services);
CONFIG.adapter = (row, schoolId, ctx) => adapter.importRow(row, schoolId, ctx);
importService.registerEntityConfig('myEntity', CONFIG);
```

## Troubleshooting

### Issue: Queue not processing
**Solution**: Verify Redis is running
```bash
redis-cli ping  # Should return PONG
```

### Issue: Column not found
**Solution**: Check column aliases in config
- Add to `columnAliases` object
- System supports fuzzy matching

### Issue: File too large
**Solution**: Split into multiple files or increase limits
```javascript
// In importConstants.js
FILE_SIZE_LIMITS: {
  csv: 50 * 1024 * 1024,   // 50MB
  xlsx: 100 * 1024 * 1024, // 100MB
}
```

### Issue: Formula injection warning
**Solution**: Ensure no cells start with =, @, +, or -
- Remove formulas before export
- Or prefix with space: " =formula"

## Monitoring

### Queue Statistics
```javascript
const stats = await importQueue.getQueueStats();
// Returns: { active, completed, failed, delayed, waiting, total }
```

### Failed Jobs
```javascript
const failed = await importQueue.getFailedJobs();
// Returns array of failed job objects
```

### Import Metrics
```javascript
const imports = await ImportLog.getImportStats(schoolId, days);
// Returns success rate, avg rows, timing data
```

## Best Practices

✓ **Preview Before Import** - Always preview to catch issues
✓ **Start Small** - Test with 10-100 rows first
✓ **Validate Data** - Ensure data quality before import
✓ **Monitor Progress** - Check status for large imports
✓ **Archive Logs** - Export error reports for audit
✓ **Schedule Off-Peak** - Run large imports during low-usage times
✓ **Backup First** - Always backup database before import

## Support

For issues or feature requests:
1. Check error report for specific row failures
2. Review error message and field causing issue
3. Verify data format matches field rules
4. Test with sample data first
5. Contact administrator if issue persists

---

**Last Updated**: January 2024
**Version**: 1.0
**Status**: Production Ready
