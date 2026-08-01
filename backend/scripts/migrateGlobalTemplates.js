/**
 * migrateGlobalTemplates.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two independent, idempotent migrations for ReportTemplate:
 *
 *  1. CSS FOLD — templates used to store htmlContent + a separate cssContent.
 *     Templates are now a single HTML document with inline CSS, so any existing
 *     cssContent is prepended to htmlContent inside a <style> block and the
 *     column is blanked. Marked with an HTML comment so re-runs skip it.
 *
 *  2. GLOBAL PROMOTION — report card templates are now authored by Super Admins
 *     and shared across schools (isGlobal:true, schoolId:null). Only templates
 *     that are clearly platform-owned are promoted:
 *        · createdBySuperAdmin is set, OR
 *        · the name matches one of the bundled templates (see BUNDLED)
 *     Everything else stays school-owned and keeps working — the resolver reads
 *     global + school-owned templates.
 *
 * NOTHING IS EVER DELETED. Promotion of a school-owned template detaches it
 * from that school, so by default promotion runs in report-only mode; pass
 * --promote to apply it.
 *
 * Usage:
 *   node scripts/migrateGlobalTemplates.js              # fold CSS, report promotions
 *   node scripts/migrateGlobalTemplates.js --promote    # also apply promotions
 *   node scripts/migrateGlobalTemplates.js --dry        # change nothing, just report
 */

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

  const ReportTemplate = require('../src/models/ReportTemplate');

  // ── 1. Fold cssContent into htmlContent ───────────────────────────────────
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

  // ── 2. Promote platform-owned templates to global ─────────────────────────
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

  // ── Summary ───────────────────────────────────────────────────────────────
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
