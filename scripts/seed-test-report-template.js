#!/usr/bin/env node
/* eslint-disable import/no-unresolved */
// Usage: node scripts/seed-test-report-template.js --schoolId=<id> --studentId=<id>
// Connects to DB using apps/api core env and renders a minimal report-card template

const argv = require('yargs').argv;
const env = require('../apps/api/src/core/config/env');
const mongoose = require('mongoose');

const MONGO =
  process.env.MONGO_URI || env.MONGO_URI || env.DATABASE_URL || process.env.DATABASE_URL;
if (!MONGO) {
  console.error(
    'No Mongo URI found. Set MONGO_URI or DATABASE_URL env or ensure apps/api/core/config/env exports it.'
  );
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const DataAggregatorService = require('../apps/api/src/modules/reportcards/services/dataAggregatorService');
    const TemplateParserService = require('../apps/api/src/modules/reportcards/services/templateParserService');

    const schoolId = argv.schoolId;
    const studentId = argv.studentId;
    const sessionId = argv.sessionId;

    if (!schoolId || !studentId || !sessionId) {
      console.error('Please provide --schoolId --studentId --sessionId');
      process.exit(1);
    }

    const data = await DataAggregatorService.getStudentSnapshot({ studentId, schoolId, sessionId });

    const tpl = `
    <h1>Test Report Template</h1>
    <p>Student: {{name}} ({{class}})</p>
    <table border="1">
      <tr><th>Subject</th><th>{{eng_obt_th}} (abbrev)</th><th>{{eng_obt_theory}} (long)</th></tr>
      <tr>
        <td>{{sub_1_name}}</td>
        <td>{{sub_1_obt_th}}</td>
        <td>{{sub_1_obt_theory}}</td>
      </tr>
    </table>
    <p>Grand total theory: {{gt_obt_th}}</p>
    `;

    const html = TemplateParserService.preview(tpl, data, { css: '' });
    console.log('----- Rendered HTML -----');
    console.log(html);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
