// Seeds an academic session, classes, sections, and student users + profiles

require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const connect = require('../src/core/config/database');

const seedAdmissions = async () => {
  try {
    await connect();

    const AcademicSession = require('../src-old/models/AcademicSession');
    const ClassModel = require('../src-old/models/ClassModel');
    const SectionModel = require('../src-old/models/SectionModel');
    const StudentProfile = require('../src-old/models/StudentProfile');
    const { User } = require('../src/modules/identity');

    // 1. Academic Session
    let session = await AcademicSession.findOne({ name: '2025-26' });
    if (!session) {
      session = await AcademicSession.create({
        name: '2025-26',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        isActive: true,
      });
      console.log('✅ Academic Session created: 2025-26');
    } else {
      console.log('⚠️  Academic Session already exists: 2025-26');
    }

    // 2. Classes
    const classData = [
      { name: '10th', numericOrder: 10 },
      { name: '11th', numericOrder: 11 },
      { name: '12th', numericOrder: 12 },
    ];

    const classes = {};
    for (const cls of classData) {
      let existing = await ClassModel.findOne({ name: cls.name, session: session._id });
      if (!existing) {
        existing = await ClassModel.create({ ...cls, session: session._id });
        console.log(`✅ Class created: ${cls.name}`);
      } else {
        console.log(`⚠️  Class already exists: ${cls.name}`);
      }
      classes[cls.name] = existing;
    }

    // 3. Sections
    const sectionNames = ['A', 'B'];
    const sections = {};

    for (const [className, classDoc] of Object.entries(classes)) {
      sections[className] = {};
      for (const secName of sectionNames) {
        let existing = await SectionModel.findOne({
          name: secName,
          classId: classDoc._id,
          session: session._id,
        });
        if (!existing) {
          existing = await SectionModel.create({
            name: secName,
            classId: classDoc._id,
            session: session._id,
          });
          console.log(`✅ Section created: ${className} - ${secName}`);
        } else {
          console.log(`⚠️  Section already exists: ${className} - ${secName}`);
        }
        sections[className][secName] = existing;
      }
    }

    // 4. Demo Students
    const demoStudents = [
      {
        firstName: 'Aarav',   lastName: 'Sharma',   email: 'aarav.sharma@school.com',
        rollNo: 'STU001', admissionNumber: 'ADM2025001', gender: 'male',
        dateOfBirth: '2008-05-12', bloodGroup: 'B+', phone: '9876543210',
        class: '10th', section: 'A',
        father: { name: 'Rajesh Sharma', occupation: 'Engineer', phone: '9876543200' },
        mother: { name: 'Priya Sharma',  occupation: 'Teacher',  phone: '9876543201' },
        address: { city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      },
      {
        firstName: 'Diya',    lastName: 'Patel',    email: 'diya.patel@school.com',
        rollNo: 'STU002', admissionNumber: 'ADM2025002', gender: 'female',
        dateOfBirth: '2008-09-23', bloodGroup: 'A+', phone: '9876543211',
        class: '10th', section: 'A',
        father: { name: 'Manish Patel',  occupation: 'Business', phone: '9876543202' },
        mother: { name: 'Sunita Patel',  occupation: 'Homemaker', phone: '9876543203' },
        address: { city: 'Udaipur', state: 'Rajasthan', pincode: '313001' },
      },
      {
        firstName: 'Rohan',   lastName: 'Verma',    email: 'rohan.verma@school.com',
        rollNo: 'STU003', admissionNumber: 'ADM2025003', gender: 'male',
        dateOfBirth: '2007-03-15', bloodGroup: 'O+', phone: '9876543212',
        class: '10th', section: 'B',
        father: { name: 'Suresh Verma',  occupation: 'Doctor',   phone: '9876543204' },
        mother: { name: 'Meena Verma',   occupation: 'Nurse',    phone: '9876543205' },
        address: { city: 'Jodhpur', state: 'Rajasthan', pincode: '342001' },
      },
      {
        firstName: 'Ananya',  lastName: 'Singh',    email: 'ananya.singh@school.com',
        rollNo: 'STU004', admissionNumber: 'ADM2025004', gender: 'female',
        dateOfBirth: '2007-11-08', bloodGroup: 'AB+', phone: '9876543213',
        class: '11th', section: 'A',
        father: { name: 'Vikram Singh',  occupation: 'Lawyer',   phone: '9876543206' },
        mother: { name: 'Kavita Singh',  occupation: 'Teacher',  phone: '9876543207' },
        address: { city: 'Kota', state: 'Rajasthan', pincode: '324001' },
      },
      {
        firstName: 'Kabir',   lastName: 'Mehta',    email: 'kabir.mehta@school.com',
        rollNo: 'STU005', admissionNumber: 'ADM2025005', gender: 'male',
        dateOfBirth: '2007-07-20', bloodGroup: 'B-', phone: '9876543214',
        class: '11th', section: 'A',
        father: { name: 'Amit Mehta',    occupation: 'CA',       phone: '9876543208' },
        mother: { name: 'Ritu Mehta',    occupation: 'Homemaker', phone: '9876543209' },
        address: { city: 'Ajmer', state: 'Rajasthan', pincode: '305001' },
      },
      {
        firstName: 'Ishaan',  lastName: 'Gupta',    email: 'ishaan.gupta@school.com',
        rollNo: 'STU006', admissionNumber: 'ADM2025006', gender: 'male',
        dateOfBirth: '2006-01-30', bloodGroup: 'A-', phone: '9876543215',
        class: '11th', section: 'B',
        father: { name: 'Deepak Gupta',  occupation: 'Banker',   phone: '9876543220' },
        mother: { name: 'Neha Gupta',    occupation: 'Doctor',   phone: '9876543221' },
        address: { city: 'Bikaner', state: 'Rajasthan', pincode: '334001' },
      },
      {
        firstName: 'Priya',   lastName: 'Joshi',    email: 'priya.joshi@school.com',
        rollNo: 'STU007', admissionNumber: 'ADM2025007', gender: 'female',
        dateOfBirth: '2006-06-14', bloodGroup: 'O-', phone: '9876543216',
        class: '12th', section: 'A',
        father: { name: 'Sanjay Joshi',  occupation: 'Professor', phone: '9876543222' },
        mother: { name: 'Asha Joshi',    occupation: 'Teacher',  phone: '9876543223' },
        address: { city: 'Jaipur', state: 'Rajasthan', pincode: '302002' },
      },
      {
        firstName: 'Arjun',   lastName: 'Yadav',    email: 'arjun.yadav@school.com',
        rollNo: 'STU008', admissionNumber: 'ADM2025008', gender: 'male',
        dateOfBirth: '2006-04-05', bloodGroup: 'B+', phone: '9876543217',
        class: '12th', section: 'A',
        father: { name: 'Ramesh Yadav',  occupation: 'Farmer',   phone: '9876543224' },
        mother: { name: 'Sarita Yadav',  occupation: 'Homemaker', phone: '9876543225' },
        address: { city: 'Sikar', state: 'Rajasthan', pincode: '332001' },
      },
      {
        firstName: 'Sneha',   lastName: 'Agarwal',  email: 'sneha.agarwal@school.com',
        rollNo: 'STU009', admissionNumber: 'ADM2025009', gender: 'female',
        dateOfBirth: '2006-12-19', bloodGroup: 'AB-', phone: '9876543218',
        class: '12th', section: 'B',
        father: { name: 'Vinod Agarwal', occupation: 'Business', phone: '9876543226' },
        mother: { name: 'Shalu Agarwal', occupation: 'Homemaker', phone: '9876543227' },
        address: { city: 'Alwar', state: 'Rajasthan', pincode: '301001' },
      },
      {
        firstName: 'Vivaan',  lastName: 'Chauhan',  email: 'vivaan.chauhan@school.com',
        rollNo: 'STU010', admissionNumber: 'ADM2025010', gender: 'male',
        dateOfBirth: '2006-08-25', bloodGroup: 'A+', phone: '9876543219',
        class: '12th', section: 'B',
        father: { name: 'Mohan Chauhan', occupation: 'Govt. Job', phone: '9876543228' },
        mother: { name: 'Sunita Chauhan', occupation: 'Teacher', phone: '9876543229' },
        address: { city: 'Bharatpur', state: 'Rajasthan', pincode: '321001' },
      },
    ];

    const hashedPassword = await bcryptjs.hash('student123', 10);
    let created = 0, skipped = 0;

    for (const s of demoStudents) {
      const exists = await User.findOne({ email: s.email });
      if (exists) {
        console.log(`⚠️  Student already exists: ${s.email}`);
        skipped++;
        continue;
      }

      const user = await User.create({
        firstName: s.firstName,
        lastName:  s.lastName,
        email:     s.email,
        password:  hashedPassword,
        phone:     s.phone,
        role:      'student',
        isActive:  true,
        isVerified: true,
      });

      await StudentProfile.create({
        userId:          user._id,
        admissionNumber: s.admissionNumber,
        rollNo:          s.rollNo,
        firstName:       s.firstName,
        lastName:        s.lastName,
        gender:          s.gender,
        dateOfBirth:     new Date(s.dateOfBirth),
        bloodGroup:      s.bloodGroup,
        phone:           s.phone,
        nationality:     'Indian',
        classId:         classes[s.class]._id,
        sectionId:       sections[s.class][s.section]._id,
        session:         session._id,
        admissionDate:   new Date('2025-04-01'),
        address: {
          city:    s.address.city,
          state:   s.address.state,
          pincode: s.address.pincode,
        },
        parentDetails: {
          father: s.father,
          mother: s.mother,
        },
        status: 'active',
      });

      console.log(`✅ Student created: ${s.firstName} ${s.lastName} (${s.class}-${s.section}) → ${s.email}`);
      created++;
    }

    // 5. Admission Officer User
    const admissionEmail = 'admission@school.com';
    const admissionExists = await User.findOne({ email: admissionEmail });
    if (!admissionExists) {
      const admPass = await bcryptjs.hash('admission123', 10);
      await User.create({
        firstName:  'Admission',
        lastName:   'Officer',
        email:      admissionEmail,
        password:   admPass,
        role:       'admission',
        isActive:   true,
        isVerified: true,
      });
      console.log('\n✅ Admission Officer created!');
      console.log('   Email:    admission@school.com');
      console.log('   Password: admission123');
    } else {
      console.log('\n⚠️  Admission Officer already exists');
    }

    console.log('\n─────────────────────────────────────────');
    console.log('🎓 SEED COMPLETE');
    console.log(`   Students created : ${created}`);
    console.log(`   Students skipped : ${skipped}`);
    console.log('\n📋 Demo Login Credentials:');
    console.log('   Admin     → admin@school.com      / admin123');
    console.log('   Admission → admission@school.com  / admission123');
    console.log('   Students  → e.g. aarav.sharma@school.com / student123');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedAdmissions();
