// Rebuilds the users (email, schoolId) unique index WITH its partial filter.
//
// THE BUG
//   Registering a second student without an email address fails with:
//     E11000 duplicate key error collection: <db>.users
//     index: email_1_schoolId_1 dup key: { email: null, schoolId: ObjectId(...) }
//
//   Many students have no email. The first email-less student in a school stores
//   { email: null }, and a plain unique index treats the second one as a
//   duplicate of it — null equals null.
//
// WHY THE CODE FIX WAS NOT ENOUGH
//   models/user.js ALREADY declares the right index:
//     { email: 1, schoolId: 1 }, { unique: true,
//       partialFilterExpression: { email: { $type: 'string' } } }
//   …but the database still has the OLD plain unique index under the SAME
//   auto-generated name, email_1_schoolId_1. Mongoose's autoIndex calls
//   createIndex, MongoDB answers IndexKeySpecsConflict ("same name, different
//   spec"), and the old index survives. Mongoose never drops-and-recreates an
//   index whose options changed, so no amount of redeploying fixes this.
//
//   Verified: tests/user-email-index.test.js reproduces the exact error and
//   asserts the conflict, so this cannot silently regress.
//
// WHAT THIS DOES
//   1. Drops email_1_schoolId_1 if it lacks the partial filter.
//   2. Recreates it with the filter, so uniqueness applies only to real
//      addresses and email-less students no longer collide.
//   3. Optionally ($unset) normalises stored `email: null` to absent, matching
//      what the pre-save hook now writes.
//
// IDEMPOTENT: an index that already has the filter is left alone.
//
// Usage:
//   node migrations/2026-08-15-04-fix-user-email-index.js            (dry run)
//   node migrations/2026-08-15-04-fix-user-email-index.js --apply

const mongoose = require('mongoose');
require('dotenv').config();

const INDEX_NAME = 'email_1_schoolId_1';
const APPLY = process.argv.includes('--apply');
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const wanted = {
  key: { email: 1, schoolId: 1 },
  options: {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
    name: INDEX_NAME,
  },
};

async function run() {
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to "${mongoose.connection.name}". Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const coll = mongoose.connection.collection('users');
  const indexes = await coll.indexes();
  const existing = indexes.find((i) => i.name === INDEX_NAME);

  console.log('\nCurrent users indexes:');
  for (const i of indexes) {
    console.log(`  ${i.name}  unique=${!!i.unique}  partial=${!!i.partialFilterExpression}`);
  }

  if (existing?.partialFilterExpression) {
    console.log(`\n✅ "${INDEX_NAME}" already has a partial filter. Nothing to do.`);
  } else {
    // How many rows would collide today — the size of the problem, and proof the
    // drop is necessary rather than cosmetic.
    const nullEmails = await coll.countDocuments({
      $or: [{ email: null }, { email: '' }, { email: { $exists: false } }],
    });
    const perSchool = await coll
      .aggregate([
        { $match: { $or: [{ email: null }, { email: '' }, { email: { $exists: false } }] } },
        { $group: { _id: '$schoolId', n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $count: 'schools' },
      ])
      .toArray();

    console.log(`\n  users with no email        : ${nullEmails}`);
    console.log(`  schools where that is >1   : ${perSchool[0]?.schools || 0}`);
    console.log('  (registration fails in every one of those schools today)');

    if (existing) {
      console.log(`\n  ${APPLY ? 'Dropping' : 'Would drop'} "${INDEX_NAME}" (no partial filter)`);
      if (APPLY) await coll.dropIndex(INDEX_NAME);
    } else {
      console.log(`\n  "${INDEX_NAME}" not present — will just create it.`);
    }

    console.log(`  ${APPLY ? 'Creating' : 'Would create'} "${INDEX_NAME}" WITH the partial filter`);
    if (APPLY) {
      try {
        await coll.createIndex(wanted.key, wanted.options);
      } catch (err) {
        if (err.code === 11000) {
          console.error(
            '\n❌ Two users in one school share the SAME real email address, so the unique ' +
              'index cannot be built. Find and fix them, then re-run:\n' +
              '   db.users.aggregate([{$match:{email:{$type:"string"}}},' +
              '{$group:{_id:{email:"$email",schoolId:"$schoolId"},n:{$sum:1}}},{$match:{n:{$gt:1}}}])'
          );
          throw err;
        }
        throw err;
      }
    }
  }

  // Stored nulls are excluded by the partial filter, so this is tidiness rather
  // than a fix: it makes the documents match what the pre-save hook now writes.
  const nulls = await coll.countDocuments({ email: null });
  if (nulls > 0) {
    console.log(
      `\n  ${APPLY ? 'Unsetting' : 'Would unset'} email on ${nulls} document(s) storing null`
    );
    if (APPLY) await coll.updateMany({ email: null }, { $unset: { email: '' } });
  }

  if (APPLY) {
    const after = await coll.indexes();
    const now = after.find((i) => i.name === INDEX_NAME);
    console.log(
      `\n✅ Done. "${INDEX_NAME}" partial=${!!now?.partialFilterExpression} unique=${!!now?.unique}`
    );
  } else {
    console.log('\nDry run — nothing written. Re-run with --apply.');
  }
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected.');
  });
