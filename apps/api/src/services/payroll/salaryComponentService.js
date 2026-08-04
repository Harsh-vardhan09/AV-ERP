const mongoose = require('mongoose');
const SalaryComponent = require('../../models/SalaryComponent');
const logger = require('../../utils/logger');

/**
 * Get all salary components for a school with optional filters
 */
const getAllComponents = async (schoolId, filters = {}) => {
  const query = { schoolId };

  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.isActive !== undefined && filters.isActive !== '') {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  const components = await SalaryComponent.find(query).sort({ type: 1, name: 1 }).lean();
  return components;
};

/**
 * Get a single salary component by ID
 */
const getComponentById = async (schoolId, componentId) => {
  if (!mongoose.Types.ObjectId.isValid(componentId)) {
    const error = new Error('Invalid salary component ID');
    error.statusCode = 400;
    throw error;
  }

  const component = await SalaryComponent.findOne({
    _id: componentId,
    schoolId,
  }).lean();

  if (!component) {
    const error = new Error('Salary component not found');
    error.statusCode = 404;
    throw error;
  }

  return component;
};

/**
 * Create a new salary component
 */
const createComponent = async (schoolId, data, userId) => {
  // Normalize code: lowercase, replace spaces with underscores
  const code = data.code.toLowerCase().replace(/\s+/g, '_');
  const name = data.name.trim();

  // Validate: percentage category requires calculationBasis
  if (data.category === 'percentage' && !data.calculationBasis) {
    const error = new Error('Calculation basis is required for percentage-based components');
    error.statusCode = 400;
    throw error;
  }

  // Validate: defaultPercentage must be 0–100
  if (
    data.defaultPercentage !== undefined &&
    data.defaultPercentage !== null &&
    (data.defaultPercentage < 0 || data.defaultPercentage > 100)
  ) {
    const error = new Error('Default percentage must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }

  // Check duplicate code within the school
  const existing = await SalaryComponent.findOne({ schoolId, code }).lean();
  if (existing) {
    const error = new Error('A component with this code already exists');
    error.statusCode = 400;
    throw error;
  }

  const component = await SalaryComponent.create({
    schoolId,
    name,
    code,
    type: data.type,
    category: data.category,
    calculationBasis: data.calculationBasis || undefined,
    defaultPercentage: data.defaultPercentage,
    isStatutory: data.isStatutory !== undefined ? data.isStatutory : false,
    isTaxable: data.isTaxable !== undefined ? data.isTaxable : true,
    isActive: data.isActive !== undefined ? data.isActive : true,
    description: data.description || undefined,
    createdBy: userId,
  });

  return component;
};

/**
 * Update a salary component (code and isStatutory are immutable)
 */
const updateComponent = async (schoolId, componentId, data) => {
  // Block immutable fields
  delete data.code;
  delete data.isStatutory;
  delete data.schoolId;
  delete data.createdBy;

  // Trim name if provided
  if (data.name) {
    data.name = data.name.trim();
  }

  if (!mongoose.Types.ObjectId.isValid(componentId)) {
    const error = new Error('Invalid salary component ID');
    error.statusCode = 400;
    throw error;
  }

  const component = await SalaryComponent.findOneAndUpdate(
    { _id: componentId, schoolId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!component) {
    const error = new Error('Salary component not found');
    error.statusCode = 404;
    throw error;
  }

  return component;
};

/**
 * Toggle isActive status of a salary component
 */
const toggleComponentStatus = async (schoolId, componentId) => {
  if (!mongoose.Types.ObjectId.isValid(componentId)) {
    const error = new Error('Invalid salary component ID');
    error.statusCode = 400;
    throw error;
  }

  const component = await SalaryComponent.findOne({
    _id: componentId,
    schoolId,
  });

  if (!component) {
    const error = new Error('Salary component not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent deactivation of statutory components
  if (component.isActive && component.isStatutory) {
    const error = new Error('Statutory components cannot be deactivated');
    error.statusCode = 400;
    throw error;
  }

  component.isActive = !component.isActive;
  await component.save();

  return component;
};

/**
 * Seed default salary components for a school
 */
const seedDefaultComponents = async (schoolId, userId) => {
  // Check if components already exist for this school
  const existingCount = await SalaryComponent.countDocuments({ schoolId });
  if (existingCount > 0) {
    const error = new Error('Components already seeded for this school');
    error.statusCode = 400;
    throw error;
  }

  const defaults = [
    {
      name: 'Basic Pay',
      code: 'basic_pay',
      type: 'allowance',
      category: 'fixed',
      isStatutory: true,
      isTaxable: true,
    },
    {
      name: 'House Rent Allowance',
      code: 'hra',
      type: 'allowance',
      category: 'percentage',
      calculationBasis: 'basic_pay',
      defaultPercentage: 40,
      isStatutory: false,
      isTaxable: false,
    },
    {
      name: 'PF Employee',
      code: 'pf_employee',
      type: 'deduction',
      category: 'statutory',
      calculationBasis: 'basic_pay',
      defaultPercentage: 12,
      isStatutory: true,
      isTaxable: false,
    },
    {
      name: 'PF Employer',
      code: 'pf_employer',
      type: 'deduction',
      category: 'statutory',
      calculationBasis: 'basic_pay',
      defaultPercentage: 12,
      isStatutory: true,
      isTaxable: false,
    },
    {
      name: 'ESI Employee',
      code: 'esi_employee',
      type: 'deduction',
      category: 'statutory',
      defaultPercentage: 0.75,
      isStatutory: true,
      isTaxable: false,
    },
    {
      name: 'ESI Employer',
      code: 'esi_employer',
      type: 'deduction',
      category: 'statutory',
      defaultPercentage: 3.25,
      isStatutory: true,
      isTaxable: false,
    },
    {
      name: 'Professional Tax',
      code: 'professional_tax',
      type: 'deduction',
      category: 'statutory',
      isStatutory: true,
      isTaxable: false,
    },
    {
      name: 'TDS',
      code: 'tds',
      type: 'tax',
      category: 'statutory',
      isStatutory: true,
      isTaxable: false,
    },
  ];

  // Attach schoolId and createdBy to each default
  const components = defaults.map((comp) => ({
    ...comp,
    schoolId,
    createdBy: userId,
  }));

  const inserted = await SalaryComponent.insertMany(components);
  return inserted;
};

module.exports = {
  getAllComponents,
  getComponentById,
  createComponent,
  updateComponent,
  toggleComponentStatus,
  seedDefaultComponents,
};
