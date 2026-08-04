/**
 * Seed script to create the default admission department user.
 * Run: node seedAdmission.js
 */
require('dotenv').config();
const bcryptjs = require('bcryptjs');
const connect = require('./src/config/database');
const mongoose = require('mongoose');
const seedAdmission = async () => {
  try {
    await connect();

    const School = require('./src/models/School');
    const { User } = require('./src/models/user');

    const admissionEmail = 'admission@demo2.com';

    // Check if admission user already exists
    const existingAdmission = await User.findOne({ email: admissionEmail });
    if (existingAdmission) {
      console.log('⚠️  Admission user already exists:', admissionEmail);
      process.exit(0);
    }

    const hashPassword = await bcryptjs.hash('admission123', 10);
    const schoolId = new mongoose.Types.ObjectId("69ca76e1abc233bd7ef0c62c");
    const admissionUser = await User.create({
      firstName: 'Admission',
      lastName: 'Dept',
      email: admissionEmail,
      password: hashPassword,
      role: 'admission',
      schoolId: schoolId,
      isActive: true,
      isVerified: true
    });

    console.log('✅ Admission user created successfully!');
    console.log('   Email:', admissionEmail);
    console.log('   Password: admission123');
    console.log('   Role:', admissionUser.role);
    console.log('');
    console.log('⚠️  Change password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedAdmission();
