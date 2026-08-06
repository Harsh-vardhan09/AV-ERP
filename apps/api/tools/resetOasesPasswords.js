// Resets every OASES user password to a known demo value
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { User } = require('../src-old/models/user');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  const newPassword = await bcrypt.hash('Demo@1234', 10);

  const oasesUsers = await User.find({ oasesRole: { $exists: true, $ne: null } });

  if (!oasesUsers.length) {
    console.log('❌ No OASES users found!');
    process.exit(1);
  }

  for (const user of oasesUsers) {
    user.password = newPassword;
    await user.save();
    console.log(`  ✅ Reset: ${user.email} | oasesRole: ${user.oasesRole}`);
  }

  console.log('\n═══ All OASES passwords are now: Demo@1234 ═══');
  await mongoose.disconnect();
  process.exit(0);
})();
