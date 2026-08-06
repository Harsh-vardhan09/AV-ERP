/**
 * Payslip Service
 * Fetch payslips, generate signed S3 URLs, teacher self-service filtering
 */
const mongoose = require('mongoose');
const Payslip = require('../../models/Payslip');
const logger = require('../../../src/core/logging/logger.js');

/**
 * List payslips with filters and pagination (admin/accounts)
 * @param {string} schoolId
 * @param {Object} filters - payrollId, teacherId, month, year, status
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const list = async (schoolId, filters = {}, page = 1, limit = 20) => {
  const query = { schoolId };
  
  if (filters.payrollId) {
    if (!mongoose.Types.ObjectId.isValid(filters.payrollId)) {
      const error = new Error('Invalid payrollId format');
      error.statusCode = 400;
      throw error;
    }
    query.payrollId = filters.payrollId;
  }

  if (filters.teacherId) query.teacherId = filters.teacherId;
  if (filters.month) query.month = parseInt(filters.month);
  if (filters.year) query.year = parseInt(filters.year);
  if (filters.status) query.status = filters.status;

  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    Payslip.find(query)
      .populate('teacherId', 'firstName lastName employeeId department')
      .populate('userId', 'name email')
      .sort({ year: -1, month: -1 }).skip(skip).limit(limit).lean(),
    Payslip.countDocuments(query),
  ]);
  return { docs, totalDocs, page, totalPages: Math.ceil(totalDocs / limit) };
};

/**
 * Get own payslips (teacher self-service)
 * @param {string} schoolId
 * @param {string} userId - Must match req.user._id
 * @param {Object} filters
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const getMine = async (schoolId, userId, filters = {}, page = 1, limit = 20) => {
  // 🛡️ SAFE QUERY: Handle both String and ObjectId types to prevent visibility issues
  const safeSchoolId = mongoose.Types.ObjectId.isValid(schoolId) 
    ? new mongoose.Types.ObjectId(schoolId) 
    : schoolId;
    
  const safeUserId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  const query = { 
    schoolId: { $in: [schoolId, safeSchoolId] },
    userId: { $in: [userId, safeUserId] }, 
    status: 'finalised' 
  };
  if (filters.month) query.month = parseInt(filters.month);
  if (filters.year) query.year = parseInt(filters.year);

  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    Payslip.find(query).sort({ year: -1, month: -1 }).skip(skip).limit(limit).lean(),
    Payslip.countDocuments(query),
  ]);
  return { docs, totalDocs, page, totalPages: Math.ceil(totalDocs / limit) };
};

/**
 * Get a single payslip by ID with role-based access
 * @param {string} schoolId
 * @param {string} payslipId
 * @param {Object} user - req.user with _id and role
 * @returns {Object} Payslip document
 */
const getById = async (schoolId, payslipId, user) => {
  if (!mongoose.Types.ObjectId.isValid(payslipId)) {
    const error = new Error('Invalid payslip ID');
    error.statusCode = 400;
    throw error;
  }

  const payslip = await Payslip.findOne({ _id: payslipId, schoolId })
    .populate('teacherId', 'firstName lastName employeeId department')
    .populate('userId', 'name email')
    .populate('earnings.componentId', 'name code')
    .populate('deductions.componentId', 'name code')
    .lean();

  if (!payslip) {
    const error = new Error('Payslip not found');
    error.statusCode = 404; throw error;
  }

  // Teacher can only view their own payslips
  if (user.role === 'teacher') {
    const TeacherProfile = require('../../models/TeacherProfile');
    const teacherProfile = await TeacherProfile.findOne({ userId: user._id, schoolId }).lean();
    
    const payslipUserId = payslip.userId?._id || payslip.userId;
    const payslipTeacherId = payslip.teacherId?._id || payslip.teacherId;
    
    const isOwner = (payslipUserId?.toString() === user._id?.toString()) || 
                    (teacherProfile && payslipTeacherId?.toString() === teacherProfile._id.toString());

    if (!isOwner) {
      const error = new Error('You do not have permission to view this payslip');
      error.statusCode = 403; throw error;
    }
  }

  return payslip;
};

/**
 * Generate signed S3 download URL for payslip PDF
 * @param {string} schoolId
 * @param {string} payslipId
 * @param {Object} user
 * @returns {Object} { url, expiresIn }
 */
const download = async (schoolId, payslipId, user) => {
  const payslip = await getById(schoolId, payslipId, user);
  const pdfGenerator = require('../../../src/modules/payroll/services/payslipPdf');

  // 🛡️ Fallback: If no PDF URL exists, generate it on-the-fly and return as base64/buffer
  // In production, we'd upload this to S3, but for now we provide a direct data link or signed URL
  if (!payslip.pdfUrl) {
    logger.info('payslipService.download: PDF URL missing, generating on-the-fly', { payslipId });
    const pdfBuffer = await pdfGenerator(payslip, 'Unified Campus Academy');
    
    // Convert to Data URI for immediate opening in browser
    const dataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    return { url: dataUri, expiresIn: 3600, onTheFly: true };
  }

  // Generate signed URL with 1-hour expiry
  let url = payslip.pdfUrl;
  try {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    const key = payslip.pdfUrl.split('.com/')[1] || payslip.pdfUrl;
    url = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Expires: 3600,
    });
  } catch (e) {
    logger.warn('payslipService.download: S3 signed URL failed, returning raw URL', { error: e.message });
  }

  return { url, expiresIn: 3600 };
};

/**
 * Resend payslip email to employee
 * @param {string} schoolId
 * @param {string} payslipId
 * @returns {Object} { sent: true }
 */
const resendEmail = async (schoolId, payslipId) => {
  const payslip = await Payslip.findOne({ _id: payslipId, schoolId })
    .populate('userId', 'name email')
    .populate('teacherId', 'firstName lastName')
    .lean();

  if (!payslip) {
    const error = new Error('Payslip not found');
    error.statusCode = 404; throw error;
  }

  if (!payslip.pdfUrl) {
    const error = new Error('PDF not yet generated for this payslip');
    error.statusCode = 400; throw error;
  }

  try {
    const emailService = require('../../../src/modules/notifications').emailService;
    // Compute full name — main ERP stores firstName + lastName separately
    const teacherName =
      payslip.teacherId
        ? `${payslip.teacherId.firstName || ''} ${payslip.teacherId.lastName || ''}`.trim()
        : (payslip.userId?.name || 'Employee');

    await emailService.sendPayslipEmail({
      to: payslip.userId.email,
      teacherName,
      month: payslip.month,
      year: payslip.year,
      schoolName: '',
      pdfUrl: payslip.pdfUrl,
    });
  } catch (e) {
    logger.error('payslipService.resendEmail', { payslipId, error: e.message });
    const error = new Error('Failed to send payslip email');
    error.statusCode = 500; throw error;
  }

  return { sent: true };
};

/**
 * Initiate bulk download of payslips for a payroll run (via Bull queue)
 * @param {string} schoolId
 * @param {string} payrollId
 * @returns {Object} { jobId }
 */
const bulkDownload = async (schoolId, payrollId) => {
  const count = await Payslip.countDocuments({ schoolId, payrollId, pdfUrl: { $exists: true, $ne: null } });
  if (count === 0) {
    const error = new Error('No payslips with PDFs found for this payroll run');
    error.statusCode = 404; throw error;
  }

  try {
    const payrollQueue = require('../../../src/modules/payroll/jobs/payrollQueue');
    const job = await payrollQueue.add('BULK_ZIP_DOWNLOAD', { schoolId, payrollId });
    return { jobId: job.id, totalPayslips: count };
  } catch (e) {
    logger.error('payslipService.bulkDownload', { payrollId, error: e.message });
    const error = new Error('Failed to initiate bulk download');
    error.statusCode = 500; throw error;
  }
};

module.exports = { list, getMine, getById, download, resendEmail, bulkDownload };
