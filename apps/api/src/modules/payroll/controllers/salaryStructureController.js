const mongoose = require('mongoose');
const salaryStructureService = require('../services/salaryStructureService');
const logger = require('../../../core/logging/logger.js');

/**
 * SUCCESS: { success: true, message: "...", data: ... }
 * ERROR:   { success: false, message: "..." }
 */

const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const result = await salaryStructureService.list(req.schoolId, req.query, page, limit);

    return res.status(200).json({
      success: true,
      message: 'Salary structures fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('salaryStructureController.list', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch salary structures',
    });
  }
};

const create = async (req, res) => {
  try {
    const { name, grade, academicYearId, components } = req.body;
    
    // 1. Mandatory Validation
    if (!name || !academicYearId || !components) {
      return res.status(400).json({
        success: false,
        message: 'name, academicYearId, and components are required',
      });
    }

    // 2. School Isolation
    const structure = await salaryStructureService.create(
      req.schoolId,
      req.body,
      req.user._id
    );

    return res.status(201).json({
      success: true,
      message: 'Salary structure created successfully',
      data: structure,
    });
  } catch (error) {
    logger.error('salaryStructureController.create', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create salary structure',
    });
  }
};

const getById = async (req, res) => {
  try {
    const structure = await salaryStructureService.getById(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Salary structure fetched successfully',
      data: structure,
    });
  } catch (error) {
    logger.error('salaryStructureController.getById', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch salary structure',
    });
  }
};

const update = async (req, res) => {
  try {
    const structure = await salaryStructureService.update(req.schoolId, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Salary structure updated successfully',
      data: structure,
    });
  } catch (error) {
    logger.error('salaryStructureController.update', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update salary structure',
    });
  }
};

const clone = async (req, res) => {
  try {
    const structure = await salaryStructureService.clone(req.schoolId, req.params.id, req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Salary structure cloned successfully',
      data: structure,
    });
  } catch (error) {
    logger.error('salaryStructureController.clone', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to clone salary structure',
    });
  }
};

const remove = async (req, res) => {
  try {
    await salaryStructureService.remove(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Salary structure removed successfully',
    });
  } catch (error) {
    logger.error('salaryStructureController.remove', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to remove salary structure',
    });
  }
};

module.exports = {
  list,
  create,
  getById,
  update,
  clone,
  remove,
};
