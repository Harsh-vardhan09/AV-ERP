// Repairs users/profiles left with a missing or mismatched schoolId + active session

require('dotenv').config();
const mongoose = require('mongoose');
const connect  = require('../src/core/config/database');

const fix = async () => {
  await connect();

  const School          = require('../src/modules/tenancy').School;
  const { User }        = require('../src/modules/identity');
  const AcademicSession = require('../src-old/models/AcademicSession');
  const StudentProfile  = require('../src-old/models/StudentProfile');

  console.log('');
  console.log('=== DIAGNOSTIC REPORT ===');
  console.log('');

  // 1. All schools
  const schools = await School.find({}).select('name code _id');
  console.log('SCHOOLS in DB (' + schools.length + '):');
  schools.forEach(s => console.log('  [' + s.code + '] ' + s.name + ' => _id: ' + s._id));

  if (schools.length === 0) {
    console.log('ERROR: No schools found. Run seedMaster.js first.');
    await mongoose.connection.close();
    return;
  }

  // 2. All sessions
  const sessions = await AcademicSession.find({}).select('name isActive schoolId createdAt').sort({ createdAt: -1 });
  console.log('');
  console.log('SESSIONS in DB (' + sessions.length + '):');
  sessions.forEach(s => {
    const dateStr = s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : 'N/A';
    console.log('  "' + s.name + '" | isActive: ' + s.isActive + ' | schoolId: ' + s.schoolId + ' | created: ' + dateStr);
  });

  // 3. Admin user
  const adminUser = await User.findOne({ email: 'admin@school.com' }).select('email schoolId role');
  console.log('');
  if (adminUser) {
    console.log('USER admin@school.com => schoolId: ' + adminUser.schoolId + ' | role: ' + adminUser.role);
  } else {
    console.log('USER admin@school.com => NOT FOUND');
  }

  // 4. Teacher user
  const teacherUser = await User.findOne({ email: 'rc_teacher@school.com' }).select('email schoolId role');
  if (teacherUser) {
    console.log('USER rc_teacher@school.com => schoolId: ' + teacherUser.schoolId);
  } else {
    console.log('USER rc_teacher@school.com => NOT FOUND');
  }

  // 5. Students per schoolId
  const studentsBySchool = await StudentProfile.aggregate([
    { $group: { _id: '$schoolId', count: { $sum: 1 } } }
  ]);
  console.log('');
  console.log('STUDENTS per schoolId:');
  if (studentsBySchool.length === 0) {
    console.log('  (none found)');
  }
  studentsBySchool.forEach(g => console.log('  schoolId: ' + g._id + ' => ' + g.count + ' students'));

  // 6. DEMO2025 fix
  const demo = await School.findByCode('DEMO2025');
  console.log('');
  if (!demo) {
    console.log('DEMO2025 school => NOT FOUND. Run seedMaster.js first.');
    await mongoose.connection.close();
    return;
  }

  console.log('DEMO2025 school _id: ' + demo._id);

  // Fix session
  const demoSession = await AcademicSession.findOne({ schoolId: demo._id }).sort({ createdAt: -1 });
  if (demoSession) {
    console.log('Latest session for DEMO2025: "' + demoSession.name + '" | isActive: ' + demoSession.isActive);
    if (!demoSession.isActive) {
      console.log('FIX: Setting session isActive = true...');
      await AcademicSession.updateMany({ schoolId: demo._id }, { $set: { isActive: false } });
      await AcademicSession.findByIdAndUpdate(demoSession._id, { $set: { isActive: true } });
      console.log('DONE: Session "' + demoSession.name + '" is now active');
    } else {
      console.log('OK: Session already active');
    }
  } else {
    console.log('No session found for DEMO2025 school');
  }

  // Fix schoolId mismatch for admin
  console.log('');
  if (adminUser) {
    const adminSchoolId = adminUser.schoolId ? adminUser.schoolId.toString() : 'null';
    const demoId = demo._id.toString();
    if (adminSchoolId !== demoId) {
      console.log('MISMATCH: admin@school.com.schoolId = ' + adminSchoolId);
      console.log('          DEMO2025._id              = ' + demoId);
      console.log('FIX: Updating admin schoolId to match DEMO2025...');
      await User.findByIdAndUpdate(adminUser._id, { $set: { schoolId: demo._id } });
      console.log('DONE: admin@school.com.schoolId => ' + demoId);
    } else {
      console.log('OK: admin@school.com schoolId matches DEMO2025 (' + adminSchoolId + ')');
    }
  }

  if (teacherUser) {
    const teachSchoolId = teacherUser.schoolId ? teacherUser.schoolId.toString() : 'null';
    const demoId = demo._id.toString();
    if (teachSchoolId !== demoId) {
      console.log('MISMATCH: rc_teacher@school.com.schoolId = ' + teachSchoolId);
      console.log('FIX: Updating teacher schoolId to match DEMO2025...');
      await User.findByIdAndUpdate(teacherUser._id, { $set: { schoolId: demo._id } });
      console.log('DONE: rc_teacher@school.com.schoolId => ' + demoId);
    } else {
      console.log('OK: rc_teacher@school.com schoolId matches DEMO2025 (' + teachSchoolId + ')');
    }
  }

  // Fix all student profiles with wrong schoolId
  const studentsWrongSchool = await StudentProfile.countDocuments({ schoolId: { $ne: demo._id } });
  if (studentsWrongSchool > 0) {
    console.log('');
    console.log('WARNING: ' + studentsWrongSchool + ' student profiles have a different schoolId');
    console.log('FIX: Not auto-fixing students (could affect other schools). Check manually.');
  }

  console.log('');
  console.log('=== DIAGNOSTIC COMPLETE ===');
  console.log('Next steps:');
  console.log('  1. If fix was applied -> restart backend, then reload browser');
  console.log('  2. Log in as admin@school.com and open Admin -> Students');
  console.log('  3. Check backend console for [getAdminStudents] debug lines');
  console.log('');

  await mongoose.connection.close();
  process.exit(0);
};

fix().catch(err => {
  console.error('Script failed:', err.message || err);
  mongoose.connection.close();
  process.exit(1);
});
