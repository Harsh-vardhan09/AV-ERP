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
test('a request to a module disabled for the school returns 403', async () => {
  const school = await createSchool('GATED');
  const admin = await createUser({ school, role: 'admin', email: 'admin@gated.com' });

  await SchoolSettings.create({ schoolId: school._id, modules: { documents: false } });

  const res = await request(app).get('/api/v1/documents').set('Cookie', authCookie(admin));

  expect(res.status).toBe(403);
  expect(res.body.moduleDisabled).toBe(true);
  expect(res.body.module).toBe('documents');
});
