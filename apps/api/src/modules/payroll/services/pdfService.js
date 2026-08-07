const PDFDocument = require('pdfkit');
const AWS = require('aws-sdk');
const logger = require('../../../core/logging/logger.js');
const Payslip = require('../models/Payslip');

/**
 * Generate a professional Payslip PDF and upload to S3
 * @param {Object} payslipId 
 */
const generatePayslipPDF = async (payslipId) => {
  try {
    const payslip = await Payslip.findById(payslipId)
      .populate('teacherId')
      .populate('schoolId')
      .populate('userId', 'email')
      .lean();

    if (!payslip) throw new Error('Payslip not found');

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `Payslip_${payslip.teacherId.name}_${payslip.month}_${payslip.year}`,
        Author: payslip.schoolId.name
      }
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfBuffer = await new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- Header ---
      doc.fillColor('#2c3e50').fontSize(20).text(payslip.schoolId.name.toUpperCase(), { align: 'center', bold: true });
      doc.fontSize(10).fillColor('#7f8c8d').text(payslip.schoolId.address, { align: 'center' });
      doc.moveDown(2);

      doc.fillColor('#2c3e50').fontSize(16).text('MONTHLY PAYSLIP', { align: 'center', underline: true });
      doc.text(`${payslip.month} ${payslip.year}`, { align: 'center' });
      doc.moveDown(2);

      // --- Employee Information Table-like Structure ---
      const infoY = doc.y;
      doc.fontSize(11).fillColor('#34495e');
      
      doc.text(`Employee Name:`, 50, infoY);
      doc.text(payslip.teacherId.name, 150, infoY);
      
      doc.text(`Employee ID:`, 50, infoY + 15);
      doc.text(payslip.teacherId.employeeId, 150, infoY + 15);
      
      doc.text(`Designation:`, 320, infoY);
      doc.text(payslip.teacherId.designation || 'N/A', 420, infoY);
      
      doc.text(`Department:`, 320, infoY + 15);
      doc.text(payslip.teacherId.department || 'N/A', 420, infoY + 15);
      
      doc.moveDown(3);

      // --- Attendance Summary ---
      const attendanceY = doc.y;
      doc.rect(50, attendanceY, 495, 25).fill('#f8f9fa');
      doc.fillColor('#2c3e50').text('ATTENDANCE SUMMARY', 55, attendanceY + 7, { bold: true });
      
      doc.moveDown(2);
      doc.fontSize(10).text(`Total Days: ${payslip.workingDays}  |  Present: ${payslip.presentDays}  |  Absent: ${payslip.absentDays}  |  LOP Days: ${payslip.lopDays}`, { align: 'center' });
      doc.moveDown(2);

      // --- Earnings & Deductions Tables ---
      const tableTop = doc.y;
      
      // Earnings Column
      doc.fontSize(11).fillColor('#2c3e50').text('EARNINGS', 50, tableTop, { underline: true });
      let earningsY = tableTop + 20;
      payslip.earnings.forEach(e => {
        doc.fontSize(10).fillColor('#34495e').text(e.name, 50, earningsY);
        doc.text(e.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 }), 180, earningsY, { align: 'right', width: 60 });
        earningsY += 15;
      });

      // Deductions Column
      doc.fontSize(11).fillColor('#2c3e50').text('DEDUCTIONS', 320, tableTop, { underline: true });
      let deductionsY = tableTop + 20;
      payslip.deductions.forEach(d => {
        doc.fontSize(10).fillColor('#34495e').text(d.name, 320, deductionsY);
        doc.text(d.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 }), 450, deductionsY, { align: 'right', width: 60 });
        deductionsY += 15;
      });

      const maxTableY = Math.max(earningsY, deductionsY) + 20;
      doc.moveTo(50, maxTableY).lineTo(545, maxTableY).stroke('#bdc3c7');

      // --- Totals ---
      doc.moveDown(2);
      const totalsY = doc.y;
      doc.fontSize(10).fillColor('#34495e');
      doc.text(`Gross Earnings:`, 320, totalsY);
      doc.text(`Rs. ${payslip.grossEarnings.toLocaleString('en-IN')}`, 450, totalsY, { align: 'right', width: 60 });
      
      doc.text(`Total Deductions:`, 320, totalsY + 15);
      doc.text(`Rs. ${payslip.totalDeductions.toLocaleString('en-IN')}`, 450, totalsY + 15, { align: 'right', width: 60 });

      doc.moveDown(2);
      doc.fontSize(14).fillColor('#2c3e50').text(`NET PAYABLE:`, 320, doc.y, { bold: true });
      doc.text(`Rs. ${payslip.netPayable.toLocaleString('en-IN')}`, 450, doc.y - 14, { align: 'right', width: 60, bold: true });

      doc.moveDown(4);
      doc.fontSize(9).fillColor('#95a5a6').text('This is a computer-generated document and does not require a physical signature.', { align: 'center', italic: true });

      doc.end();
    });

    // --- Upload to S3 ---
    const key = `payslips/${payslip.schoolId._id}/${payslip.year}/${payslip.month}/${payslip._id}.pdf`;
    
    await s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ACL: 'public-read'
    }).promise();

    const pdfUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // --- Update Payslip ---
    await Payslip.findByIdAndUpdate(payslipId, {
      pdfUrl,
      pdfGeneratedAt: new Date()
    });

    return pdfUrl;

  } catch (error) {
    logger.error('generatePayslipPDF failed', { payslipId, error: error.message });
    throw error;
  }
};

module.exports = {
  generatePayslipPDF
};
