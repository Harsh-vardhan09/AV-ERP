// Clears grade 'E' where both term marks are null — that E came from an old model default, not a teacher
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const CoScholasticMark = require('../src/modules/examination').CoScholasticMark;

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

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
