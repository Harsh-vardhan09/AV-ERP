const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie, insertStudent } = require('./helpers/fixtures');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

// Tenant isolation in this codebase is convention, not enforcement: there is no
// active mongoose plugin forcing schoolId onto queries, so a single dropped
// `schoolId: req.schoolId` leaks one school's roll into another's. Nothing else
// in the test suite or the type system would catch it.
test("a school admin's student list contains only that school's students", async () => {
  const schoolA = await createSchool('SCHOOLA');
  const schoolB = await createSchool('SCHOOLB');

  const adminA = await createUser({ school: schoolA, role: 'admin', email: 'admin@a.com' });

  await insertStudent({ school: schoolA, firstName: 'Amara', rollNo: 'A-1' });
  await insertStudent({ school: schoolA, firstName: 'Anil', rollNo: 'A-2' });
  await insertStudent({ school: schoolB, firstName: 'Bilal', rollNo: 'B-1' });

  const res = await request(app).get('/api/v1/admin/students').set('Cookie', authCookie(adminA));

  expect(res.status).toBe(200);

  const names = res.body.data.map((s) => s.firstName).sort();
  expect(names).toEqual(['Amara', 'Anil']);

  // Stated separately so a failure reads as a leak rather than a count mismatch
  const leaked = res.body.data.filter((s) => String(s.schoolId) !== String(schoolA._id));
  expect(leaked).toEqual([]);
});
