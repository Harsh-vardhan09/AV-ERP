// Demo users for all four OASES roles
require('dotenv').config();
const mongoose = require('mongoose');
const dns      = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {}
const bcrypt   = require('bcryptjs');
const { User } = require('../src-old/models/user');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

// First find the existing SCHOOL_ADMIN to copy schoolId
(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // Find the existing OASES admin to get schoolId
  let adminUser = await User.findOne({ oasesRole: 'SCHOOL_ADMIN' });
  if (!adminUser) {
    adminUser = await User.findOne({ role: 'admin' });
  }
  if (!adminUser) {
    console.error('❌ No admin user found! Run the main seed first.');
    process.exit(1);
  }

  const schoolId = adminUser.schoolId;
  console.log(`📌 Using schoolId: ${schoolId}`);

  const password = await bcrypt.hash('Demo@1234', 10);

  const usersToCreate = [
    {
      firstName:  'Scanner',
      lastName:   'Operator',
      email:      'oases.scanner@demo.com',
      password,
      role:       'teacher',   // ERP role (just needs to pass main login)
      oasesRole:  'SCAN_OPERATOR',
      schoolId,
      isActive:   true,
    },
    {
      firstName:  'Evaluator',
      lastName:   'One',
      email:      'oases.evaluator@demo.com',
      password,
      role:       'teacher',
      oasesRole:  'EVALUATOR',
      schoolId,
      isActive:   true,
    },
    {
      firstName:  'Head',
      lastName:   'Examiner',
      email:      'oases.headexaminer@demo.com',
      password,
      role:       'teacher',
      oasesRole:  'HEAD_EXAMINER',
      schoolId,
      isActive:   true,
    },
  ];

  console.log('\n═══ Creating OASES Users ═══');
  for (const userData of usersToCreate) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      // Update oasesRole in case it was missing
      existing.oasesRole = userData.oasesRole;
      existing.schoolId  = schoolId;
      existing.isActive  = true;
      await existing.save();
      console.log(`  ✅ Updated  : ${userData.email} → ${userData.oasesRole}`);
    } else {
      await User.create(userData);
      console.log(`  ✅ Created  : ${userData.email} → ${userData.oasesRole}`);
    }
  }

  console.log('\n═══ Login Credentials ═══');
  console.log('  Admin    : oases.admin@demo.com      / Demo@1234');
  console.log('  Scanner  : oases.scanner@demo.com    / Demo@1234');
  console.log('  Evaluator: oases.evaluator@demo.com  / Demo@1234');
  console.log('  Head Exam: oases.headexaminer@demo.com / Demo@1234');

  await mongoose.disconnect();
  console.log('\n✅ Done!');
  process.exit(0);
})();
