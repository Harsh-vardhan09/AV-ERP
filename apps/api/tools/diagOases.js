// Prints OASES collection counts and health
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src-old/models/user');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // 1. Find all OASES users
  const oasesUsers = await User.find({ oasesRole: { $exists: true, $ne: null } })
    .select('firstName lastName email role oasesRole schoolId isActive');

  console.log('═══ OASES USERS ═══');
  if (!oasesUsers.length) {
    console.log('❌ NO OASES USERS FOUND! Run the seed script.');
  } else {
    oasesUsers.forEach(u => {
      console.log(`  ${u.email} | role: ${u.role} | oasesRole: ${u.oasesRole} | schoolId: ${u.schoolId || '⚠️  NULL'} | active: ${u.isActive}`);
    });
  }

  // 2. Find all ExamConfig docs
  const configs = await mongoose.connection.collection('oasesexamconfigs').find({}).toArray();
  console.log(`\n═══ EXAM CONFIGS (${configs.length} total) ═══`);
  configs.forEach(c => {
    console.log(`  ${c.examName} | ${c.subjectCode} | ${c.classLevel} | ${c.academicYear} | schoolId: ${c.schoolId || '⚠️  NULL'}`);
  });

  // 3. Check OASES routes registered
  console.log('\n═══ ENV CHECK ═══');
  console.log(`  MONGO_URI   : ${MONGO_URI ? '✅ set' : '❌ NOT SET'}`);
  console.log(`  JWT_SECRET  : ${process.env.JWT_SECRET ? '✅ set' : '❌ NOT SET'}`);
  console.log(`  REDIS_URL   : ${process.env.REDIS_URL ? '✅ set' : '❌ NOT SET'}`);

  await mongoose.disconnect();
  process.exit(0);
})();
