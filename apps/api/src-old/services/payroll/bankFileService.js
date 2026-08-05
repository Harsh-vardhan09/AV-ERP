const AWS = require('aws-sdk');
const { Parser } = require('json2csv');
const logger = require('../../utils/logger');
const Payslip = require('../../models/Payslip');
const Payroll = require('../../models/Payroll');
const PaymentBatch = require('../../models/PaymentBatch');

/**
 * Generate CSV string from structured data
 * @param {Array} data - [{ name, accountNumber, ifsc, amount }]
 * @returns {string} CSV content
 */
const generateBankCSV = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Cannot generate bank file: No employee data provided.');
  }

  // Validation: Ensure required fields exist in every row
  data.forEach((row, index) => {
    if (!row.name || !row.accountNumber || !row.ifsc || row.amount === undefined) {
      throw new Error(`Validation failed at row ${index + 1}: Missing name, account number, IFSC, or amount.`);
    }
  });

  try {
    const fields = ['name', 'accountNumber', 'ifsc', 'amount'];
    const parser = new Parser({ fields });
    return parser.parse(data);
  } catch (error) {
    logger.error('generateBankCSV: Parsing failed', { error: error.message });
    throw new Error(`Failed to generate CSV: ${error.message}`);
  }
};

/**
 * Generate bank transfer CSV file for a payroll run
 * @param {string} schoolId
 * @param {string} payrollId
 * @param {string} userId
 */
const generateBankFile = async (schoolId, payrollId, userId) => {
  try {
    // 1. Validate Payroll Status
    const payroll = await Payroll.findOne({ _id: payrollId, schoolId });
    if (!payroll) {
      const error = new Error('Payroll run not found');
      error.statusCode = 404; throw error;
    }

    // 2. Fetch Payslips with Bank Details
    const payslips = await Payslip.find({ 
      schoolId, 
      payrollId,
      status: { $ne: 'cancelled' }
    }).populate('teacherId', 'name bankDetails employeeId').lean();

    if (!payslips.length) {
      const error = new Error('No valid payslips found for this payroll run');
      error.statusCode = 400; throw error;
    }

    // 3. Prepare Data for generateBankCSV
    const csvData = payslips.map((p) => ({
      name: p.teacherId.name,
      accountNumber: p.teacherId.bankDetails?.accountNumber || '',
      ifsc: p.teacherId.bankDetails?.ifsc || '',
      amount: p.netPayable
    }));

    // 4. Generate CSV String using the new function
    const csv = generateBankCSV(csvData);

    // 5. Upload to S3
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    const key = `bank-files/${schoolId}/${payroll.year}/${payroll.month}/batch_${Date.now()}.csv`;
    
    await s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: csv,
      ContentType: 'text/csv',
    }).promise();

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // 6. Create PaymentBatch Record
    const totalAmount = csvData.reduce((sum, d) => sum + d.amount, 0);
    
    const batch = await PaymentBatch.create({
      schoolId,
      payrollId,
      batchDate: new Date(),
      totalAmount,
      employeeCount: csvData.length,
      fileUrl,
      fileGeneratedAt: new Date(),
      status: 'generated',
      createdBy: userId
    });

    logger.info('bankFileService.generateBankFile: Success', { batchId: batch._id, schoolId });

    return batch;

  } catch (error) {
    logger.error('bankFileService.generateBankFile: Failed', { error: error.message, payrollId });
    throw error;
  }
};

/**
 * List payment batches
 */
const listBatches = async (schoolId, payrollId) => {
  return await PaymentBatch.find({ schoolId, payrollId }).sort({ createdAt: -1 }).lean();
};

module.exports = {
  generateBankFile,
  listBatches
};
