/**
 * scripts/seedSuperAdmin.js
 *
 * Run ONCE to create the first (root) super admin account.
 * Usage: node scripts/seedSuperAdmin.js
 *
 * IMPORTANT: Delete or restrict access to this file after running.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to DB first then import model (avoids connection-order issues)
const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    if (!process.env.SUPER_ADMIN_JWT_SECRET) {
      throw new Error('SUPER_ADMIN_JWT_SECRET is not defined in .env');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Import model AFTER connection
    const SuperAdmin = require('../src/models/SuperAdmin');

    // Guard: don't create if one already exists
    const existing = await SuperAdmin.findOne({});
    if (existing) {
      console.log('⚠️  Super admin already exists:');
      console.log(`   Email: ${existing.email}`);
      console.log('   Skipping seed. Delete the existing record manually if you need to reset.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const plainPassword = 'SuperAdmin@2025';
    // NOTE: Do NOT manually bcrypt.hash here.
    // The SuperAdmin model's pre('save') hook handles hashing automatically.
    // Hashing here + pre-save hook = double-hash = login always fails.

    const superAdmin = await SuperAdmin.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@nexisparkx.com',
      password: plainPassword,   // plain text — pre-save hook hashes it
      isActive: true,
      permissions: [
        'manage_schools',
        'manage_subscriptions',
        'view_analytics',
        'manage_users',
        'system_settings',
      ],
      createdBy: null,
    });

    console.log('\n✅ Super admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID:        ${superAdmin._id}`);
    console.log(`   Email:     ${superAdmin.email}`);
    console.log(`   Password:  ${plainPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  CHANGE THE PASSWORD IMMEDIATELY after first login!');
    console.log('⚠️  DELETE or restrict access to this seed script after running.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
