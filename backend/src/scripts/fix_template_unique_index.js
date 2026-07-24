/**
 * fix_template_unique_index.js
 *
 * One-time migration script:
 *   1. Drops the stale unique index on { schoolId: 1 } from reporttemplates collection
 *   2. Ensures all correct compound (non-unique) indexes are present
 *   3. Reports what was found and fixed
 *
 * Run with:
 *   node scripts/fix_template_unique_index.js
 */

'use strict';

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌  No MONGODB_URI / MONGO_URI found in .env');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅  Connected.\n');

  const db  = mongoose.connection.db;
  const col = db.collection('reporttemplates');

  // ── Step 1: List current indexes ─────────────────────────────────────────
  const indexes = await col.indexes();
  console.log('📋  Current indexes on reporttemplates:');
  indexes.forEach(idx => {
    const unique = idx.unique ? ' [UNIQUE]' : '';
    console.log(`   - ${JSON.stringify(idx.key)}${unique}  name="${idx.name}"`);
  });
  console.log('');

  // ── Step 2: Drop any unique index whose sole/primary key is schoolId ──────
  const staleIndexes = indexes.filter(idx => {
    const keys = Object.keys(idx.key);
    // Target: unique indexes that include schoolId but NOT the correct compound keys
    return idx.unique === true && (
      // { schoolId: 1 } alone
      (keys.length === 1 && keys[0] === 'schoolId') ||
      // { schoolId: 1, name: 1 } unique — too restrictive (same name across types is fine)
      (keys.length === 2 && keys.includes('schoolId') && keys.includes('name') && idx.unique)
    );
  });

  if (staleIndexes.length === 0) {
    console.log('ℹ️   No stale unique indexes found — nothing to drop.\n');
  } else {
    for (const idx of staleIndexes) {
      console.log(`🗑️   Dropping stale unique index "${idx.name}" (${JSON.stringify(idx.key)})…`);
      try {
        await col.dropIndex(idx.name);
        console.log(`   ✅  Dropped.\n`);
      } catch (err) {
        console.error(`   ❌  Failed to drop: ${err.message}\n`);
      }
    }
  }

  // ── Step 3: Ensure correct non-unique compound indexes ───────────────────
  const desiredIndexes = [
    { key: { schoolId: 1 },                                    name: 'schoolId_1' },
    { key: { schoolId: 1, isActive: 1, templateType: 1 },     name: 'schoolId_isActive_templateType' },
    { key: { schoolId: 1, isDefault: 1 },                     name: 'schoolId_isDefault' },
    { key: { schoolId: 1, classRangeFrom: 1, classRangeTo: 1, isActive: 1 }, name: 'schoolId_classRange_isActive' },
    { key: { schoolId: 1, templateStatus: 1, isActive: 1 },   name: 'schoolId_templateStatus_isActive' },
  ];

  const existingNames = new Set(indexes.map(i => i.name));

  for (const { key, name } of desiredIndexes) {
    if (existingNames.has(name)) {
      console.log(`   ✔  Index "${name}" already exists.`);
    } else {
      console.log(`   ➕  Creating index "${name}"…`);
      try {
        await col.createIndex(key, { name });
        console.log(`      ✅  Created.`);
      } catch (err) {
        console.log(`      ⚠️   ${err.message}`);
      }
    }
  }

  // ── Step 4: Final index list ──────────────────────────────────────────────
  const finalIndexes = await col.indexes();
  console.log('\n📋  Final indexes on reporttemplates:');
  finalIndexes.forEach(idx => {
    const unique = idx.unique ? ' [UNIQUE]' : '';
    console.log(`   - ${JSON.stringify(idx.key)}${unique}  name="${idx.name}"`);
  });

  console.log('\n✅  Migration complete. Multiple templates per school are now allowed.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
