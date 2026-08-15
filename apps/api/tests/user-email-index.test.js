const mongoose = require('mongoose');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool } = require('./helpers/fixtures');
const { User } = require('../src/modules/identity');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const INDEX = 'email_1_schoolId_1';
const coll = () => mongoose.connection.collection('users');

const student = (n, over = {}) => ({
  firstName: `Student${n}`,
  lastName: 'S',
  password: 'x',
  role: 'student',
  isActive: true,
  ...over,
});

describe('registering students without an email', () => {
  test('many email-less students can register in the same school', async () => {
    const school = await createSchool('SCHOOLA');
    await User.syncIndexes();

    for (let i = 1; i <= 3; i++) {
      await User.create(student(i, { schoolId: school._id }));
    }
    expect(await User.countDocuments({ schoolId: school._id })).toBe(3);
  });

  test('a real email is still unique within a school', async () => {
    const school = await createSchool('SCHOOLA');
    await User.syncIndexes();

    await User.create(student(1, { schoolId: school._id, email: 'dup@a.com' }));
    await expect(
      User.create(student(2, { schoolId: school._id, email: 'dup@a.com' }))
    ).rejects.toThrow(/duplicate key/i);
  });

  test('the same email may exist in two different schools', async () => {
    const a = await createSchool('SCHOOLA');
    const b = await createSchool('SCHOOLB');
    await User.syncIndexes();

    await User.create(student(1, { schoolId: a._id, email: 'same@x.com' }));
    await User.create(student(2, { schoolId: b._id, email: 'same@x.com' }));
    expect(await User.countDocuments({ email: 'same@x.com' })).toBe(2);
  });

  // '' and null must be normalised to absent, or the partial filter
  // ({ email: { $type: 'string' } }) would still index an empty string.
  test('an empty-string email is stored as absent, not as ""', async () => {
    const school = await createSchool('SCHOOLA');
    await User.syncIndexes();

    await User.create(student(1, { schoolId: school._id, email: '' }));
    await User.create(student(2, { schoolId: school._id, email: null }));

    const rows = await coll().find({ schoolId: school._id }).toArray();
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.email).toBeUndefined();
  });
});

/**
 * The production failure was NOT a code bug — models/user.js already declared the
 * partial index. The deployed database still had the OLD plain unique index under
 * the same auto-generated name, and mongoose cannot replace it: createIndex with
 * a different spec under an existing name is refused, and the old index survives
 * every redeploy. Only migrations/2026-08-15-04 fixes it.
 */
describe('the stale-index failure mode', () => {
  test('a plain unique index rejects the second email-less student', async () => {
    const school = await createSchool('SCHOOLA');
    await User.syncIndexes();

    // Put the database back into the broken state production was in
    await coll()
      .dropIndex(INDEX)
      .catch(() => {});
    await coll().createIndex({ email: 1, schoolId: 1 }, { unique: true });

    await User.create(student(1, { schoolId: school._id }));
    await expect(User.create(student(2, { schoolId: school._id }))).rejects.toThrow(
      /E11000 duplicate key error.*email_1_schoolId_1/s
    );
  });

  test('redeploying cannot fix it — mongoose hits a name conflict', async () => {
    await createSchool('SCHOOLA');
    await User.syncIndexes();
    await coll()
      .dropIndex(INDEX)
      .catch(() => {});
    await coll().createIndex({ email: 1, schoolId: 1 }, { unique: true });

    // Exactly what autoIndex does on boot
    let err = null;
    try {
      await coll().createIndex(
        { email: 1, schoolId: 1 },
        { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
      );
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.codeName).toMatch(/IndexKeySpecsConflict|IndexOptionsConflict/);

    // …and the old index is still there, unchanged
    const idx = (await coll().indexes()).find((i) => i.name === INDEX);
    expect(idx.partialFilterExpression).toBeUndefined();
  });

  test('dropping and recreating with the filter resolves it', async () => {
    const school = await createSchool('SCHOOLA');
    await User.syncIndexes();
    await coll()
      .dropIndex(INDEX)
      .catch(() => {});
    await coll().createIndex({ email: 1, schoolId: 1 }, { unique: true });

    // What the migration does
    await coll().dropIndex(INDEX);
    await coll().createIndex(
      { email: 1, schoolId: 1 },
      { unique: true, partialFilterExpression: { email: { $type: 'string' } }, name: INDEX }
    );

    await User.create(student(1, { schoolId: school._id }));
    await User.create(student(2, { schoolId: school._id }));
    expect(await User.countDocuments({ schoolId: school._id })).toBe(2);

    // …and real duplicates are still caught
    await User.create(student(3, { schoolId: school._id, email: 'a@a.com' }));
    await expect(
      User.create(student(4, { schoolId: school._id, email: 'a@a.com' }))
    ).rejects.toThrow(/duplicate key/i);
  });
});

// The schema is the source of truth the migration restores the database to.
test('the schema declares the partial filter', () => {
  const idx = User.schema.indexes().find(([key]) => key.email === 1 && key.schoolId === 1);
  expect(idx).toBeTruthy();
  expect(idx[1].unique).toBe(true);
  expect(idx[1].partialFilterExpression).toEqual({ email: { $type: 'string' } });
});
