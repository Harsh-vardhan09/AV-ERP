/**
 * One-time script — clears all OasesExamConfig documents.
 * Run: node src/scripts/clearOasesExamConfigs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await mongoose.connection.collection('oasesexamconfigs').deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} OasesExamConfig documents`);

    await mongoose.disconnect();
    console.log('✅ Done. Collection is now empty — fresh creation will work!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
