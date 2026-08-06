// Seeds teacher users and their profiles

require('dotenv').config();
const bcryptjs = require('bcryptjs');
const connect = require('../src/core/config/database');

const seedTeachers = async () => {
  try {
    await connect();

    const TeacherProfile = require('../src-old/models/TeacherProfile');
    const { User } = require('../src/modules/identity');

    const demoTeachers = [
      {
        firstName: 'Ramesh',    lastName: 'Sharma',
        email: 'ramesh.sharma@school.com',  employeeId: 'EMP001',
        gender: 'male',   dateOfBirth: '1985-03-12',
        phone: '9812340001', qualification: 'M.Sc Mathematics',
        specialization: 'Mathematics', department: 'Science & Math',
        joiningDate: '2018-06-01',
        address: { city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      },
      {
        firstName: 'Sunita',    lastName: 'Verma',
        email: 'sunita.verma@school.com',   employeeId: 'EMP002',
        gender: 'female', dateOfBirth: '1988-07-25',
        phone: '9812340002', qualification: 'M.Sc Physics',
        specialization: 'Physics', department: 'Science & Math',
        joiningDate: '2019-04-15',
        address: { city: 'Jaipur', state: 'Rajasthan', pincode: '302002' },
      },
      {
        firstName: 'Anil',      lastName: 'Mehta',
        email: 'anil.mehta@school.com',     employeeId: 'EMP003',
        gender: 'male',   dateOfBirth: '1982-11-05',
        phone: '9812340003', qualification: 'M.Sc Chemistry',
        specialization: 'Chemistry', department: 'Science & Math',
        joiningDate: '2016-07-10',
        address: { city: 'Ajmer', state: 'Rajasthan', pincode: '305001' },
      },
      {
        firstName: 'Kavita',    lastName: 'Joshi',
        email: 'kavita.joshi@school.com',   employeeId: 'EMP004',
        gender: 'female', dateOfBirth: '1990-01-18',
        phone: '9812340004', qualification: 'M.A Hindi Literature',
        specialization: 'Hindi', department: 'Languages',
        joiningDate: '2020-06-01',
        address: { city: 'Kota', state: 'Rajasthan', pincode: '324001' },
      },
      {
        firstName: 'Deepak',    lastName: 'Singh',
        email: 'deepak.singh@school.com',   employeeId: 'EMP005',
        gender: 'male',   dateOfBirth: '1986-09-30',
        phone: '9812340005', qualification: 'M.A English Literature',
        specialization: 'English', department: 'Languages',
        joiningDate: '2017-08-20',
        address: { city: 'Udaipur', state: 'Rajasthan', pincode: '313001' },
      },
      {
        firstName: 'Pooja',     lastName: 'Gupta',
        email: 'pooja.gupta@school.com',    employeeId: 'EMP006',
        gender: 'female', dateOfBirth: '1992-04-22',
        phone: '9812340006', qualification: 'M.A History',
        specialization: 'Social Science', department: 'Social Studies',
        joiningDate: '2021-04-05',
        address: { city: 'Jodhpur', state: 'Rajasthan', pincode: '342001' },
      },
      {
        firstName: 'Vikas',     lastName: 'Yadav',
        email: 'vikas.yadav@school.com',    employeeId: 'EMP007',
        gender: 'male',   dateOfBirth: '1984-06-14',
        phone: '9812340007', qualification: 'MCA',
        specialization: 'Computer Science', department: 'Computer Science',
        joiningDate: '2015-06-01',
        address: { city: 'Bikaner', state: 'Rajasthan', pincode: '334001' },
      },
      {
        firstName: 'Nisha',     lastName: 'Patel',
        email: 'nisha.patel@school.com',    employeeId: 'EMP008',
        gender: 'female', dateOfBirth: '1991-12-08',
        phone: '9812340008', qualification: 'B.P.Ed, M.P.Ed',
        specialization: 'Physical Education', department: 'Sports',
        joiningDate: '2022-07-01',
        address: { city: 'Alwar', state: 'Rajasthan', pincode: '301001' },
      },
    ];

    const hashedPassword = await bcryptjs.hash('teacher123', 10);
    let created = 0, skipped = 0;

    for (const t of demoTeachers) {
      const exists = await User.findOne({ email: t.email });
      if (exists) {
        console.log(`⚠️  Already exists: ${t.email}`);
        skipped++;
        continue;
      }

      const user = await User.create({
        firstName:  t.firstName,
        lastName:   t.lastName,
        email:      t.email,
        password:   hashedPassword,
        phone:      t.phone,
        role:       'teacher',
        isActive:   true,
        isVerified: true,
      });

      await TeacherProfile.create({
        userId:         user._id,
        employeeId:     t.employeeId,
        firstName:      t.firstName,
        lastName:       t.lastName,
        gender:         t.gender,
        dateOfBirth:    new Date(t.dateOfBirth),
        qualification:  t.qualification,
        specialization: t.specialization,
        phone:          t.phone,
        department:     t.department,
        joiningDate:    new Date(t.joiningDate),
        address:        t.address,
        status:         'active',
      });

      console.log(`✅ Teacher created: ${t.firstName} ${t.lastName} (${t.specialization}) → ${t.email}`);
      created++;
    }

    console.log('\n─────────────────────────────────────────');
    console.log('👨‍🏫 TEACHER SEED COMPLETE');
    console.log(`   Teachers created : ${created}`);
    console.log(`   Teachers skipped : ${skipped}`);
    console.log('\n📋 Teacher Login Credentials:');
    console.log('   All teachers password → teacher123');
    console.log('   Example: ramesh.sharma@school.com / teacher123');
    console.log('\n   Departments seeded:');
    console.log('   • Science & Math  — Ramesh (Maths), Sunita (Physics), Anil (Chemistry)');
    console.log('   • Languages       — Kavita (Hindi), Deepak (English)');
    console.log('   • Social Studies  — Pooja (Social Science)');
    console.log('   • Computer Sci    — Vikas (CS)');
    console.log('   • Sports          — Nisha (Physical Education)');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedTeachers();
