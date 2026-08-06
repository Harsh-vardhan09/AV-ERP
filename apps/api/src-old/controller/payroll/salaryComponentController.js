const salaryComponentService = require('../../services/payroll/salaryComponentService');
const logger = require('../../../src/core/logging/logger.js');

/**
 * GET /api/payroll/salary-components
 * Get all salary components with optional filters
 */
const getComponents = async (req, res) => {
  try {
    const components = await salaryComponentService.getAllComponents(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'Salary components fetched successfully',
      data: components,
    });
  } catch (error) {
    logger.error('getComponents', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch salary components',
    });
  }
};

/**
 * GET /api/payroll/salary-components/:id
 * Get a single salary component by ID
 */
const getComponentById = async (req, res) => {
  try {
    const component = await salaryComponentService.getComponentById(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Salary component fetched successfully',
      data: component,
    });
  } catch (error) {
    logger.error('getComponentById', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch salary component',
    });
  }
};

/**
 * POST /api/payroll/salary-components
 * Create a new salary component
 */
const createComponent = async (req, res) => {
  try {
    const component = await salaryComponentService.createComponent(
      req.schoolId,
      req.body,
      req.user._id
    );
    return res.status(201).json({
      success: true,
      message: 'Salary component created successfully',
      data: component,
    });
  } catch (error) {
    logger.error('createComponent', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create salary component',
    });
  }
};

/**
 * PUT /api/payroll/salary-components/:id
 * Update a salary component
 */
const updateComponent = async (req, res) => {
  try {
    const component = await salaryComponentService.updateComponent(
      req.schoolId,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: 'Salary component updated successfully',
      data: component,
    });
  } catch (error) {
    logger.error('updateComponent', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update salary component',
    });
  }
};

/**
 * PATCH /api/payroll/salary-components/:id/toggle-status
 * Toggle active/inactive status
 */
const toggleStatus = async (req, res) => {
  try {
    const component = await salaryComponentService.toggleComponentStatus(
      req.schoolId,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      message: `Salary component ${component.isActive ? 'activated' : 'deactivated'} successfully`,
      data: component,
    });
  } catch (error) {
    logger.error('toggleStatus', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to toggle component status',
    });
  }
};

/**
 * POST /api/payroll/salary-components/seed
 * Seed default salary components for the school
 */
const seedComponents = async (req, res) => {
  try {
    const components = await salaryComponentService.seedDefaultComponents(
      req.schoolId,
      req.user._id
    );
    return res.status(201).json({
      success: true,
      message: 'Default salary components seeded successfully',
      data: components,
    });
  } catch (error) {
    logger.error('seedComponents', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to seed default components',
    });
  }
};

module.exports = {
  getComponents,
  getComponentById,
  createComponent,
  updateComponent,
  toggleStatus,
  seedComponents,
};
