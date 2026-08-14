const mongoose = require('mongoose');

const { connect, clear, disconnect } = require('./helpers/db');
require('../src/app');

const ReportTemplate = require('../src/modules/reportcards/models/ReportTemplate');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const makeGlobal = (over = {}) =>
  ReportTemplate.create({
    name: 'Global CBSE',
    htmlContent: '<div>{{school-name}}</div>',
    isGlobal: true,
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(),
    ...over,
  });

// The Super Admin pressed Delete and the template stayed in the list. Cause:
// deleteGlobalTemplate sets `isDeleted = true`, but the path was never declared
// on the schema, so Mongoose strict mode silently discarded it — and the list
// filter `{ isDeleted: { $ne: true } }` then matched the row forever.
test('isDeleted is a real schema path, not silently dropped', async () => {
  expect('isDeleted' in ReportTemplate.schema.paths).toBe(true);
  expect(ReportTemplate.schema.options.strict).toBe(true);

  const t = await makeGlobal();
  expect(t.isDeleted).toBe(false); // defaults, so existing rows read as not-deleted
});

test('a soft-deleted global template actually persists the flag', async () => {
  const t = await makeGlobal();

  // Verbatim from globalTemplateController.deleteGlobalTemplate
  t.isDeleted = true;
  t.isActive = false;
  await t.save();

  const raw = await mongoose.connection.collection('reporttemplates').findOne({ _id: t._id });
  expect(raw.isDeleted).toBe(true);
  expect(raw.isActive).toBe(false);
});

test('a soft-deleted template disappears from the Super Admin list query', async () => {
  const kept = await makeGlobal({ name: 'Keep me' });
  const gone = await makeGlobal({ name: 'Delete me' });

  gone.isDeleted = true;
  gone.isActive = false;
  await gone.save();

  // Verbatim from globalTemplateController.listGlobalTemplates
  const listed = await ReportTemplate.find({ isGlobal: true, isDeleted: { $ne: true } }).lean();

  expect(listed.map((t) => t.name)).toEqual(['Keep me']);
  expect(listed).toHaveLength(1);
  expect(String(listed[0]._id)).toBe(String(kept._id));
});

test('a soft-deleted template is not fetchable by id either', async () => {
  const t = await makeGlobal();
  t.isDeleted = true;
  await t.save();

  // Verbatim from getGlobalTemplate / updateGlobalTemplate
  const found = await ReportTemplate.findOne({
    _id: t._id,
    isGlobal: true,
    isDeleted: { $ne: true },
  });
  expect(found).toBeNull();
});
