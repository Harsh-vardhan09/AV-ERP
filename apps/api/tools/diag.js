require('dotenv').config();
const fs = require('fs');
const connect = require('../src/core/config/database');

const run = async () => {
  await connect();
  const School = require('../src/modules/tenancy').School;
  const { User } = require('../src/modules/identity');
  const AcademicSession = require('../src-old/models/AcademicSession');
  const StudentProfile = require('../src/modules/people/models/StudentProfile');

  const result = {};

  result.schools = await School.find({}).select('name code _id').lean();
  result.sessions = await AcademicSession.find({}).select('name isActive schoolId').lean();
  result.admin = await User.findOne({ email: 'admin@school.com' }).select('email schoolId role').lean();
  result.teacher = await User.findOne({ email: 'rc_teacher@school.com' }).select('email schoolId').lean();
  result.studentCounts = await StudentProfile.aggregate([
    { $group: { _id: '$schoolId', count: { $sum: 1 } } }
  ]);

  // Sample 3 students to see their fields
  result.sampleStudents = await StudentProfile.find({}).limit(3)
    .select('firstName lastName schoolId session classId rollNo status').lean();

  fs.writeFileSync('scripts/diag_result.json', JSON.stringify(result, null, 2));
  console.log('Done. See scripts/diag_result.json');
  process.exit(0);
};

run().catch(e => {
  fs.writeFileSync('scripts/diag_result.json', JSON.stringify({ error: e.message }, null, 2));
  process.exit(1);
});
