const TeacherProfile = require('../../models/TeacherProfile');
const EmployeeSalary = require('../../models/EmployeeSalary');
const TeacherAttendance = require('../../models/TeacherAttendance');
const TaxConfig = require('../../models/TaxConfig');
const logger = require('../../utils/logger');

/**
 * Validate if a payroll run can be initiated for a school and period
 * @param {string} schoolId
 * @param {number} month
 * @param {number} year
 * @returns {Object} { isValid, errors }
 */
const validatePayrollRun = async (schoolId, month, year) => {
  const errors = [];

  try {
    // 1. Check Active Teachers vs Salary Assignment
    const [activeTeachers, assignedSalaries] = await Promise.all([
      TeacherProfile.countDocuments({ schoolId, status: 'active' }),
      EmployeeSalary.countDocuments({ schoolId, isActive: true })
    ]);

    if (activeTeachers > assignedSalaries) {
      errors.push(`${activeTeachers - assignedSalaries} active teachers are missing salary assignments.`);
    }

    if (assignedSalaries === 0) {
      errors.push('No active employee salaries found in the system.');
    }

    // 2. Check Tax Configuration
    const taxConfig = await TaxConfig.findOne({ schoolId, isActive: true }).lean();
    if (!taxConfig) {
      errors.push('No active Tax Configuration found for this school. Statutory deductions cannot be calculated.');
    }

    // 3. Check Attendance Data
    const attendanceCount = await TeacherAttendance.countDocuments({
      schoolId,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0)
      }
    });

    if (attendanceCount === 0) {
      errors.push(`No attendance records found for ${month}/${year}. LOP deductions cannot be calculated.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };

  } catch (error) {
    logger.error('validatePayrollRun failed', { schoolId, month, year, error: error.message });
    throw error;
  }
};

module.exports = {
  validatePayrollRun
};
