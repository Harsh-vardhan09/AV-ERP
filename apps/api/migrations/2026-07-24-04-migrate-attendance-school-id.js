// Backfills Attendance.schoolId from the linked session

const mongoose = require('mongoose');
const Attendance = require('../src-old/models/attendance');
const AcademicSession = require('../src-old/models/AcademicSession');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp';

async function migrateAttendanceSchoolId() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    console.log('Finding Attendance records without schoolId...');
    const attendancesWithoutSchoolId = await Attendance.find({ schoolId: { $exists: false } });
    
    console.log(`Found ${attendancesWithoutSchoolId.length} records without schoolId`);

    if (attendancesWithoutSchoolId.length === 0) {
      console.log('No records to migrate. Exiting.');
      process.exit(0);
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const attendance of attendancesWithoutSchoolId) {
      try {
        // Get schoolId from the session
        const session = await AcademicSession.findById(attendance.session);
        if (!session || !session.schoolId) {
          console.log(`Skipping attendance ${attendance._id}: No session or schoolId found`);
          errorCount++;
          continue;
        }

        // Update the attendance record
        await Attendance.findByIdAndUpdate(attendance._id, { $set: { schoolId: session.schoolId } });
        console.log(`Updated attendance ${attendance._id} with schoolId ${session.schoolId}`);
        updatedCount++;
      } catch (error) {
        console.error(`Error updating attendance ${attendance._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total records found: ${attendancesWithoutSchoolId.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors/Skipped: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some records could not be migrated. Please check the logs above.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAttendanceSchoolId();
