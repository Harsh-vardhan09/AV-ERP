/**
 * Payment Batch Service
 * Orchestrates bank file generation, submission tracking, and downloads
 */
const PaymentBatch = require('../../models/PaymentBatch');
const Payroll = require('../../models/Payroll');
const bankFileService = require('./bankFileService');
const logger = require('../../utils/logger');

/**
 * Generate a new payment batch
 * @param {string} schoolId
 * @param {Object} data - { payrollId }
 * @param {string} userId
 * @returns {Object} PaymentBatch document
 */
const generate = async (schoolId, data, userId) => {
  if (!data.payrollId) {
    const error = new Error('payrollId is required');
    error.statusCode = 400; throw error;
  }
  const payroll = await Payroll.findOne({ _id: data.payrollId, schoolId }).lean();
  if (!payroll) {
    const error = new Error('Payroll run not found');
    error.statusCode = 404; throw error;
  }
  if (!['approved', 'locked'].includes(payroll.status)) {
    const error = new Error('Payroll must be approved or locked to generate payment batch');
    error.statusCode = 400; throw error;
  }
  const batch = await bankFileService.generateBankFile(schoolId, data.payrollId, userId);
  return batch;
};

/**
 * Get payment batches for a payroll run
 * @param {string} schoolId
 * @param {string} payrollId
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const getByPayrollId = async (schoolId, payrollId, page = 1, limit = 20) => {
  const query = { schoolId, payrollId };
  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    PaymentBatch.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentBatch.countDocuments(query),
  ]);
  return { docs, totalDocs, page, totalPages: Math.ceil(totalDocs / limit) };
};

/**
 * Mark a payment batch as submitted
 * @param {string} schoolId
 * @param {string} batchId
 * @param {string} userId
 * @returns {Object} Updated PaymentBatch
 */
const markSubmitted = async (schoolId, batchId, userId) => {
  const batch = await PaymentBatch.findOne({ _id: batchId, schoolId });
  if (!batch) {
    const error = new Error('Payment batch not found');
    error.statusCode = 404; throw error;
  }
  if (batch.status !== 'generated') {
    const error = new Error(`Cannot submit batch in ${batch.status} status`);
    error.statusCode = 400; throw error;
  }
  batch.status = 'submitted';
  batch.submittedBy = userId;
  await batch.save();
  return batch;
};

/**
 * Get download URL for payment batch file
 * @param {string} schoolId
 * @param {string} batchId
 * @returns {Object} { downloadUrl, expiresIn }
 */
const download = async (schoolId, batchId) => {
  const batch = await PaymentBatch.findOne({ _id: batchId, schoolId }).lean();
  if (!batch) throw new Error('Batch not found');
  
  return {
    downloadUrl: batch.fileUrl,
    expiresIn: 0 // Public URL for now
  };
};

module.exports = { generate, getByPayrollId, markSubmitted, download };
