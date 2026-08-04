/**
 * migrateModules.js
 *
 * ONE-TIME migration script: adds the `modules` field to all existing
 * SchoolSettings documents that were created before Phase 2.
 *
 * Usage:  node scripts/migrateModules.js
 *
 * Safe to run multiple times — it only touches documents where `modules`
 * doesn't exist yet, and it respects each school's existing isOasesEnabled
 * value when setting modules.oases.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { DEFAULT_MODULES } = require('../src/utils/moduleConstants');

// ── Inline minimal schema to avoid circular imports ─────────────────────────
const SchoolSettings = require('../src/models/SchoolSettings');

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌  MONGO_URI not set in .env');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('✅  Connected\n');

  // Find all settings documents that don't have the modules field yet
  const docs = await SchoolSettings.find({ modules: { $exists: false } }).lean();
  console.log(`📋  Found ${docs.length} settings document(s) without modules field`);

  if (docs.length === 0) {
    console.log('✨  Nothing to migrate — all documents already have modules field');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Build bulkWrite ops — preserve each school's isOasesEnabled value
  const bulkOps = docs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: {
        $set: {
          modules: {
            ...DEFAULT_MODULES,
            // Honour existing oases toggle (backward compat)
            oases: doc.isOasesEnabled ?? false,
          },
        },
      },
    },
  }));

  const result = await SchoolSettings.bulkWrite(bulkOps);
  console.log(`✅  Migrated ${result.modifiedCount} of ${docs.length} document(s)`);

  if (result.modifiedCount !== docs.length) {
    console.warn(`⚠️   ${docs.length - result.modifiedCount} document(s) were not modified — check MongoDB logs`);
  }

  console.log('\n🎉  Migration complete!');
  console.log('    Modules added to all existing schools:');
  Object.entries(DEFAULT_MODULES).forEach(([k, v]) => {
    console.log(`      ${k.padEnd(16)} → ${v ? 'enabled' : 'disabled'}`);
  });
  console.log('    (oases value was taken from each school\'s isOasesEnabled field)\n');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
