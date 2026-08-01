#!/usr/bin/env node
/**
 * Seed orchestrator — runs every seed file in dependency order.
 *
 *   npm run seed:all
 *
 * Each seed runs as its own child process, so the process.exit() /
 * mongoose.disconnect() at the bottom of each file can't kill the run.
 *
 * Edit the SEEDS array below to change what runs:
 *   enabled  — false skips it entirely (logged as SKIPPED)
 *   required — true aborts the whole run on failure; false warns and continues
 *
 * Super admin password comes from SEED_SUPERADMIN_PASSWORD. Never hardcode it.
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const RUNNER  = path.join(__dirname, '_runner.js');
const BACKEND = path.join(__dirname, '..');

const SA_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

// ── Ordered run-list ─────────────────────────────────────────────────────────
const SEEDS = [
  {
    file: 'seedSuperAdmin.js',
    args: SA_PASSWORD ? ['--password', SA_PASSWORD] : [],
    enabled: Boolean(SA_PASSWORD),
    required: false,
    note: SA_PASSWORD ? '' : 'set SEED_SUPERADMIN_PASSWORD to enable',
  },
  {
    file: 'seedSchool.js',
    enabled: true,
    required: true,           // creates School DEMO2025 — everything below hangs off it
  },
  {
    file: 'seedAdmin.js',
    enabled: true,
    required: false,          // no-op once seedSchool.js has made admin@school.com
  },
  {
    file: 'admissionSeed.js',
    enabled: true,
    required: false,          // session 2025-26, classes, sections, students
    note: 'writes records without schoolId (pre-multi-tenancy)',
  },
  {
    file: 'teacherSeed.js',
    enabled: true,
    required: false,
    note: 'writes records without schoolId (pre-multi-tenancy)',
  },
  {
    file: 'seedReportCard.js',
    enabled: true,
    required: false,          // self-contained: builds its own school (code 001100)
  },
  {
    file: 'seedReportCardDemo.js',
    enabled: true,
    required: false,          // fills DEMO2025 for the report card walkthrough
    note: 'needs seedSchool.js; seeds no marks so the readiness gate is demoable',
  },
  {
    // MUST run before seedReportTemplates: it promotes pre-split school-owned
    // bundled templates to global. Seeding first would create global copies
    // alongside the school-owned originals, leaving duplicates behind.
    file: '../scripts/migrateGlobalTemplates.js',
    args: ['--promote'],
    enabled: true,
    required: false,
    note: 'folds legacy cssContent into htmlContent + promotes bundled templates to global',
  },
  {
    file: 'seedReportTemplates.js',
    enabled: true,
    required: false,          // registers the bundled HTML templates (global)
    note: 're-run after editing src/templates/*.html to push changes through',
  },
  {
    file: 'oases_seed.js',
    enabled: true,
    required: false,          // needs an admin with schoolId; wipes prior OASES demo data
  },

  // ── Off by default ─────────────────────────────────────────────────────────
  {
    file: 'seedMaster.js',
    enabled: false,
    required: false,
    note: 'superset of seedSchool/Admin/admissionSeed/teacherSeed, correctly scoped — turn those off if you enable this',
  },
  {
    file: 'seedAdmission.js',
    enabled: false,
    required: false,
    note: 'hardcodes a foreign schoolId — creates an orphan user on a fresh DB',
  },
  {
    file: 'seedHMHSS00022FormConfig.js',
    enabled: false,
    required: false,
    note: 'requires school HMHSS00022 to already exist',
  },
];

// ── Run ──────────────────────────────────────────────────────────────────────
const results = [];

console.log('\n🌱  Seeding — %d of %d entries enabled\n', SEEDS.filter(s => s.enabled).length, SEEDS.length);

for (const seed of SEEDS) {
  if (!seed.enabled) {
    console.log(`⏭️   SKIP  ${seed.file}${seed.note ? `  — ${seed.note}` : ''}`);
    results.push({ ...seed, status: 'skipped' });
    continue;
  }

  console.log(`\n${'─'.repeat(70)}\n▶️   ${seed.file}${seed.note ? `  (${seed.note})` : ''}\n${'─'.repeat(70)}`);

  const { status, error } = spawnSync(
    process.execPath,
    [RUNNER, seed.file, ...(seed.args || [])],
    { stdio: 'inherit', cwd: BACKEND, env: process.env }   // cwd = backend so dotenv finds .env
  );

  if (error) {
    console.error(`❌  ${seed.file} failed to launch: ${error.message}`);
    results.push({ ...seed, status: 'failed' });
  } else if (status !== 0) {
    console.error(`❌  ${seed.file} exited with code ${status}`);
    results.push({ ...seed, status: 'failed' });
  } else {
    results.push({ ...seed, status: 'ran' });
    continue;
  }

  if (seed.required) {
    console.error(`\n🛑  ${seed.file} is required — aborting the run.`);
    break;
  }
  console.warn(`⚠️   Continuing (required: false).`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
const ICON  = { ran: '✅', skipped: '⏭️ ', failed: '❌' };
const count = (s) => results.filter(r => r.status === s).length;
const aborted = results.length < SEEDS.length;

console.log(`\n${'═'.repeat(70)}\n  SEED SUMMARY\n${'═'.repeat(70)}`);
for (const r of results) {
  console.log(`  ${ICON[r.status]}  ${r.status.toUpperCase().padEnd(8)} ${r.file}`);
}
for (const s of SEEDS.slice(results.length)) {
  console.log(`  ⏹️   NOT RUN  ${s.file}`);
}
console.log('─'.repeat(70));
console.log(`  ran: ${count('ran')}   skipped: ${count('skipped')}   failed: ${count('failed')}${aborted ? `   not run: ${SEEDS.length - results.length}` : ''}`);
console.log(`${'═'.repeat(70)}\n`);

process.exit(count('failed') > 0 ? 1 : 0);
