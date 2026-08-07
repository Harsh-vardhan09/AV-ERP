// Stamps schoolId on documents missing it, one collection per run.
// Only touches { schoolId: { $exists: false } }, so it never overwrites a real value

require('dotenv').config();
const mongoose = require('mongoose');

// Parse CLI Args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace('--', '').split('=');
  acc[key] = val;
  return acc;
}, {});

const { schoolId, collection: collectionName, dry } = args;

if (!schoolId || !collectionName) {
  console.error('\n❌  Usage: node scripts/backfillSchoolId.js --schoolId=<id> --collection=<name> [--dry]\n');
  process.exit(1);
}

if (!mongoose.Types.ObjectId.isValid(schoolId)) {
  console.error(`\n❌  Invalid schoolId: "${schoolId}"\n`);
  process.exit(1);
}

// Collection → Model mapping
// Add models here as needed
const MODEL_MAP = {
  sessions:         () => require('../src/modules/fees/models/Session'),
  billingperiods:   () => require('../src/modules/fees/models/BillingPeriod'),
  assignments:      () => require('../src-old/models/assignment'),
  knowledgecenters: () => require('../src/modules/communication').Knowledgecenter,
};

const loaderFn = MODEL_MAP[collectionName.toLowerCase()];
if (!loaderFn) {
  console.error(`\n❌  Unknown collection "${collectionName}". Known: ${Object.keys(MODEL_MAP).join(', ')}\n`);
  process.exit(1);
}

// Main
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅  Connected to MongoDB`);

    const Model   = loaderFn();
    const filter  = { schoolId: { $exists: false } };
    const update  = { $set: { schoolId: new mongoose.Types.ObjectId(schoolId) } };

    const beforeCount = await Model.countDocuments(filter);
    console.log(`\n📊  Found ${beforeCount} document(s) in "${Model.modelName}" missing schoolId`);

    if (beforeCount === 0) {
      console.log('👍  Nothing to migrate. Exiting.\n');
      return;
    }

    if (dry !== undefined) {
      console.log('🔍  DRY RUN — no changes written. Remove --dry to apply.\n');
      return;
    }

    const result = await Model.updateMany(filter, update);
    console.log(`✅  Updated ${result.modifiedCount} document(s) → schoolId = ${schoolId}\n`);

    // Verify
    const afterCount = await Model.countDocuments(filter);
    if (afterCount === 0) {
      console.log('🎉  All documents now have schoolId. Migration complete.\n');
    } else {
      console.warn(`⚠️   ${afterCount} document(s) still missing schoolId (check for write errors)\n`);
    }

  } catch (err) {
    console.error('\n❌  Migration failed:', err.message, '\n');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌  Disconnected from MongoDB');
  }
})();
