// Backfills Leave.schoolId from the applicant (appliedBy -> User.schoolId).
//
// studentController.applyLeave omitted schoolId, so every student leave written
// before that fix is invisible to teacherController.getStudentLeaves, which
// filters on schoolId. Teacher leaves already carried it.
//
// The generic 02-backfill-school-id.js stamps one --schoolId across a whole
// collection, which would be wrong here: leaves span every tenant. Joining
// through the applicant keeps each row with its own school.
//
// Usage: node migrations/2026-08-14-01-backfill-leave-school-id.js [--dry]

const mongoose = require('mongoose');
const Leave = require('../src/modules/communication').Leave;
const User = require('../src/modules/identity').User;
require('dotenv').config();

const DRY = process.argv.includes('--dry');
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function backfillLeaveSchoolId() {
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully');

    // $exists:false and an explicit null both fail an { schoolId: <id> } match
    const filter = { $or: [{ schoolId: { $exists: false } }, { schoolId: null }] };
    const orphans = await Leave.find(filter).select('_id appliedBy role').lean();

    console.log(`\n📊  Found ${orphans.length} Leave document(s) missing schoolId`);
    if (orphans.length === 0) {
      console.log('👍  Nothing to migrate. Exiting.\n');
      return;
    }

    if (DRY) {
      const byRole = orphans.reduce((acc, l) => {
        acc[l.role || 'unknown'] = (acc[l.role || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      console.log('🔍  DRY RUN — no changes written. Remove --dry to apply.');
      console.log('    By role:', JSON.stringify(byRole), '\n');
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const leave of orphans) {
      try {
        const applicant = await User.findById(leave.appliedBy).select('schoolId').lean();
        if (!applicant?.schoolId) {
          console.log(`Skipping leave ${leave._id}: applicant or applicant.schoolId not found`);
          skipped++;
          continue;
        }

        await Leave.updateOne({ _id: leave._id }, { $set: { schoolId: applicant.schoolId } });
        updated++;
      } catch (error) {
        console.error(`Error updating leave ${leave._id}:`, error.message);
        skipped++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total found:          ${orphans.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors/Skipped:       ${skipped}`);

    const remaining = await Leave.countDocuments(filter);
    if (remaining === 0) {
      console.log('\n🎉  All Leave documents now have schoolId.\n');
    } else {
      console.warn(
        `\n⚠️   ${remaining} document(s) still missing schoolId — their applicant is deleted or has no school. Review before deleting.\n`
      );
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌  Disconnected from MongoDB');
  }
}

backfillLeaveSchoolId();
