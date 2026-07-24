const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a professional Payslip PDF
 * @param {Object} payslip - The payslip data object
 * @param {string} schoolName - Optional school name (defaults to 'NexisparkX Academy')
 * @returns {Promise<Buffer>} - Returns the PDF as a buffer
 */
const generatePayslipPDF = async (payslip, schoolName = 'NexisparkX Academy') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      let buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // ------------------------------------------------------------------
      // 🎨 HEADER SECTION
      // ------------------------------------------------------------------
      doc
        .fillColor('#0f172a')
        .fontSize(20)
        .text(schoolName.toUpperCase(), { align: 'center', weight: 900 });
      
      doc
        .fontSize(10)
        .fillColor('#64748b')
        .text('Official Salary Statement', { align: 'center' })
        .moveDown(2);

      // Horizontal Line
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();

      doc.moveDown(2);

      // ------------------------------------------------------------------
      // 👤 EMPLOYEE & PERIOD DETAILS
      // ------------------------------------------------------------------
      const startY = doc.y;
      
      // Left Column
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .text('EMPLOYEE NAME', 50, startY)
        .fillColor('#0f172a')
        .fontSize(11)
        .text(payslip.teacherId?.name || 'Staff Member', 50, startY + 12);

      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .text('EMPLOYEE ID', 50, startY + 40)
        .fillColor('#0f172a')
        .fontSize(11)
        .text(payslip.employeeId || 'N/A', 50, startY + 52);

      // Right Column
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .text('PAYMENT PERIOD', 350, startY)
        .fillColor('#0f172a')
        .fontSize(11)
        .text(`${getMonthName(payslip.month)} ${payslip.year}`, 350, startY + 12);

      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .text('PAYMENT STATUS', 350, startY + 40)
        .fillColor('#10b981') // Green
        .fontSize(11)
        .text('PAID / PROCESSED', 350, startY + 52);

      doc.moveDown(4);

      // ------------------------------------------------------------------
      // 📅 ATTENDANCE SUMMARY
      // ------------------------------------------------------------------
      const attendanceY = doc.y;
      doc
        .fillColor('#f8fafc')
        .rect(50, attendanceY, 500, 40)
        .fill();

      doc
        .fillColor('#64748b')
        .fontSize(8)
        .text('WORKING DAYS', 70, attendanceY + 10)
        .fillColor('#0f172a')
        .fontSize(10)
        .text(payslip.workingDays || 26, 70, attendanceY + 22);

      doc
        .fillColor('#64748b')
        .fontSize(8)
        .text('PRESENT DAYS', 250, attendanceY + 10)
        .fillColor('#0f172a')
        .fontSize(10)
        .text(payslip.presentDays || 0, 250, attendanceY + 22);

      doc
        .fillColor('#64748b')
        .fontSize(8)
        .text('LOSS OF PAY DAYS', 430, attendanceY + 10)
        .fillColor('#ef4444') // Red
        .fontSize(10)
        .text(payslip.lopDays || 0, 430, attendanceY + 22);

      doc.moveDown(4);

      // 💰 SALARY BREAKDOWN
      const tableTop = doc.y;
      
      // Table Header
      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .text('DESCRIPTION', 50, tableTop)
        .text('AMOUNT', 450, tableTop, { align: 'right' });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .strokeColor('#e2e8f0')
        .stroke();

      let currentY = tableTop + 30;

      // 1. List All Earnings
      doc
        .fillColor('#475569')
        .fontSize(10)
        .text('Total Gross Earnings', 50, currentY)
        .fillColor('#0f172a')
        .text(`INR ${payslip.grossEarnings?.toLocaleString() || 0}`, 450, currentY, { align: 'right' });

      currentY += 25;

      // 2. List All Deductions Dynamically
      const deductions = payslip.deductions || [];
      
      if (deductions.length > 0) {
        deductions.forEach(d => {
          doc
            .fillColor('#475569')
            .text(d.name || 'Deduction', 50, currentY)
            .fillColor('#ef4444')
            .text(`- INR ${d.amount?.toLocaleString() || 0}`, 450, currentY, { align: 'right' });
          currentY += 20;
        });
      } else if (payslip.totalDeductions > 0) {
        // Fallback for legacy records
        doc
          .fillColor('#475569')
          .text('Statutory Deductions', 50, currentY)
          .fillColor('#ef4444')
          .text(`- INR ${payslip.totalDeductions?.toLocaleString() || 0}`, 450, currentY, { align: 'right' });
        currentY += 20;
      }

      doc.moveDown(4);

      // ------------------------------------------------------------------
      // 🏆 NET PAYABLE (GRAND TOTAL)
      // ------------------------------------------------------------------
      const footerY = doc.y;
      doc
        .fillColor('#0f172a')
        .rect(50, footerY, 500, 50)
        .fill();

      doc
        .fillColor('#94a3b8')
        .fontSize(10)
        .text('NET PAYABLE AMOUNT', 70, footerY + 18);

      doc
        .fillColor('#ffffff')
        .fontSize(16)
        .text(`INR ${payslip.netPayable?.toLocaleString() || 0}`, 300, footerY + 16, { align: 'right', width: 230 });

      // ------------------------------------------------------------------
      // 📝 FOOTER
      // ------------------------------------------------------------------
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .text('This is a computer-generated document and does not require a physical signature.', 50, 750, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Helper to get month name
 */
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}

module.exports = generatePayslipPDF;
