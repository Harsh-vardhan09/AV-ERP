// Creates the demo school + its admin straight in MongoDB.
// Bypasses the HTTP API, so no PLATFORM_SECRET is needed
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const connect  = require('../src/core/config/database');

const SCHOOL_CODE  = 'DEMO2025';
const SCHOOL_NAME  = 'Demo School';
const ADMIN_EMAIL  = 'admin@school.com';
const ADMIN_PASS   = 'admin123';

const run = async () => {
  await connect();

  const School = require('../src/modules/tenancy').School;
  const { User } = require('../src/modules/identity');

  
  // Check if school already exists
  let school = await School.findByCode(SCHOOL_CODE);

  if (school) {
    console.log(`\n⚠️  School already exists: ${school.name} (code: ${school.code})`);
  } else {
    school = await School.create({
      name:     SCHOOL_NAME,
      code:     SCHOOL_CODE,
      isActive: true,
    });
    console.log(`\n✅ School created: ${school.name} (code: ${school.code})`);
  }

  // Upsert admin user scoped to this school
  let admin = await User.findOne({ email: ADMIN_EMAIL, schoolId: school._id });

  if (admin) {
    console.log(`⚠️  Admin already exists: ${admin.email}`);
  } else {
    const hashed = await bcrypt.hash(ADMIN_PASS, 10);
    admin = await User.create({
      firstName: 'School',
      lastName:  'Admin',
      email:     ADMIN_EMAIL,
      password:  hashed,
      role:      'admin',
      schoolId:  school._id,
      isActive:  true,
      isVerified: true,
    });

    // Link admin to school
    school.adminUserId = admin._id;
    await school.save();

    console.log(`✅ Admin user created: ${admin.email}`);
  }

  console.log('\n─────────────────────────────────────────');
  console.log('  DEMO LOGIN CREDENTIALS');
  console.log('─────────────────────────────────────────');
  console.log(`  School Code : ${SCHOOL_CODE}`);
  console.log(`  Email       : ${ADMIN_EMAIL}`);
  console.log(`  Password    : ${ADMIN_PASS}`);
  console.log('─────────────────────────────────────────\n');

  process.exit(0);
};

run().catch(err => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
