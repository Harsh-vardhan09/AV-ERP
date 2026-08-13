const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');

const { Attendance } = require('../src/modules/attendance');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const oid = () => new mongoose.Types.ObjectId();

/** A school with one class/section and three students, ready to import against. */
const seedSchool = async () => {
  const school = await createSchool('IMP');
  const schoolId = school._id;
  const admin = await createUser({ school, role: 'admin', email: 'admin@imp.com' });

  const classId = oid();
  const sectionId = oid();
  const c = mongoose.connection.collection.bind(mongoose.connection);

  await c('classmodels').insertOne({ _id: classId, name: '10', numericOrder: 10, schoolId });
  await c('sectionmodels').insertOne({ _id: sectionId, name: 'A', schoolId });

  const session = await require('../src/modules/academics').AcademicSession.create({
    name: '2025-26',
    schoolId,
    isActive: true,
    startDate: new Date('2025-04-01'),
    endDate: new Date('2026-03-31'),
  });

  const admissionNos = ['ADM-2500001', 'ADM-2500002', 'ADM-2500003'];
  for (let i = 0; i < admissionNos.length; i++) {
    await c('studentprofiles').insertOne({
      schoolId,
      userId: oid(),
      firstName: `Student${i + 1}`,
      lastName: 'Test',
      admissionNumber: admissionNos[i],
      rollNo: `R-${i + 1}`,
      scholarNo: `SC-${i + 1}`,
      studentId: `STU-${i + 1}`,
      dateOfBirth: new Date('2009-01-01'),
      classId,
      sectionId,
      session: session._id,
      status: 'active',
      isDeleted: false,
      createdAt: new Date(),
    });
  }

  return { school, schoolId, admin, classId, sectionId, session, admissionNos };
};

const upload = (agent, cookie, csv, entity = 'attendance', path = '/api/v1/import/preview') =>
  agent
    .post(path)
    .set('Cookie', cookie)
    .field('entity', entity)
    .attach('file', Buffer.from(csv, 'utf8'), { filename: 'a.csv', contentType: 'text/csv' });

// THE ROUND TRIP — the deliverable. Download the template, keep its sample rows,
// upload it back, expect zero invalid rows and real attendance written.
test('the downloaded template round-trips with 0 invalid rows', async () => {
  const s = await seedSchool();
  const cookie = authCookie(s.admin);

  const tpl = await request(app).get('/api/v1/import/template/attendance').set('Cookie', cookie);

  expect(tpl.status).toBe(200);
  expect(tpl.headers['content-type']).toMatch(/text\/csv/);

  const csv = tpl.text;
  console.log('\n──── downloaded template ────\n' + csv);

  const [header, ...rows] = csv.trim().split(/\r?\n/);
  expect(header).toMatch(/\*/); // required columns are marked
  expect(rows.length).toBeGreaterThanOrEqual(2);

  // Upload it back verbatim
  const preview = await upload(request(app), cookie, csv);
  expect(preview.status).toBe(200);
  console.log(
    '\n──── preview of the same file ────\n' +
      `totalRows=${preview.body.totalRows} validRows=${preview.body.validRows} ` +
      `invalidRows=${preview.body.invalidRows}\nmapping=${JSON.stringify(preview.body.columnMapping)}\n` +
      `unmapped=${JSON.stringify(preview.body.unmappedColumns)}`
  );

  expect(preview.body.invalidRows).toBe(0);
  expect(preview.body.validRows).toBe(rows.length);

  // And it actually imports
  const started = await upload(request(app), cookie, csv, 'attendance', '/api/v1/import/start');
  expect(started.status).toBe(200);
  console.log('\n──── import result ────\n' + JSON.stringify(started.body, null, 1).slice(0, 600));

  const docs = await Attendance.find({ schoolId: s.schoolId }).lean();
  expect(docs).toHaveLength(1); // one class+section+date document
  expect(docs[0].schoolId).toBeDefined();
  expect(docs[0].records).toHaveLength(3);

  const byStatus = docs[0].records.map((r) => r.status).sort();
  expect(byStatus).toEqual(['absent', 'late', 'present']);
});

test('accepts DD/MM/YYYY, YYYY-MM-DD, Excel serials and P/A/L in any casing', async () => {
  const s = await seedSchool();
  const cookie = authCookie(s.admin);

  // 45672 is the Excel serial for 2025-01-15
  const csv = [
    'Admission No,Date,Status',
    'ADM-2500001,15/01/2025,p',
    'ADM-2500002,2025-01-15,ABSENT',
    'ADM-2500003,45672,L',
  ].join('\n');

  const preview = await upload(request(app), cookie, csv);
  expect(preview.body.invalidRows).toBe(0);

  await upload(request(app), cookie, csv, 'attendance', '/api/v1/import/start');

  const docs = await Attendance.find({ schoolId: s.schoolId }).lean();
  // all three dates are the same day, so they land on ONE document
  expect(docs).toHaveLength(1);
  expect(docs[0].records.map((r) => r.status).sort()).toEqual(['absent', 'late', 'present']);
});

test('roll number works in place of admission number', async () => {
  const s = await seedSchool();
  const cookie = authCookie(s.admin);
  const csv = ['Roll No,Date,Status', 'R-1,15/01/2025,P'].join('\n');

  await upload(request(app), cookie, csv, 'attendance', '/api/v1/import/start');

  const docs = await Attendance.find({ schoolId: s.schoolId }).lean();
  expect(docs).toHaveLength(1);
  expect(docs[0].records).toHaveLength(1);
});

test('re-importing the same day updates rather than duplicating', async () => {
  const s = await seedSchool();
  const cookie = authCookie(s.admin);

  await upload(
    request(app),
    cookie,
    'Admission No,Date,Status\nADM-2500001,15/01/2025,P',
    'attendance',
    '/api/v1/import/start'
  );
  await upload(
    request(app),
    cookie,
    'Admission No,Date,Status\nADM-2500001,15/01/2025,A',
    'attendance',
    '/api/v1/import/start'
  );

  const docs = await Attendance.find({ schoolId: s.schoolId }).lean();
  expect(docs).toHaveLength(1);
  expect(docs[0].records).toHaveLength(1);
  expect(docs[0].records[0].status).toBe('absent'); // corrected, not duplicated
});

// Validation must NOT have been weakened.
test('rows that would corrupt attendance still fail, with an actionable reason', async () => {
  const s = await seedSchool();
  const AttendanceAdapter = require('../src/modules/imports/adapters/attendanceAdapter');
  const CONFIG = require('../src/modules/imports/configs/attendanceImportConfig');
  const adapter = new AttendanceAdapter(CONFIG, {});
  const ctx = { schoolId: s.schoolId, userId: s.admin._id };

  const cases = [
    [{ studentId: 'NOPE-999', date: '15/01/2025', status: 'P' }, 'studentId'],
    [{ studentId: 'ADM-2500001', date: 'not-a-date', status: 'P' }, 'date'],
    [{ studentId: 'ADM-2500001', date: '15/01/2025', status: 'sick' }, 'status'],
    [{ studentId: 'ADM-2500001', date: '15/01/2025', status: '' }, 'status'],
    [{ studentId: '', date: '15/01/2025', status: 'P' }, 'studentId'],
    [{ studentId: 'ADM-2500001', date: '15/01/2025', status: 'P', className: '99' }, 'className'],
  ];

  console.log('\n──── rejected rows (field / value / message) ────');
  for (const [row, expectedField] of cases) {
    const res = await adapter.create(row, ctx);
    expect(res.success).toBe(false);
    const err = res.errors[0];
    console.log(
      `  ${String(err.field).padEnd(12)} ${JSON.stringify(err.value).padEnd(14)} ${err.message}`
    );
    expect(err.field).toBe(expectedField);
    expect(err.message.length).toBeGreaterThan(10);
  }

  expect(await Attendance.countDocuments({})).toBe(0);
});

test('half-day is rejected — it is not a status the model accepts', async () => {
  const s = await seedSchool();
  const AttendanceAdapter = require('../src/modules/imports/adapters/attendanceAdapter');
  const CONFIG = require('../src/modules/imports/configs/attendanceImportConfig');
  const adapter = new AttendanceAdapter(CONFIG, {});

  const res = await adapter.create(
    { studentId: 'ADM-2500001', date: '15/01/2025', status: 'half-day' },
    { schoolId: s.schoolId, userId: s.admin._id }
  );
  expect(res.success).toBe(false);
  expect(res.errors[0].field).toBe('status');
  expect(res.errors[0].message).toMatch(/present, absent, late, leave/);
});

// Deliverable: every row error must name the row, the column, the offending
// value, and what was expected — enough for a school to fix the file unaided.
test('ImportError rows carry rowNumber, field, value and an expectation', async () => {
  const s = await seedSchool();
  const cookie = authCookie(s.admin);
  const ImportError = require('../src/modules/imports/models/ImportError');

  const csv = [
    'Admission No,Date,Status',
    'ADM-2500001,15/01/2025,P', // good
    'NOPE-999,15/01/2025,P', // unknown student
    'ADM-2500002,15/01/2025,sick', // bad status
  ].join('\n');

  await upload(request(app), cookie, csv, 'attendance', '/api/v1/import/start');

  const errs = await ImportError.find({ schoolId: s.schoolId }).sort({ rowNumber: 1 }).lean();
  console.log('\n──── persisted ImportError rows ────');
  errs.forEach((e) =>
    console.log(
      `  row ${e.rowNumber} | field=${e.field} | value=${JSON.stringify(e.value)} | ${e.errorMessage}`
    )
  );

  expect(errs).toHaveLength(2);
  for (const e of errs) {
    expect(typeof e.rowNumber).toBe('number');
    expect(e.field).toBeTruthy();
    expect(e.value).toBeTruthy();
    expect(e.errorMessage.length).toBeGreaterThan(10);
  }
  expect(errs.map((e) => e.field)).toEqual(['studentId', 'status']);
});
