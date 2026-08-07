// Creates the DEFAULT school + its admin, then stamps schoolId on every collection.
// Run once, before any other migration — everything below assumes schoolId exists

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // Load models
  require('../src/modules/tenancy').School;
  require('../src/modules/identity');
  require('../src-old/models/AcademicSession');
  require('../src-old/models/ClassModel');
  require('../src-old/models/SectionModel');
  require('../src-old/models/SubjectMaster');
  require('../src-old/models/ClassSubjectMap');
  require('../src-old/models/ClassTeacherAssignment');
  require('../src-old/models/TeacherSubjectAssignment');
  require('../src-old/models/Exam');
  require('../src-old/models/ExamSubjectConfig');
  require('../src-old/models/MarksModel');
  require('../src-old/models/MarksAuditLog');
  require('../src-old/models/StudentProfile');
  require('../src-old/models/TeacherProfile');
  require('../src/modules/tenancy').SchoolSettings;
  require('../src/modules/communication').Leave;
  require('../src/modules/fees/models/FeeHead');
  require('../src/modules/fees/models/FeeStructure');
  require('../src/modules/fees/models/StudentFee');
  require('../src/modules/fees/models/Installment');
  require('../src/modules/fees/models/LedgerEntry');

  const School = mongoose.model('School');
  const User = mongoose.model('User');

  // Step 1: Create or find default school
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

  // Step 2: Backfill all collections
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

  // Step 3: Set school's adminUserId to the existing admin user
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
