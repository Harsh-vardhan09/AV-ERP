// Deletes ALL OASES data. Destructive and irreversible

require('dotenv').config();
if (process.env.NODE_ENV === 'production') {
  throw new Error('wipeAllOasesData refuses to run with NODE_ENV=production');
}

const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

// Load all OASES models
const AnswerSheet        = require('../src-old/models/oases/AnswerSheet');
const AuditLog           = require('../src-old/models/oases/AuditLog');
const EvaluationMark     = require('../src-old/models/oases/EvaluationMark');
const EvaluatorAssignment= require('../src-old/models/oases/EvaluatorAssignment');
const ExamConfig         = require('../src-old/models/oases/ExamConfig');
const OasesNotification  = require('../src-old/models/oases/OasesNotification');
const QuestionScheme     = require('../src-old/models/oases/QuestionScheme');
const ResultSheet        = require('../src-old/models/oases/ResultSheet');
const { User }           = require('../src/modules/identity');

(async () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(  '║       OASES FULL DATA WIPE — STARTING           ║');
  console.log(  '╚══════════════════════════════════════════════════╝\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  const results = [];

  const wipe = async (label, model) => {
    try {
      const res = await model.deleteMany({});
      const msg = `  🗑️  [${label}] — deleted ${res.deletedCount} document(s)`;
      console.log(msg);
      results.push({ label, deleted: res.deletedCount, ok: true });
    } catch (err) {
      const msg = `  ❌ [${label}] — ERROR: ${err.message}`;
      console.error(msg);
      results.push({ label, ok: false, error: err.message });
    }
  };

  console.log('═══ Wiping OASES Collections ═══\n');

  await wipe('AnswerSheet',         AnswerSheet);
  await wipe('AuditLog',            AuditLog);
  await wipe('EvaluationMark',      EvaluationMark);
  await wipe('EvaluatorAssignment', EvaluatorAssignment);
  await wipe('ExamConfig',          ExamConfig);
  await wipe('OasesNotification',   OasesNotification);
  await wipe('QuestionScheme',      QuestionScheme);
  await wipe('ResultSheet',         ResultSheet);

  // Wipe OASES users from the shared User collection
  console.log('\n═══ Wiping OASES Users from User collection ═══\n');
  try {
    const usersRes = await User.deleteMany({ oasesRole: { $exists: true, $ne: null } });
    console.log(`  🗑️  [OASES Users] — deleted ${usersRes.deletedCount} user(s)`);
    results.push({ label: 'OASES Users', deleted: usersRes.deletedCount, ok: true });
  } catch (err) {
    console.error(`  ❌ [OASES Users] — ERROR: ${err.message}`);
    results.push({ label: 'OASES Users', ok: false, error: err.message });
  }

  // Also try to wipe uploaded OASES sheet files from local disk
  const uploadsDir = path.join(__dirname, '../../public/oases');
  console.log('\n═══ Wiping Local OASES Uploads (public/oases/) ═══\n');
  if (fs.existsSync(uploadsDir)) {
    try {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`  🗑️  [Local Files] — public/oases/ wiped & recreated`);
    } catch (err) {
      console.error(`  ❌ [Local Files] — ERROR: ${err.message}`);
    }
  } else {
    console.log('  ℹ️  [Local Files] — public/oases/ does not exist, skipping');
  }

  // Summary
  const totalDeleted = results.filter(r => r.ok).reduce((sum, r) => sum + (r.deleted || 0), 0);
  const failed       = results.filter(r => !r.ok);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(  `║  ✅ WIPE COMPLETE — ${totalDeleted} total records deleted`.padEnd(51) + '║');
  if (failed.length > 0) {
    console.log(`║  ⚠️  ${failed.length} collection(s) had errors — check above`.padEnd(51) + '║');
  }
  console.log(  '╚══════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  process.exit(0);
})();
