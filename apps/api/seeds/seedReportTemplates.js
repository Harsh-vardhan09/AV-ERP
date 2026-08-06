// Upserts the bundled HTML templates as global ReportTemplates.
// Re-run after editing a template file to push the change through

require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const mongoose = require('mongoose');
const connect  = require('../src/core/config/database');

const TEMPLATE_DIR = path.join(__dirname, '..', 'src', 'templates');
const SCHEMAS      = require('../src-old/templates/schemas');

const TEMPLATES = [
  {
    file:         'cbse_two_term_report_card.html',
    name:         'CBSE Two-Term Scholastic',
    description:  'CBSE-style annual card: Term I / Term II / Overall with nested headers, three co-scholastic parts, grading legend.',
    templateType: 'annual',
    schema:       SCHEMAS.CBSE_TWO_TERM,
    isDefault:    true,
  },
  {
    file:         'single_term_numeric_report_card.html',
    name:         'Single-Term Numeric',
    description:  'One scholastic table with numeric FA/SA marks out of 100, single co-scholastic block.',
    templateType: 'half_yearly',
    schema:       SCHEMAS.SINGLE_TERM_NUMERIC,
    isDefault:    false,
  },
  {
    file:         'compact_grade_card.html',
    name:         'Compact Grade Card',
    description:  'Minimal one-page grade-only card, suitable for lower classes.',
    templateType: 'custom',
    schema:       SCHEMAS.COMPACT_GRADE_CARD,
    isDefault:    false,
  },
];

const seed = async () => {
  await connect();

  const ReportTemplate = require('../src-old/models/ReportTemplate');

  console.log('\n🌱  Seeding bundled report card templates\n');

  // Bundled templates are GLOBAL — one shared copy for the whole platform,
  // authored by Super Admins and adopted per-school via
  // SchoolSettings.selectedReportTemplateId. No school scoping here.
  let created = 0, updated = 0;

  for (const t of TEMPLATES) {
    const htmlPath = path.join(TEMPLATE_DIR, t.file);
    if (!fs.existsSync(htmlPath)) {
      console.warn(`   ⚠️   Missing ${t.file} — skipped`);
      continue;
    }
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Upsert on (isGlobal, name) so re-seeding refreshes the HTML in place.
    const existing = await ReportTemplate.findOne({ isGlobal: true, name: t.name });

    if (existing) {
      existing.htmlContent    = htmlContent;
      existing.templateSchema = t.schema;
      existing.description    = t.description;
      existing.templateType   = t.templateType;
      existing.cssContent     = '';      // deprecated — inline CSS lives in the HTML
      existing.isActive       = true;
      await existing.save();
      updated++;
      console.log(`   ♻️   Updated  ${t.name}`);
    } else {
      await ReportTemplate.create({
        name:           t.name,
        description:    t.description,
        htmlContent,
        cssContent:     '',              // deprecated
        templateSchema: t.schema,
        templateType:   t.templateType,
        templateStatus: 'published',
        // Only the CBSE card claims default, and only if no global default exists.
        isDefault:      t.isDefault && !(await ReportTemplate.exists({ isGlobal: true, isDefault: true })),
        isActive:       true,
        isGlobal:       true,
        schoolId:       null,
      });
      created++;
      console.log(`   ✅  Created  ${t.name}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Global templates created: ${created}   updated: ${updated}`);
  console.log('═'.repeat(60));
  console.log('\n  Super Admin → Report Templates to author more.');
  console.log('  School Admin → Report Card Templates to pick the active one.\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err);
  process.exit(1);
});
