const TeacherAttendance = require('../../models/TeacherAttendance');
const logger = require('../../utils/logger');

/**
 * Calculate attendance-based deductions (Loss of Pay)
 * This is a pure business logic function.
 * 
 * @param {string} schoolId
 * @param {string} teacherId
 * @param {number} month (1-12)
 * @param {number} year
 * @param {number} monthlyGross
 * @returns {Object} { presentDays, absentDays, lopDays, lopAmount }
 */
const calculateDeductions = async (schoolId, teacherId, month, year, monthlyGross) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Fetch attendance records for the month
    const records = await TeacherAttendance.find({
      schoolId,
      teacherId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let paidLeaves = 0;

    // 2. Count statuses
    records.forEach(record => {
      switch (record.status) {
        case 'present':
          presentDays++;
          break;
        case 'absent':
          absentDays++;
          break;
        case 'half_day':
          halfDays++;
          // Half day = 0.5 present, 0.5 absent
          presentDays += 0.5;
          absentDays += 0.5;
          break;
        case 'on_leave':
          // We count approved 'on_leave' records as paid leaves for the deduction formula
          paidLeaves++;
          break;
        default:
          // weekly_off, holiday etc.
          break;
      }
    });

    // 3. Apply formula from SRS/User Request
    // lopDays = max(0, absentDays - paidLeaves)
    // In most ERPs, 'absent' is already unpaid, so this formula might imply 
    // that paidLeaves (like Sick/Casual) can offset 'absent' records.
    const lopDays = Math.max(0, absentDays - paidLeaves);

    // dailyRate = monthlyGross / workingDays (using daysInMonth as workingDays)
    const dailyRate = monthlyGross / daysInMonth;
    const lopAmount = Math.round(dailyRate * lopDays);

    return {
      presentDays,
      absentDays,
      paidLeaves,
      lopDays,
      lopAmount,
      daysInMonth,
      dailyRate: Number(dailyRate.toFixed(2))
    };
  } catch (error) {
    logger.error('attendanceDeductionService.calculateDeductions', { error: error.message, teacherId, month, year });
    throw error;
  }
};

module.exports = {
  calculateDeductions
};
