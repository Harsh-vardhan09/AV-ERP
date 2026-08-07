const StudentProfile = require('../models/StudentProfile');

// Populated the same way everywhere a student's own profile is read
const findByUserId = async (userId) =>
  StudentProfile.findOne({ userId })
    .populate('classId', 'name numericOrder')
    .populate('sectionId', 'name')
    .populate('session', 'name isActive');

module.exports = { findByUserId };
