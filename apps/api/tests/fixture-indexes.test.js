const mongoose = require('mongoose');
const db = require('./helpers/db');
const { createSchool, insertStudent } = require('./helpers/fixtures');
const StudentProfile = require('../src/modules/people/models/StudentProfile');

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clear);

// This suite existed because the full run was intermittently red. StudentProfile
// declares four unique indexes compounded with schoolId (StudentProfile.js:340-343).
// They are marked sparse, but a COMPOUND sparse index only skips a document when
// every indexed field is missing — schoolId always present means an absent userId
// still indexes as null, and two such fixtures collide. Indexes outlive
// db.clear(), so the failure depended on which suite first built them.
test('insertStudent is collision-proof once the unique indexes exist', async () => {
  // Build every declared index up front — that is what made this order-dependent.
  await StudentProfile.syncIndexes();
  const idx = await mongoose.connection.collection('studentprofiles').indexes();
  console.log(
    '\nunique indexes present:',
    idx
      .filter((i) => i.unique)
      .map((i) => i.name)
      .join(', ')
  );

  const school = await createSchool('IDX');
  // Three students in the SAME school — the exact shape that was failing.
  await insertStudent({ school, firstName: 'Amara', rollNo: 'A-1' });
  await insertStudent({ school, firstName: 'Anil', rollNo: 'A-2' });
  await insertStudent({ school, firstName: 'Asha', rollNo: 'A-3' });

  expect(await mongoose.connection.collection('studentprofiles').countDocuments({})).toBe(3);
});
