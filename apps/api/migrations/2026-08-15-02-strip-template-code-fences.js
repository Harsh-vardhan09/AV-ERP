// Removes markdown code fences (```) from stored report/admission template HTML.
//
// Templates are usually pasted out of a chat window, which wraps the markup in
// ```html … ``` fences. They were stored verbatim. At render time they become
// bare text nodes, and a text node between <table> and <tr> is not valid table
// content — so the HTML parser FOSTER-PARENTS it out of the table and drops it
// immediately above. That is why a stray ``` appears above every table rather
// than where it was written, and why no amount of CSS hides it.
//
// The save paths now strip fences on write (reportcards/lib/sanitizeTemplateHtml).
// This cleans what is already stored.
//
// IDEMPOTENT: a template with no fences is skipped, so re-running changes nothing.
// Fences inside <pre> or <code> are preserved — there they are content.
//
// Usage:
//   node migrations/2026-08-15-02-strip-template-code-fences.js          (dry run)
//   node migrations/2026-08-15-02-strip-template-code-fences.js --apply
//   ... [--schoolId <id>]

const mongoose = require('mongoose');
require('dotenv').config();

const { stripCodeFences } = require('../src/modules/reportcards/lib/sanitizeTemplateHtml');
const ReportTemplate = require('../src/modules/reportcards/models/ReportTemplate');

const APPLY = process.argv.includes('--apply');
const idx = process.argv.indexOf('--schoolId');
const SCHOOL_ID = idx !== -1 ? process.argv[idx + 1] : null;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY' : 'DRY RUN (no writes)'}`);

  // Only templates that actually contain a fence — keeps the scan cheap and the
  // re-run a no-op.
  const filter = { htmlContent: /```/ };
  if (SCHOOL_ID) filter.schoolId = new mongoose.Types.ObjectId(SCHOOL_ID);

  const templates = await ReportTemplate.find(filter).select('name schoolId htmlContent').lean();
  console.log(`\nFound ${templates.length} template(s) containing \`\`\`.`);

  let changed = 0;
  let untouched = 0;

  for (const t of templates) {
    const { html, removed } = stripCodeFences(t.htmlContent);
    if (!removed) {
      // Backticks present but not as a fence line — e.g. inside <code>. Leave it.
      untouched++;
      console.log(`  SKIP  "${t.name}" — backticks are content, not fences`);
      continue;
    }
    changed++;
    console.log(`  CLEAN "${t.name}" — ${removed} fence line(s)`);
    if (APPLY) {
      await ReportTemplate.updateOne({ _id: t._id }, { $set: { htmlContent: html } });
    }
  }

  console.log(
    `\n${APPLY ? '✅ Cleaned' : 'Would clean'} ${changed} template(s); ` +
      `${untouched} left alone (backticks were content).`
  );
  if (!APPLY && changed > 0) {
    console.log('Dry run — nothing written. Re-run with --apply.');
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
