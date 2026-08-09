const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, PASSWORD } = require('./helpers/fixtures');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

// The route runs multer's upload.none(), so the body must arrive as multipart
// form fields. Sending JSON gets an empty req.body and a 400 that looks like
// wrong credentials.
test('POST /api/v1/user/login returns 200 and sets the token cookie', async () => {
  const school = await createSchool('TESTA');
  await createUser({ school, role: 'admin', email: 'admin@test-a.com' });

  const res = await request(app)
    .post('/api/v1/user/login')
    .field('schoolCode', 'TESTA')
    .field('email', 'admin@test-a.com')
    .field('password', PASSWORD);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);

  const cookies = res.headers['set-cookie'] || [];
  const token = cookies.find((c) => c.startsWith('token='));

  expect(token).toBeDefined();
  // HttpOnly is what keeps the JWT away from page scripts
  expect(token).toMatch(/HttpOnly/i);
});
