/**
 * scripts/fixCoScholasticGrades.js
 *
 * One-time fix: resets any CoScholasticMark where grade='E' AND
 * term1Marks/term2Marks are BOTH null (i.e. the 'E' was set by
 * the old model default, not by an actual teacher entry).
 *
 * Safe to run multiple times.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const CoScholasticMark = require('../src/models/CoScholasticMark');

async function run() {
  await mongoose.connect(process.env.MONGO_URL || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const result = await CoScholasticMark.updateMany(
    { grade: 'E', term1Marks: null, term2Marks: null },
    { $set: { grade: '' } }
  );

  console.log(`Fixed ${result.modifiedCount} phantom "E" grade records.`);
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
