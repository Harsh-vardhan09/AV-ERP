const { User } = require('../src/modules/identity');
const { School } = require('../src/modules/tenancy');
const db = require('./helpers/db');

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clear);

test('null emails are stripped before saving so a school can have several users without an email', async () => {
  const school = await School.create({
    code: 'NULLEMAIL',
    name: 'Null Email School',
    isActive: true,
  });

  await User.create({
    firstName: 'Alpha',
    lastName: 'User',
    email: null,
    password: 'hashed-password',
    role: 'student',
    schoolId: school._id,
  });

  await expect(
    User.create({
      firstName: 'Beta',
      lastName: 'User',
      email: null,
      password: 'hashed-password',
      role: 'student',
      schoolId: school._id,
    })
  ).resolves.toMatchObject({
    firstName: 'Beta',
    schoolId: school._id,
    email: undefined,
  });

  const users = await User.find({ schoolId: school._id }).lean();
  expect(users).toHaveLength(2);
  expect(users.every((u) => u.email === undefined || u.email === null)).toBe(true);
});
