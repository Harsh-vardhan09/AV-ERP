/**
 * QUICK SETUP GUIDE - Import System Integration
 * ================================================
 * 
 * Get the import system running in your app in 5 minutes
 */

/**
 * STEP 1: Install Dependencies
 * =============================
 * 
 * npm install bull redis xlsx fast-csv
 * 
 * Already installed in your project:
 * - express
 * - mongoose
 * - multer
 * - jwt / bcryptjs
 */

/**
 * STEP 2: Configure Environment Variables
 * ========================================
 * 
 * Add to .env:
 * 
 * # Redis Configuration
 * REDIS_HOST=localhost
 * REDIS_PORT=6379
 * REDIS_PASSWORD=your_password (if required)
 * 
 * # Import System
 * IMPORT_MAX_FILE_SIZE=104857600
 * IMPORT_BATCH_SIZE=1000
 * IMPORT_WORKER_CONCURRENCY=2
 */

/**
 * STEP 3: Update package.json
 * ===========================
 * 
 * Your package.json should include:
 * 
 * {
 *   "dependencies": {
 *     "express": "^4.21.0",
 *     "mongoose": "^8.8.3",
 *     "bull": "^4.16.5",
 *     "redis": "^4.6.x",
 *     "ioredis": "^5.10.1",
 *     "xlsx": "^0.18.5",
 *     "fast-csv": "^4.3.6",
 *     "multer": "^1.4.5",
 *     "validator": "^13.12.0"
 *   }
 * }
 */

/**
 * STEP 4: Add to Your Main App File (app.js or index.js)
 * =====================================================
 */

// BEFORE (existing code):
// const express = require('express');
// const app = express();

// ADD AFTER app initialization:
// ===============================

/**
// Option A: Using Redis client from ioredis
const redis = require('ioredis');
const { initializeImportSystem } = require('./import-system/init');

// Create Redis client
const redisClient = new redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

// Define services available to import system
const services = {
  studentService: require('./services/StudentService'),
  classService: require('./services/ClassService'),
  feeService: require('./services/FeeService'),
  teacherService: require('./services/TeacherService'),
  sectionService: require('./services/SectionService'),
  sessionService: require('./services/SessionService'),
  // Add other services as needed
};

// Initialize import system (call this in your async startup function)
async function startServer() {
  try {
    // ... other initialization code ...
    
    // Initialize import system
    console.log('Initializing Import System...');
    await initializeImportSystem(app, redisClient, services);
    console.log('✓ Import System initialized');
    
    // ... rest of startup code ...
    
    // Start server
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

startServer();
*/

/**
 * STEP 5: Ensure Middleware Setup
 * ================================
 * 
 * Make sure these are set up in your app before import routes:
 */

/**
// Authentication middleware
app.use('/api/v1', authenticateJWT);

// Authorization middleware for import routes (already included in routes)
// Only admin and superAdmin can use import endpoints

// CORS if needed
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
*/

/**
 * STEP 6: Verify Redis is Running
 * ================================
 */

/**
// In terminal:
redis-cli ping
// Should return: PONG

// If Redis not running, start it:
// macOS: brew services start redis
// Linux: sudo systemctl start redis-server
// Windows: Start Redis service or run redis-server.exe
// Docker: docker run -d -p 6379:6379 redis
*/

/**
 * STEP 7: Test the System
 * =======================
 */

/**
// 1. Create a test CSV file (students.csv)
firstName,lastName,email,phone,classId,sectionId,session
John,Doe,john@school.com,9876543210,10-A,A,2024-25
Jane,Smith,jane@school.com,9876543211,10-A,A,2024-25

// 2. Test preview endpoint
curl -X POST http://localhost:5000/api/v1/import/preview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@students.csv" \
  -F "entity=student"

// Expected response:
{
  "success": true,
  "preview": {
    "totalRows": 2,
    "headers": ["firstName", "lastName", "email", "phone", "classId", "sectionId", "session"],
    "columnMapping": {...},
    "sampleData": [...]
  }
}

// 3. Test start import
curl -X POST http://localhost:5000/api/v1/import/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@students.csv" \
  -F "entity=student" \
  -F "duplicateMode=skip" \
  -F "strictness=moderate"

// Expected response:
{
  "success": true,
  "importLogId": "507f1f77bcf86cd799439011",
  "jobId": "507f1f77bcf86cd799439011",
  "message": "Import queued for processing"
}

// 4. Check import status
curl -X GET http://localhost:5000/api/v1/import/507f1f77bcf86cd799439011/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

// Expected response:
{
  "success": true,
  "status": "completed",
  "entity": "student",
  "totalRows": 2,
  "results": {
    "success": 2,
    "failure": 0,
    "skipped": 0
  }
}
*/

/**
 * STEP 8: Implement Entity Adapters
 * ==================================
 */

/**
// Student adapter is complete. For other entities:

// 1. Teacher Import
const TEACHER_CONFIG = require('./import-system/configs/teacherImportConfig');
const TeacherAdapter = require('./import-system/adapters/teacherAdapter'); // Create this
// Register in init.js

// 2. Fee Import
const FEE_CONFIG = require('./import-system/configs/feeImportConfig');
const FeeAdapter = require('./import-system/adapters/feeAdapter'); // Create this
// Register in init.js

// 3. Attendance Import
const ATTENDANCE_CONFIG = require('./import-system/configs/attendanceImportConfig');
const AttendanceAdapter = require('./import-system/adapters/attendanceAdapter'); // Create this
// Register in init.js

// See DOCUMENTATION.js "ADDING NEW ENTITY IMPORTS" section for detailed steps
*/

/**
 * STEP 9: Monitor the Queue
 * =========================
 */

/**
// Check queue status
curl -X GET http://localhost:5000/api/v1/import/queue/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

// Monitor jobs in real-time (optional: use Bull Dashboard)
// npm install @bull-board/express
// Configure in app.js

// View failed jobs
curl -X GET http://localhost:5000/api/v1/import/queue/failed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

// Check logs
tail -f logs/import-system.log
*/

/**
 * STEP 10: Custom Configuration (Optional)
 * =======================================
 */

/**
// Adjust batch size for performance
// In constants/importConstants.js:
const FILE_PROCESSING = {
  MAX_ROWS_PER_BATCH: 1000,      // Increase for more memory
  MAX_ROW_SIZE: 32 * 1024,       // 32KB per cell
  STREAMING_CHUNK_SIZE: 16384,   // 16KB chunks
};

// Adjust queue settings
// In queue/importQueue.js:
const settings = {
  lockDuration: 30000,           // 30 second lock
  lockRenewTime: 15000,          // Renew every 15s
  maxStalledCount: 2,            // Max stalls before failure
};

// Adjust validation strictness
// In services/importService.js startImport():
const engine = new ImportEngine({
  services: this.services,
  validation: {
    strictness: options.strictness || 'moderate', // strict, moderate, or lenient
  },
});
*/

/**
 * TROUBLESHOOTING
 * ===============
 */

/**
// Issue: "Redis connection refused"
// Solution: 
//   1. Check if Redis is running: redis-cli ping
//   2. Verify REDIS_HOST and REDIS_PORT in .env
//   3. Check firewall settings

// Issue: "Queue worker not processing"
// Solution:
//   1. Check Redis connection
//   2. Verify Bull queue initialized in init.js
//   3. Check logs for errors

// Issue: "File exceeds maximum size"
// Solution:
//   1. CSV files: max 50MB
//   2. XLSX files: max 100MB
//   3. Split into multiple files if needed

// Issue: "Column not found"
// Solution:
//   1. Check column names match config
//   2. Preview import to see actual columns
//   3. Add column aliases in config if needed

// Issue: "Permission denied"
// Solution:
//   1. Only admin/superAdmin can import
//   2. Check JWT token
//   3. Verify user role
*/

/**
 * PERFORMANCE TUNING
 * ==================
 */

/**
// For small imports (< 1000 rows)
// - Keep strictness: 'moderate'
// - Process synchronously (default)

// For large imports (10k+ rows)
// - Use queue (automatic)
// - Increase batch size to 2000
// - Reduce validation strictness to 'lenient'

// For production
// - Enable Redis persistence
// - Set up job timeout: 600000ms (10 min)
// - Monitor queue stats regularly
// - Archive old import logs monthly

// Environment configuration for production
REDIS_HOST=redis.production.local
REDIS_PORT=6379
REDIS_PASSWORD=strong_password_here
IMPORT_WORKER_CONCURRENCY=4
IMPORT_BATCH_SIZE=2000
NODE_ENV=production
*/

/**
 * API QUICK REFERENCE
 * ===================
 */

/**
// All endpoints require:
// - Authorization header with JWT token
// - User role: admin or superAdmin
// - Request must include schoolId in JWT

// POST /api/v1/import/preview
// - File upload (multipart/form-data)
// - Query: entity=student|teacher|fee|attendance
// - Returns: Sample data + column mapping

// POST /api/v1/import/start
// - File upload (multipart/form-data)
// - Body: entity, duplicateMode, strictness, priority
// - Returns: importLogId + jobId

// GET /api/v1/import/:importLogId/status
// - Returns: Import progress and status

// GET /api/v1/import/:importLogId/errors
// - Query: page, limit
// - Returns: Paginated error list

// GET /api/v1/import/:importLogId/error-report
// - Query: format=csv|xlsx
// - Returns: Downloadable error report

// GET /api/v1/import/history/:entity
// - Query: days (default 30)
// - Returns: Import history + stats

// GET /api/v1/import/profiles/:entity
// - Returns: Saved import templates

// POST /api/v1/import/profile
// - Body: name, description, entity, columnMapping
// - Returns: Saved profile
*/

/**
 * SUPPORT & DOCUMENTATION
 * =======================
 */

/**
// Full Documentation: backend/src/import-system/DOCUMENTATION.js
// User Guide: backend/src/import-system/README.md
// Implementation Details: backend/src/import-system/IMPLEMENTATION_COMPLETE.md
// 
// For questions or issues:
// 1. Check error report for specific row failures
// 2. Review error message and field causing issue
// 3. Test with sample data first
// 4. Verify data format matches field rules
// 5. Contact administrator if issue persists
*/

/**
 * QUICK SUMMARY
 * =============
 * 
 * Total setup time: ~30 minutes
 * 
 * 1. Install packages (2 min)
 * 2. Set env vars (2 min)
 * 3. Add to app.js (3 min)
 * 4. Start Redis (2 min)
 * 5. Test endpoints (10 min)
 * 6. Implement adapters as needed (variable)
 * 
 * System ready for production use!
 */

module.exports = {
  setupTime: '~30 minutes',
  dependencies: ['bull', 'redis', 'xlsx', 'fast-csv'],
  envVars: ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'],
  status: 'READY FOR INTEGRATION',
};
