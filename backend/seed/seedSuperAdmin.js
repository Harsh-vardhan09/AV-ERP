/**
 * ============================================================
 *  seedSuperAdmin.js
 *  Seeds the root Super Admin into the database.
 *
 *  Usage (production DB):
 *    node seedSuperAdmin.js --mongo "mongodb+srv://..." --email "you@example.com" --password "StrongPass123"
 *
 *  Or via environment variable override:
 *    MONGO_OVERRIDE="mongodb+srv://..." node seedSuperAdmin.js
 *
 *  Or uses .env MONGO_URI if no override provided.
 * ============================================================
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const dns       = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {}
const bcrypt    = require('bcryptjs');
const validator = require('validator');

// ── Parse CLI args ──────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

// Priority: CLI --mongo > env MONGO_OVERRIDE > .env MONGO_URI
const MONGO_URI =
  getArg('--mongo') ||
  process.env.MONGO_OVERRIDE ||
  process.env.MONGO_URI;

const SA_EMAIL    = getArg('--email')    || 'superadmin@nexisparkx.com';
const SA_PASSWORD = getArg('--password') || 'superadmin123'; // REQUIRED

if (!MONGO_URI) {
  console.error('❌  No MONGO_URI found. Pass --mongo "<uri>" or set MONGO_URI in .env');
  process.exit(1);
}

if (!SA_PASSWORD) {
  console.error('❌  Password is required. Pass --password "<your-strong-password>"');
  process.exit(1);
}

if (!validator.isEmail(SA_EMAIL)) {
  console.error('❌  Invalid email address:', SA_EMAIL);
  process.exit(1);
}

// ── Inline SuperAdmin schema (avoids touching app bootstrap) ──
const superAdminSchema = new mongoose.Schema(
  {
    firstName:   { type: String, required: true, trim: true },
    lastName:    { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:    { type: String, required: true },
    isActive:    { type: Boolean, default: true },
    lastLogin:   { type: Date,    default: Date.now },
    permissions: {
      type: [String],
      enum: ['manage_schools', 'manage_subscriptions', 'view_analytics', 'manage_users', 'system_settings'],
      default: ['manage_schools', 'manage_subscriptions', 'view_analytics', 'manage_users', 'system_settings'],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin', default: null },
  },
  { timestamps: true }
);

// ── Main ────────────────────────────────────────────────────
const seed = async () => {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    // Mask credentials in log output
    const safeUri = MONGO_URI.replace(/:([^@]+)@/, ':****@');
    console.log('   URI:', safeUri);

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to:', mongoose.connection.db.databaseName, '\n');

    // Use existing model or register fresh
    const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', superAdminSchema);

    // ── Check if super admin already exists ──
    const existing = await SuperAdmin.findOne({ email: SA_EMAIL.toLowerCase().trim() });

    if (existing) {
      console.log('⚠️  Super admin already exists with this email:', existing.email);
      console.log('   Created at:', existing.createdAt);
      console.log('   isActive  :', existing.isActive);
      console.log('\n   If you want to RESET the password, run with --reset flag.');

      // If --reset flag is passed, update password
      if (args.includes('--reset')) {
        const hashed = await bcrypt.hash(SA_PASSWORD, 12);
        existing.password = hashed;
        existing.isActive = true;
        await existing.save();
        console.log('\n✅ Password reset successfully!');
        console.log('   Email   :', existing.email);
        console.log('   Password: [as provided via --password]');
      }

      await mongoose.disconnect();
      process.exit(0);
    }

    // ── Hash password ──
    const hashedPassword = await bcrypt.hash(SA_PASSWORD, 12);

    // ── Create super admin ──
    const superAdmin = await SuperAdmin.create({
      firstName:   'Super',
      lastName:    'Admin',
      email:       SA_EMAIL.toLowerCase().trim(),
      password:    hashedPassword,
      isActive:    true,
      permissions: ['manage_schools', 'manage_subscriptions', 'view_analytics', 'manage_users', 'system_settings'],
      createdBy:   null,
    });

    console.log('🎉 Super Admin created successfully!\n');
    console.log('   Database :', mongoose.connection.db.databaseName);
    console.log('   ID       :', superAdmin._id.toString());
    console.log('   Email    :', superAdmin.email);
    console.log('   Password : [as provided via --password]');
    console.log('   isActive :', superAdmin.isActive);
    console.log('   Perms    :', superAdmin.permissions.join(', '));
    console.log('\n⚠️  Keep credentials SECURE. Do not share this password!\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.code === 11000) {
      console.error('   Duplicate key — super admin with this email already exists.');
    }
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
};

seed();
