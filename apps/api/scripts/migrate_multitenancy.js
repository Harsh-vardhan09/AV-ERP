/**
 * Migration script — assign all existing documents to a default school.
 *
 * Run ONCE after deploying multi-tenancy code to production:
 *   node scripts/migrate_multitenancy.js
 *
 * Steps:
 *  1. Create a default school (code: "DEFAULT")
 *  2. Create admin user for the default school
 *  3. Backfill schoolId on every collection
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // ── Load models ─────────────────────────────────────────────────────────────
  require('../src/models/School');
  require('../src/models/user');
  require('../src/models/AcademicSession');
  require('../src/models/ClassModel');
  require('../src/models/SectionModel');
  require('../src/models/SubjectMaster');
  require('../src/models/ClassSubjectMap');
  require('../src/models/ClassTeacherAssignment');
  require('../src/models/TeacherSubjectAssignment');
  require('../src/models/Exam');
  require('../src/models/ExamSubjectConfig');
  require('../src/models/MarksModel');
  require('../src/models/MarksAuditLog');
  require('../src/models/StudentProfile');
  require('../src/models/TeacherProfile');
  require('../src/models/SchoolSettings');
  require('../src/models/leave');
  require('../src/models/fee/FeeHead');
  require('../src/models/fee/FeeStructure');
  require('../src/models/fee/StudentFee');
  require('../src/models/fee/Installment');
  require('../src/models/fee/LedgerEntry');

  const School = mongoose.model('School');
  const User = mongoose.model('User');

  // ── Step 1: Create or find default school ──────────────────────────────────
  let school = await School.findOne({ code: 'DEFAULT' });
  if (!school) {
    school = await School.create({
      name: 'Default School',
      code: 'DEFAULT',
      isActive: true,
    });
    console.log(`✓ Created default school: ${school._id}`);
  } else {
    console.log(`→ Default school already exists: ${school._id}`);
  }

  const schoolId = new mongoose.Types.ObjectId('69c0f0622c2a21e01a6abba4');

  // ── Step 2: Backfill all collections ────────────────────────────────────────
  const collections = [
    'users',
    'academicsessions',
    'classmodels',
    'sectionmodels',
    'subjectmasters',
    'classsubjectmaps',
    'classteacherassignments',
    'teachersubjectassignments',
    'exams',
    'examsubjectconfigs',
    'marks',
    'marksauditlogs',
    'studentprofiles',
    'teacherprofiles',
    'schoolsettings',
    'leaves',
    'feeheads',
    'feestructures',
    'studentfees',
    'installments',
    'ledgerentries',
  ];

  for (const col of collections) {
    const result = await mongoose.connection.collection(col).updateMany(
      { schoolId: { $exists: false } },        // only docs without schoolId
      { $set: { schoolId } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  ✓ ${col}: updated ${result.modifiedCount} docs`);
    } else {
      console.log(`  → ${col}: nothing to update`);
    }
  }

  // ── Step 3: Set school's adminUserId to the existing admin user ─────────────
  const adminUser = await User.findOne({ role: 'admin', schoolId });
  if (adminUser && !school.adminUserId) {
    school.adminUserId = adminUser._id;
    await school.save();
    console.log(`✓ Set school admin to: ${adminUser.email}`);
  }

  console.log('\n✅  Migration complete!');
  console.log(`\n📋 School Code for login: DEFAULT`);
  console.log('All existing users should now login with School Code: DEFAULT\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
