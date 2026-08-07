// Two idempotent ReportTemplate migrations: fold cssContent into htmlContent, and
// promote platform-owned templates to global (isGlobal:true, schoolId:null)

require('dotenv').config();
const mongoose = require('mongoose');

const MARKER = '<!-- css-folded -->';

// Bundled templates shipped in src/templates/ — safe to promote to global.
const BUNDLED = [
  'CBSE Two-Term Scholastic',
  'Single-Term Numeric',
  'Compact Grade Card',
];

const DRY     = process.argv.includes('--dry');
const PROMOTE = process.argv.includes('--promote');

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  await mongoose.connect(uri);
  console.log(`\n🔀  ReportTemplate migration${DRY ? '  (DRY RUN — no writes)' : ''}\n`);

  const ReportTemplate = require('../src/modules/reportcards').ReportTemplate;

  // 1. Fold cssContent into htmlContent
  const needFold = await ReportTemplate.find({
    cssContent: { $exists: true, $nin: [null, ''] },
  }).select('_id name htmlContent cssContent').lean();

  let folded = 0, alreadyFolded = 0;
  for (const t of needFold) {
    if ((t.htmlContent || '').includes(MARKER)) { alreadyFolded++; continue; }

    const merged = `${MARKER}\n<style>\n${t.cssContent}\n</style>\n${t.htmlContent || ''}`;
    if (!DRY) {
      await ReportTemplate.updateOne(
        { _id: t._id },
        { $set: { htmlContent: merged, cssContent: '' } },
      );
    }
    folded++;
    console.log(`   📦  folded CSS → ${t.name} (${t.cssContent.length} chars)`);
  }
  console.log(`✅  CSS fold: ${folded} folded, ${alreadyFolded} already done, ` +
              `${needFold.length - folded - alreadyFolded} skipped\n`);

  // 2. Promote platform-owned templates to global
  const candidates = await ReportTemplate.find({
    isGlobal: { $ne: true },
    isDeleted: { $ne: true },
    $or: [
      { createdBySuperAdmin: { $ne: null } },
      { name: { $in: BUNDLED } },
    ],
  }).select('_id name schoolId createdBySuperAdmin').lean();

  if (!candidates.length) {
    console.log('✅  Global promotion: nothing to promote\n');
  } else if (!PROMOTE || DRY) {
    console.log(`ℹ️   Global promotion: ${candidates.length} candidate(s) — re-run with --promote to apply`);
    candidates.forEach(t =>
      console.log(`     · ${t.name}  (school ${t.schoolId || 'none'}${t.createdBySuperAdmin ? ', superadmin-authored' : ', bundled name'})`)
    );
    console.log('');
  } else {
    // Collapse duplicates: the same bundled template may exist once per school.
    // Keep the first as the global copy; leave the rest school-owned and
    // untouched so no school loses a template it may have selected.
    const seen = new Set();
    let promoted = 0, leftAlone = 0;
    for (const t of candidates) {
      if (seen.has(t.name)) { leftAlone++; continue; }
      seen.add(t.name);
      await ReportTemplate.updateOne(
        { _id: t._id },
        { $set: { isGlobal: true, schoolId: null } },
      );
      promoted++;
      console.log(`   🌐  promoted → ${t.name}`);
    }
    console.log(`✅  Global promotion: ${promoted} promoted, ${leftAlone} duplicate(s) left school-owned\n`);
  }

  // Summary
  const [globals, schoolOwned] = await Promise.all([
    ReportTemplate.countDocuments({ isGlobal: true,   isDeleted: { $ne: true } }),
    ReportTemplate.countDocuments({ isGlobal: { $ne: true }, isDeleted: { $ne: true } }),
  ]);
  console.log('═'.repeat(56));
  console.log(`  Global templates      : ${globals}`);
  console.log(`  School-owned (legacy) : ${schoolOwned}`);
  console.log('═'.repeat(56));
  console.log('  Legacy school templates still resolve — nothing was deleted.\n');

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('\n❌  Migration failed:', err.message);
  console.error(err);
  process.exit(1);
});
