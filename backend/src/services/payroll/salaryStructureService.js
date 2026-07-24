const SalaryStructure = require('../../models/SalaryStructure');
const EmployeeSalary = require('../../models/EmployeeSalary');
const taxConfigService = require('./taxConfigService');
const logger = require('../../utils/logger');

/**
 * List all salary structures for a school with pagination
 * @param {string} schoolId - School ObjectId
 * @param {Object} filters - Optional query filters (applicableTo, isActive)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const list = async (schoolId, filters = {}, page = 1, limit = 20) => {
  const query = { schoolId };

  if (filters.applicableTo) {
    query.applicableTo = filters.applicableTo;
  }
  if (filters.isActive !== undefined && filters.isActive !== '') {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    SalaryStructure.find(query)
      .populate('components.componentId', 'name code type category')
      .populate('academicYearId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SalaryStructure.countDocuments(query),
  ]);

  return {
    docs,
    totalDocs,
    page,
    totalPages: Math.ceil(totalDocs / limit),
  };
};

/**
 * Get a single salary structure by ID
 * @param {string} schoolId - School ObjectId
 * @param {string} structureId - SalaryStructure ObjectId
 * @returns {Object} Salary structure document
 */
const getById = async (schoolId, structureId) => {
  const structure = await SalaryStructure.findOne({
    _id: structureId,
    schoolId,
  })
    .populate('components.componentId', 'name code type category defaultPercentage')
    .populate('academicYearId', 'name')
    .lean();

  if (!structure) {
    const error = new Error('Salary structure not found');
    error.statusCode = 404;
    throw error;
  }

  return structure;
};

/**
 * Helper to process components from UI format to DB format
 */
const _processComponents = async (schoolId, components) => {
  if (!components || components.length === 0) {
    const error = new Error('At least one component is required');
    error.statusCode = 400;
    throw error;
  }

  const SalaryComponent = require('../../models/SalaryComponent');
  const processedComponents = [];

  for (const item of components) {
    let finalComponentId = item.componentId;

    // If only code is provided, look it up (fallback)
    if (!finalComponentId && item.componentCode) {
      const component = await SalaryComponent.findOne({ 
        schoolId, 
        code: item.componentCode 
      }).lean();

      if (!component) {
        const error = new Error(`Salary component with code "${item.componentCode}" not found`);
        error.statusCode = 404;
        throw error;
      }
      finalComponentId = component._id;
    }

    if (!finalComponentId) {
      const error = new Error('Component ID or Code is required for each component');
      error.statusCode = 400;
      throw error;
    }

    processedComponents.push({
      componentId: finalComponentId,
      fixedAmount: item.type === 'fixed' ? Number(item.value || 0) : 0,
      percentage: item.type === 'percentage' ? Number(item.value || 0) : 0,
      isOverridable: item.isOverridable || false
    });
  }

  return processedComponents;
};

/**
 * Create a new salary structure
 */
const create = async (schoolId, data, userId) => {
  const { name, grade, academicYearId, components, applicableTo, isDefault } = data;

  // 1. Perform base validations
  if (!name || !name.trim()) {
    const error = new Error('Salary structure name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!academicYearId) {
    const error = new Error('Academic year is required');
    error.statusCode = 400;
    throw error;
  }

  // 2. Process Components
  const processedComponents = await _processComponents(schoolId, components);

  // If isDefault is true, unset any existing default for same applicableTo
  if (isDefault) {
    await SalaryStructure.updateMany(
      {
        schoolId,
        applicableTo: applicableTo,
        isDefault: true,
      },
      { $set: { isDefault: false } }
    );
  }

  const structure = await SalaryStructure.create({
    schoolId,
    name: name.trim(),
    grade: grade?.trim() || '',
    academicYearId,
    components: processedComponents,
    applicableTo,
    isDefault: isDefault || false,
    isActive: true,
    createdBy: userId,
  });

  return structure;
};

/**
 * Update a salary structure
 */
const update = async (schoolId, structureId, data) => {
  // Block immutable fields
  delete data.schoolId;
  delete data.createdBy;

  if (data.name) {
    data.name = data.name.trim();
  }

  // Process components if provided in the update
  if (data.components) {
    data.components = await _processComponents(schoolId, data.components);
  }

  // If setting as default, unset existing defaults first
  if (data.isDefault) {
    const existing = await SalaryStructure.findOne({ _id: structureId, schoolId }).lean();
    if (existing) {
      await SalaryStructure.updateMany(
        {
          schoolId,
          applicableTo: data.applicableTo || existing.applicableTo,
          isDefault: true,
          _id: { $ne: structureId },
        },
        { $set: { isDefault: false } }
      );
    }
  }

  const structure = await SalaryStructure.findOneAndUpdate(
    { _id: structureId, schoolId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!structure) {
    const error = new Error('Salary structure not found');
    error.statusCode = 404;
    throw error;
  }

  return structure;
};

/**
 * Clone a salary structure
 * @param {string} schoolId - School ObjectId
 * @param {string} structureId - Source SalaryStructure ObjectId
 * @param {Object} overrides - Fields to override (e.g. name, academicYearId)
 * @param {string} userId - Creator's User ObjectId
 * @returns {Object} Cloned salary structure
 */
const clone = async (schoolId, structureId, overrides = {}, userId) => {
  const source = await SalaryStructure.findOne({
    _id: structureId,
    schoolId,
  }).lean();

  if (!source) {
    const error = new Error('Source salary structure not found');
    error.statusCode = 404;
    throw error;
  }

  const clonedData = {
    schoolId,
    name: overrides.name || `${source.name} (Copy)`,
    academicYearId: overrides.academicYearId || source.academicYearId,
    components: source.components.map((c) => ({
      componentId: c.componentId,
      type: c.type,
      value: c.value,
      isOverridable: c.isOverridable,
    })),
    applicableTo: overrides.applicableTo || source.applicableTo,
    isDefault: false,
    isActive: true,
    createdBy: userId,
  };

  const cloned = await SalaryStructure.create(clonedData);
  return cloned;
};

/**
 * Remove (hard-delete) a salary structure
 */
const remove = async (schoolId, structureId) => {
  // Check if any active employee salaries reference this structure
  const activeAssignments = await EmployeeSalary.countDocuments({
    schoolId,
    salaryStructureId: structureId,
    isActive: true,
  });

  if (activeAssignments > 0) {
    const error = new Error(
      `Cannot delete salary structure. ${activeAssignments} active employee(s) are assigned to it.`
    );
    error.statusCode = 400;
    throw error;
  }

  const structure = await SalaryStructure.findOneAndDelete({
    _id: structureId,
    schoolId,
  });

  if (!structure) {
    const error = new Error('Salary structure not found');
    error.statusCode = 404;
    throw error;
  }

  return structure;
};

module.exports = {
  list,
  getById,
  create,
  update,
  clone,
  remove,
};
