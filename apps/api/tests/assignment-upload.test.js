const fs = require('fs');
const mongoose = require('mongoose');

// uploadoncloud unlinks the temp file once the upload succeeds. The controller
// used to hash the file AFTER that call, so every submission died on ENOENT and
// answered 500. The mock reproduces the unlink so the ordering stays enforced.
jest.mock('../src/core/config/storage.js', () => ({
  uploadoncloud: jest.fn(async (p) => {
    require('fs').unlinkSync(p);
    return { url: 'https://res.cloudinary.com/test/raw/upload/v1/erp/assignments/x.pdf' };
  }),
  uploadImageToCloud: jest.fn(),
  deleteFromCloud: jest.fn(),
  uploadPdfToCloud: jest.fn(),
}));

const { uploadoncloud } = require('../src/core/config/storage.js');
const { connect, clear, disconnect } = require('./helpers/db');
const controller = require('../src/modules/academics/controllers/uploadAssignmentController');
const Assignment = require('../src/modules/academics/models/assignment');
const Assignmentupload = require('../src/modules/academics/models/uploadassignment');
const { User } = require('../src/modules/identity');

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clear();
  uploadoncloud.mockClear();
});

const TMP = require('path').join(__dirname, 'zz-upload-fixture.pdf');

const runUpload = async ({ schoolId, assignmentid, studentid }) => {
  fs.writeFileSync(TMP, 'pretend pdf bytes');
  const req = {
    params: { assignmentid, studentid },
    file: { path: TMP, originalname: 'notes.pdf' },
    schoolId,
  };
  const res = {
    statusCode: null,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  const next = jest.fn();
  await controller.uploadassignment(req, res, next);
  return { res, next };
};

const seed = async () => {
  const schoolId = new mongoose.Types.ObjectId();
  const teacher = await User.create({
    firstName: 'T',
    lastName: 'One',
    email: 't@a.com',
    password: 'x',
    role: 'teacher',
    schoolId,
    isActive: true,
  });
  const student = await User.create({
    firstName: 'S',
    lastName: 'One',
    email: 's@a.com',
    password: 'x',
    role: 'student',
    schoolId,
    isActive: true,
  });
  const assignment = await Assignment.create({
    teacherid: teacher._id,
    title: 'A',
    description: 'd',
    dueDate: new Date(Date.now() + 864e5),
    subjectId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    session: new mongoose.Types.ObjectId(),
    schoolId,
  });
  return { schoolId, student, assignment };
};

afterEach(() => {
  try {
    fs.unlinkSync(TMP);
  } catch (_) {}
});

test('a submission survives uploadoncloud unlinking the temp file', async () => {
  const { schoolId, student, assignment } = await seed();

  const { res, next } = await runUpload({
    schoolId,
    assignmentid: assignment._id.toString(),
    studentid: student._id.toString(),
  });

  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(201);
  expect(res.body.success).toBe(true);

  const saved = await Assignmentupload.findOne({ assignmentid: assignment._id });
  expect(saved).not.toBeNull();
  expect(saved.photo).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  // the hash has to have been taken while the file still existed
  expect(saved.fileHash).toMatch(/^[a-f0-9]{64}$/);
});

test('a failed cloud upload throws ApiError and persists nothing', async () => {
  const { schoolId, student, assignment } = await seed();
  uploadoncloud.mockResolvedValueOnce(null);

  const { res, next } = await runUpload({
    schoolId,
    assignmentid: assignment._id.toString(),
    studentid: student._id.toString(),
  });

  expect(next).toHaveBeenCalledTimes(1);
  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(502);
  expect(res.statusCode).not.toBe(201);

  // the record must not exist with an unusable URL
  expect(await Assignmentupload.countDocuments({})).toBe(0);
});
