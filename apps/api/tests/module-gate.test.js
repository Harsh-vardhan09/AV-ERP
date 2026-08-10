const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');
const { SchoolSettings } = require('../src/modules/tenancy');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

// checkModuleAccess fails OPEN on a DB error so an infra blip cannot lock a
// school out. That makes the closed path the one worth pinning down: a module
// switched off has to answer 403, not fall through to the handler.
//
// Since every registry module is now canDisable:false, the stored flag is no
// longer what decides — the registry is. Both directions are pinned below,
// each with the database deliberately set to the opposite of the answer.
test('a retired module answers 403 even when the school has it stored as on', async () => {
  const school = await createSchool('GATED');
  const admin = await createUser({ school, role: 'admin', email: 'admin@gated.com' });

  await SchoolSettings.create({ schoolId: school._id, modules: { library: true } });

  const res = await request(app).get('/api/v1/library/dashboard').set('Cookie', authCookie(admin));

  expect(res.status).toBe(403);
  expect(res.body.moduleDisabled).toBe(true);
  expect(res.body.module).toBe('library');
});

test('an always-on module is not gated off by a stale stored false', async () => {
  const school = await createSchool('ALWAYSON');
  const admin = await createUser({ school, role: 'admin', email: 'admin@alwayson.com' });

  await SchoolSettings.create({ schoolId: school._id, modules: { documents: false } });

  const res = await request(app).get('/api/v1/documents/tc').set('Cookie', authCookie(admin));

  expect(res.body.moduleDisabled).toBeUndefined();
  expect(res.status).not.toBe(403);
});
