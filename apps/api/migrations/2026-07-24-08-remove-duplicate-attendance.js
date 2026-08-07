// Collapses attendance rows duplicated on (class, section, subject, date, type), keeping the newest

const mongoose = require('mongoose');
const Attendance = require('../src/modules/attendance/models/attendance');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp';

async function removeDuplicateAttendance() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    console.log('\nFinding potential duplicate attendance records...');
    
    // Find all attendance records
    const allAttendances = await Attendance.find({}).sort({ createdAt: 1 });
    console.log(`Total attendance records: ${allAttendances.length}`);

    // Group by key fields
    const groups = new Map();
    
    for (const att of allAttendances) {
      const key = `${att.classId}_${att.sectionId}_${att.subjectId}_${att.date.toISOString()}_${att.attendanceType}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(att);
    }

    // Find duplicates
    const duplicates = [];
    for (const [key, records] of groups) {
      if (records.length > 1) {
        duplicates.push({ key, records });
      }
    }

    console.log(`Found ${duplicates.length} groups with duplicates`);

    if (duplicates.length === 0) {
      console.log('No duplicates found. Exiting.');
      process.exit(0);
    }

    let deletedCount = 0;
    let keptCount = 0;

    for (const { key, records } of duplicates) {
      console.log(`\n--- Duplicate group: ${key} ---`);
      console.log(`Found ${records.length} records`);
      
      // Keep the most recent one (highest createdAt)
      records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const toKeep = records[0];
      const toDelete = records.slice(1);
      
      console.log(`Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);
      console.log(`Deleting ${toDelete.length} older records`);
      
      for (const del of toDelete) {
        console.log(`  - Deleting ${del._id} (created: ${del.createdAt})`);
        await Attendance.findByIdAndDelete(del._id);
        deletedCount++;
      }
      keptCount++;
    }

    console.log('\n=== Duplicate Removal Summary ===');
    console.log(`Duplicate groups processed: ${duplicates.length}`);
    console.log(`Records kept (most recent): ${keptCount}`);
    console.log(`Records deleted: ${deletedCount}`);
    console.log('\n✅ Duplicate removal complete');
    
    process.exit(0);
  } catch (error) {
    console.error('Duplicate removal failed:', error);
    process.exit(1);
  }
}

removeDuplicateAttendance();
