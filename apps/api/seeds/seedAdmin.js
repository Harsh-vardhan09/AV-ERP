// Creates the default admin user
require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const connect = require('../src/core/config/database');

const seedAdmin = async () => {
  try {
    await connect();
    
    // Import User model after connection
    const { User } = require('../src/modules/identity');
    
    const adminEmail = 'admin@school.com';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', adminEmail);
      process.exit(0);
    }

    const hashPassword = await bcryptjs.hash('admin123', 10);
    
    const admin = await User.create({
      firstName: 'School',
      lastName: 'Admin',
      email: adminEmail,
      password: hashPassword,
      role: 'admin',
      isActive: true,
      isVerified: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Email:', adminEmail);
    console.log('   Password: admin123');
    console.log('   Role:', admin.role);
    console.log('');
    console.log('⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
