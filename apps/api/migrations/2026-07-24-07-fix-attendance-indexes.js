// Drops the unique attendance index and replaces it with a non-unique one.
// Must run before the de-duplication migration, which needs duplicates to be insertable

const mongoose = require('mongoose');
const Attendance = require('../src-old/models/attendance');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp';

async function fixAttendanceIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    console.log('\nChecking Attendance indexes...');
    const indexes = await Attendance.collection.getIndexes();
    console.log('Current indexes:', Object.keys(indexes));

    // Drop the unique index with schoolId
    const uniqueIndexName = 'schoolId_1_classId_1_sectionId_1_subjectId_1_date_1_attendanceType_1';
    
    if (indexes[uniqueIndexName]) {
      console.log(`\nFound unique index: ${uniqueIndexName}`);
      console.log('Dropping unique index...');
      await Attendance.collection.dropIndex(uniqueIndexName);
      console.log('Unique index dropped successfully');
    } else {
      console.log(`\nUnique index ${uniqueIndexName} not found. No action needed.`);
    }

    // Create non-unique index for efficient querying
    console.log('\nCreating non-unique index for efficient querying...');
    await Attendance.collection.createIndex(
      { schoolId: 1, classId: 1, sectionId: 1, date: 1, attendanceType: 1 }
    );
    console.log('Non-unique index created successfully');

    console.log('\n=== Index Fix Complete ===');
    console.log('Attendance indexes are now non-unique. Duplicate prevention handled in application logic.');
    
    process.exit(0);
  } catch (error) {
    console.error('Index fix failed:', error);
    process.exit(1);
  }
}

fixAttendanceIndexes();
