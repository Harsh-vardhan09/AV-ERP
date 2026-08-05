const EmployeeSalary = require('../../models/EmployeeSalary');
const SalaryStructure = require('../../models/SalaryStructure');
const logger = require('../../utils/logger');

/**
 * @param {string} schoolId
 * @param {Object} filters
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const list = async (schoolId, filters = {}, page = 1, limit = 20) => {
  const query = { schoolId };
  if (filters.teacherId) query.teacherId = filters.teacherId;
  if (filters.academicYearId) query.academicYearId = filters.academicYearId;
  if (filters.isActive !== undefined && filters.isActive !== '') {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }
  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    EmployeeSalary.find(query)
      .populate('teacherId', 'name employeeId department')
      .populate('userId', 'name email')
      .populate('salaryStructureId', 'name applicableTo')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    EmployeeSalary.countDocuments(query),
  ]);
  return { docs, totalDocs, page, totalPages: Math.ceil(totalDocs / limit) };
};

/**
 * Private helper to calculate salary from structure with overrides
 * @param {string} schoolId
 * @param {string} salaryStructureId
 * @param {Array} componentOverrides
 * @returns {Object} { monthlyGross, annualCTC, components }
 */
const _calculateSalaryFromStructure = async (schoolId, salaryStructureId, componentOverrides = []) => {
  const structure = await SalaryStructure.findOne({
    _id: salaryStructureId,
    schoolId,
    isActive: true,
  }).populate({
    path: 'components.componentId',
    model: 'SalaryComponent'
  }).lean();

  if (!structure) {
    const error = new Error('Salary structure not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  // 1. Merge structure components with overrides
  const mergedComponents = structure.components.map(item => {
    const override = componentOverrides.find(
      ov => ov.componentId.toString() === item.componentId._id.toString()
    );
    
    if (override) {
      return {
        ...item,
        fixedAmount: override.fixedAmount !== undefined ? override.fixedAmount : item.fixedAmount,
        percentage: override.percentage !== undefined ? override.percentage : item.percentage,
      };
    }
    return item;
  });

  // 2. Find Basic Pay first (needed for percentage calculations)
  const basicItem = mergedComponents.find(
    (item) => item.componentId?.code === 'BASIC' || item.componentId?.code === 'basic_pay'
  );

  const basicValue = basicItem ? (basicItem.fixedAmount || 0) : 0;

  let monthlyGross = 0;
  
  // 3. Calculate components
  mergedComponents.forEach(item => {
    const comp = item.componentId;
    if (!comp) return;

    let amount = 0;
    if (item.fixedAmount > 0) {
      amount = item.fixedAmount;
    } else if (item.percentage > 0 && basicValue > 0) {
      amount = (basicValue * item.percentage) / 100;
    }

    // Standard Gross = sum of all allowances
    if (comp.type === 'allowance') {
      monthlyGross += amount;
    }
    // Note: Deductions are usually not part of Gross CTC in this context 
    // but the prompt said "annualCTC = sum(all components yearly)".
    // If they mean ALL components (including employer contributions), we'd add them.
    // Given "monthlyGross = annualCTC / 12", it strongly implies annualCTC is just 12 * Gross.
  });

  const annualCTC = monthlyGross * 12;

  return {
    monthlyGross: Math.round(monthlyGross),
    annualCTC: Math.round(annualCTC),
  };
};

/**
 * Assign or Update Employee Salary
 * @param {string} schoolId
 * @param {Object} data
 * @param {string} userId
 * @returns {Object} Created EmployeeSalary
 */
const assign = async (schoolId, data, userId) => {
  const { 
    teacherId, 
    salaryStructureId, 
    academicYearId, 
    effectiveFrom, 
    componentOverrides = [],
    userId: targetUserId // The User ID linked to the teacher
  } = data;

  if (!teacherId || !salaryStructureId || !academicYearId) {
    const error = new Error('teacherId, salaryStructureId, and academicYearId are required');
    error.statusCode = 400;
    throw error;
  }

  // 1. Calculate Salary with Overrides
  const { monthlyGross, annualCTC } = await _calculateSalaryFromStructure(
    schoolId, 
    salaryStructureId, 
    componentOverrides
  );

  // 2. Handle existing active salary (Deactivate it)
  // Requirement: "Only one active salary per teacher. Previous salary gets deactivated"
  const now = new Date();
  const effectiveDate = effectiveFrom ? new Date(effectiveFrom) : now;

  await EmployeeSalary.updateMany(
    { schoolId, teacherId, isActive: true },
    { 
      isActive: false, 
      effectiveTo: new Date(effectiveDate.getTime() - 1000) // 1 second before new starts
    }
  );

  // 3. Create new salary record
  const salary = await EmployeeSalary.create({
    schoolId,
    teacherId,
    userId: targetUserId || userId, // Fallback to current user if targetUserId not provided
    salaryStructureId,
    academicYearId,
    componentOverrides,
    monthlyGross,
    annualCTC,
    effectiveFrom: effectiveDate,
    isActive: true,
    createdBy: userId,
  });

  logger.info('Employee salary assigned/updated', { 
    schoolId, 
    teacherId, 
    salaryId: salary._id,
    annualCTC 
  });

  return salary;
};

/**
 * @param {string} schoolId
 * @param {string} teacherId
 * @returns {Object} Active EmployeeSalary
 */
const getCurrent = async (schoolId, teacherId) => {
  const salary = await EmployeeSalary.findOne({ schoolId, teacherId, isActive: true })
    .populate('salaryStructureId')
    .populate('componentOverrides.componentId', 'name code type')
    .lean();
  if (!salary) {
    const error = new Error('No active salary assignment found for this employee');
    error.statusCode = 404;
    throw error;
  }
  return salary;
};

/**
 * @param {string} schoolId
 * @param {string} teacherId
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const getHistory = async (schoolId, teacherId, page = 1, limit = 20) => {
  const query = { schoolId, teacherId };
  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    EmployeeSalary.find(query)
      .populate('salaryStructureId', 'name')
      .populate('revisedBy', 'name email')
      .sort({ effectiveFrom: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmployeeSalary.countDocuments(query),
  ]);
  return { docs, totalDocs, page, totalPages: Math.ceil(totalDocs / limit) };
};

/**
 * @param {string} schoolId
 * @param {Object} data - Contains teacherId, userId, salaryStructureId, etc.
 * @param {string} userId - Action performer ObjectId
 * @returns {Object} Result with old and new salary details
 */
const revise = async (schoolId, data, userId) => {
  const { teacherId, salaryStructureId, academicYearId, effectiveFrom, revisionReason } = data;

  if (!teacherId || !salaryStructureId || !revisionReason) {
    const error = new Error('teacherId, salaryStructureId, and revisionReason are required');
    error.statusCode = 400;
    throw error;
  }

  // 1. Find current active salary
  const currentSalary = await EmployeeSalary.findOne({
    schoolId,
    teacherId,
    isActive: true,
  });

  if (!currentSalary) {
    const error = new Error('No active salary assignment found to revise');
    error.statusCode = 404;
    throw error;
  }

  // 2. Date Validation: effectiveFrom must be > currentSalary.effectiveFrom
  const newEffectiveDate = new Date(effectiveFrom || Date.now());
  if (newEffectiveDate <= new Date(currentSalary.effectiveFrom)) {
    const error = new Error('New effective date must be after the current effective date');
    error.statusCode = 400;
    throw error;
  }

  // 3. Deactivate current salary
  // Set effectiveTo to one day before the new effective date
  const previousEndDate = new Date(newEffectiveDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);

  currentSalary.isActive = false;
  currentSalary.effectiveTo = previousEndDate;
  await currentSalary.save();

  // 4. Calculate new salary from structure
  const { monthlyGross, annualCTC } = await _calculateSalaryFromStructure(schoolId, salaryStructureId);

  // 5. Create new salary record
  const newSalary = await EmployeeSalary.create({
    schoolId,
    teacherId,
    userId: data.userId || currentSalary.userId,
    salaryStructureId,
    academicYearId: academicYearId || currentSalary.academicYearId,
    monthlyGross,
    annualCTC,
    effectiveFrom: newEffectiveDate,
    revisionReason,
    revisedBy: userId,
    isActive: true,
    createdBy: userId,
  });

  logger.info('employeeSalaryService.revise', { 
    schoolId, 
    teacherId, 
    oldSalaryId: currentSalary._id, 
    newSalaryId: newSalary._id 
  });

  return {
    oldSalaryId: currentSalary._id,
    newSalaryId: newSalary._id,
    monthlyGross: newSalary.monthlyGross,
    annualCTC: newSalary.annualCTC,
  };
};

/**
 * @param {string} schoolId
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const getUnassigned = async (schoolId, page = 1, limit = 20) => {
  const assignedTeacherIds = await EmployeeSalary.distinct('teacherId', { schoolId, isActive: true });
  let TeacherProfile;
  try { TeacherProfile = require('mongoose').model('TeacherProfile'); } catch (e) {
    const error = new Error('TeacherProfile model not available');
    error.statusCode = 500; throw error;
  }
  const query = { schoolId, _id: { $nin: assignedTeacherIds }, status: 'active' };
  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    TeacherProfile.find(query).select('name employeeId department designation joiningDate userId')
      .sort({ name: 1 }).skip(skip).limit(limit).lean(),
    TeacherProfile.countDocuments(query),
  ]);
  return { docs, totalDocs, page, totalPages: Math.ceil(totalDocs / limit) };
};

module.exports = { list, assign, getCurrent, getHistory, revise, getUnassigned };
