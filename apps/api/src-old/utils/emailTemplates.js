/**
 * emailTemplates.js
 * Reusable HTML email template functions for the Notification System.
 * Each function returns { subject, html }.
 *
 * Rules:
 *  - Inline CSS only (Gmail strips <style> tags)
 *  - Max width 600px, centered
 *  - No external resources
 *  - Works in all major email clients
 */

// ── Helper: wraps content in the shared shell ──────────────────
const shell = ({ headerBg, headerLabel, schoolName, body }) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">
    <div style="background:${headerBg};padding:24px 28px;border-radius:10px 10px 0 0;text-align:center;">
      <h2 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:0.3px;">
        ${schoolName}
      </h2>
      <p style="color:rgba(255,255,255,0.82);margin:5px 0 0;font-size:13px;">
        ${headerLabel}
      </p>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0 16px;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        ${schoolName} — This is an automated message. Do not reply.
      </p>
    </div>
  </div>
</body>
</html>
`;

const btn = (url, label, bg) => `
  <div style="text-align:center;margin:22px 0;">
    <a href="${url}"
       style="background:${bg};color:#fff;padding:11px 26px;border-radius:7px;
              text-decoration:none;font-size:14px;font-weight:700;
              display:inline-block;letter-spacing:0.2px;">
      ${label}
    </a>
  </div>
`;

// ══════════════════════════════════════════════════════════════════
// 1. Attendance — student absent
// ══════════════════════════════════════════════════════════════════
exports.attendanceAbsentTemplate = ({ studentName, date, schoolName, loginUrl }) => ({
  subject: `Attendance Alert — ${studentName} marked absent`,
  html: shell({
    headerBg: '#4F46E5',
    headerLabel: 'Attendance Notification',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear Parent / Guardian,
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px;">
        This is to inform you that <strong>${studentName}</strong> was marked
        <strong style="color:#dc2626;">absent</strong> on <strong>${date}</strong>.
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 18px;">
        If this is incorrect, please contact the school administration immediately.
      </p>
      ${btn(`${loginUrl}/student/attendance`, 'View Attendance Record', '#4F46E5')}
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 2. Marks published
// ══════════════════════════════════════════════════════════════════
exports.marksPublishedTemplate = ({ studentName, subjectName, examName, schoolName, loginUrl }) => ({
  subject: `Marks Published — ${examName} | ${subjectName}`,
  html: shell({
    headerBg: '#059669',
    headerLabel: 'Marks Update',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${studentName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px;">
        Your marks for <strong>${subjectName}</strong> in <strong>${examName}</strong>
        have been published. Login to view your results.
      </p>
      ${btn(`${loginUrl}/student/marks`, 'View My Marks', '#059669')}
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 3. Report card ready
// ══════════════════════════════════════════════════════════════════
exports.reportCardReadyTemplate = ({ studentName, examName, schoolName, loginUrl }) => ({
  subject: `Report Card Ready — ${examName} | ${schoolName}`,
  html: shell({
    headerBg: '#7C3AED',
    headerLabel: 'Report Card Ready',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${studentName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px;">
        Your report card for <strong>${examName}</strong> has been finalized and is now available.
        Login to view and download your report card.
      </p>
      ${btn(`${loginUrl}/student/report-card`, 'View & Download Report Card', '#7C3AED')}
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 4. Fee payment receipt
// ══════════════════════════════════════════════════════════════════
exports.feePaymentReceiptTemplate = ({ studentName, amount, receiptNo, paymentDate, schoolName, loginUrl }) => ({
  subject: `Fee Payment Confirmed — ₹${amount} | ${schoolName}`,
  html: shell({
    headerBg: '#059669',
    headerLabel: 'Fee Payment Confirmed',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${studentName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        We have successfully received your fee payment. Below are the details:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #d1fae5;font-weight:600;">Amount Paid</td>
          <td style="padding:10px 14px;font-size:13px;color:#059669;border:1px solid #d1fae5;font-weight:700;">₹${amount}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Receipt No.</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">${receiptNo}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Payment Date</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">${paymentDate}</td>
        </tr>
      </table>
      ${btn(`${loginUrl}/student/fees`, 'View Fee Ledger', '#059669')}
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 5. Fee due reminder
// ══════════════════════════════════════════════════════════════════
exports.feeDueReminderTemplate = ({ studentName, amount, dueDate, schoolName, loginUrl }) => ({
  subject: `Fee Due Reminder — ₹${amount} due on ${dueDate}`,
  html: shell({
    headerBg: '#D97706',
    headerLabel: 'Fee Due Reminder',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${studentName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px;">
        This is a friendly reminder that a fee of <strong>₹${amount}</strong> is due
        on <strong>${dueDate}</strong>. Please ensure timely payment to avoid any late fees.
      </p>
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:18px;">
        <p style="color:#92400e;font-size:13px;margin:0;">
          ⚠️ Please pay before the due date to avoid penalty charges.
        </p>
      </div>
      ${btn(`${loginUrl}/student/fees`, 'View Fee Details', '#D97706')}
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 6. Fee overdue
// ══════════════════════════════════════════════════════════════════
exports.feeOverdueTemplate = ({ studentName, amount, dueSince, schoolName, loginUrl }) => ({
  subject: `Fee Overdue — ₹${amount} | ${schoolName}`,
  html: shell({
    headerBg: '#DC2626',
    headerLabel: 'Overdue Fee Alert',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${studentName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px;">
        A fee payment of <strong>₹${amount}</strong> that was due since
        <strong>${dueSince}</strong> remains unpaid.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:18px;">
        <p style="color:#991b1b;font-size:13px;margin:0;">
          🚨 <strong>Immediate action required.</strong> Continued non-payment may result in account suspension.
          Please contact the school accounts department.
        </p>
      </div>
      ${btn(`${loginUrl}/student/fees`, 'View Fee Details', '#DC2626')}
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 7. Leave decision (approved / rejected)
// ══════════════════════════════════════════════════════════════════
exports.leaveDecisionTemplate = ({
  applicantName, leaveType, fromDate, toDate,
  status, reason, approvedByName, schoolName, loginUrl,
}) => {
  const approved = status === 'Approved' || status === 'approved';
  const headerBg = approved ? '#059669' : '#DC2626';
  const statusLabel = approved ? 'APPROVED' : 'REJECTED';
  const statusColor = approved ? '#059669' : '#DC2626';
  const statusBg = approved ? '#f0fdf4' : '#fef2f2';
  const statusBorder = approved ? '#d1fae5' : '#fecaca';

  return {
    subject: `Leave ${statusLabel} — ${fromDate} to ${toDate} | ${schoolName}`,
    html: shell({
      headerBg,
      headerLabel: `Leave Application ${statusLabel}`,
      schoolName,
      body: `
        <p style="color:#111827;font-size:15px;margin:0 0 12px;">
          Dear ${applicantName},
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
          Your leave application has been reviewed.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr style="background:${statusBg};">
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid ${statusBorder};font-weight:600;">Status</td>
            <td style="padding:10px 14px;font-size:13px;color:${statusColor};border:1px solid ${statusBorder};font-weight:700;">${statusLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Leave Type</td>
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">${leaveType}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">From — To</td>
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">${fromDate} → ${toDate}</td>
          </tr>
          ${approvedByName ? `
          <tr>
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Reviewed By</td>
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">${approvedByName}</td>
          </tr>` : ''}
          ${!approved && reason ? `
          <tr style="background:#fef2f2;">
            <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #fecaca;font-weight:600;">Rejection Reason</td>
            <td style="padding:10px 14px;font-size:13px;color:#991b1b;border:1px solid #fecaca;">${reason}</td>
          </tr>` : ''}
        </table>
        ${btn(`${loginUrl}/teacher/leave`, 'View My Leave', headerBg)}
      `,
    }),
  };
};

// ══════════════════════════════════════════════════════════════════
// 8. Notice published
// ══════════════════════════════════════════════════════════════════
exports.noticePublishedTemplate = ({ title, content, schoolName, loginUrl, targetRole }) => {
  const preview = content && content.length > 200 ? content.substring(0, 200) + '...' : (content || '');
  return {
    subject: `New Notice — ${title} | ${schoolName}`,
    html: shell({
      headerBg: '#4F46E5',
      headerLabel: `School Notice${targetRole ? ` for ${targetRole}s` : ''}`,
      schoolName,
      body: `
        <p style="color:#111827;font-size:15px;margin:0 0 12px;">
          Dear ${targetRole ? targetRole.charAt(0).toUpperCase() + targetRole.slice(1) : 'Member'},
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">
          A new notice has been published:
        </p>
        <div style="background:#eef2ff;border-left:4px solid #4F46E5;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:18px;">
          <p style="color:#3730a3;font-size:14px;font-weight:700;margin:0 0 6px;">${title}</p>
          ${preview ? `<p style="color:#4338ca;font-size:13px;line-height:1.6;margin:0;">${preview}</p>` : ''}
        </div>
        ${btn(`${loginUrl}/student/notices`, 'Read Full Notice', '#4F46E5')}
      `,
    }),
  };
};

// ══════════════════════════════════════════════════════════════════
// 9. Account deactivated
// ══════════════════════════════════════════════════════════════════
exports.accountDeactivatedTemplate = ({ userName, schoolName, contactEmail }) => ({
  subject: `Account Update — ${schoolName}`,
  html: shell({
    headerBg: '#6B7280',
    headerLabel: 'Account Status Update',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${userName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px;">
        This is to inform you that your account on the <strong>${schoolName}</strong> ERP Portal
        has been <strong style="color:#dc2626;">deactivated</strong>.
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px;">
        If you believe this is an error or need assistance, please contact the school administration:
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 18px;margin-bottom:18px;text-align:center;">
        <p style="color:#374151;font-size:14px;margin:0;">
          📧 <a href="mailto:${contactEmail}" style="color:#4F46E5;text-decoration:none;font-weight:600;">${contactEmail}</a>
        </p>
      </div>
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 10. Welcome — new student account
// ══════════════════════════════════════════════════════════════════
exports.welcomeStudentTemplate = ({
  studentName, schoolName, loginUrl,
  admissionNumber, rollNo, password,
}) => ({
  subject: `Welcome to ${schoolName} — Your Account is Ready`,
  html: shell({
    headerBg: '#4F46E5',
    headerLabel: 'Welcome to the ERP Portal',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${studentName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your student account at <strong>${schoolName}</strong> has been created.
        Here are your login credentials:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr style="background:#eef2ff;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #c7d2fe;font-weight:600;">Admission Number</td>
          <td style="padding:10px 14px;font-size:13px;color:#3730a3;border:1px solid #c7d2fe;font-weight:700;">${admissionNumber}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Roll Number</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">${rollNo}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Temporary Password</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-family:monospace;">${password}</td>
        </tr>
      </table>
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:18px;">
        <p style="color:#92400e;font-size:13px;margin:0;">
          ⚠️ Please change your password after your first login for security.
        </p>
      </div>
      ${btn(`${loginUrl}`, 'Login to Portal', '#4F46E5')}
    `,
  }),
});

// ══════════════════════════════════════════════════════════════════
// 11. Welcome — new teacher account
// ══════════════════════════════════════════════════════════════════
exports.welcomeTeacherTemplate = ({
  teacherName, schoolName, loginUrl,
  employeeId, password, loginEmail,
}) => ({
  subject: `Welcome to ${schoolName} — Your Teacher Account is Ready`,
  html: shell({
    headerBg: '#059669',
    headerLabel: 'Welcome to the ERP Portal',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">
        Dear ${teacherName},
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your teacher account at <strong>${schoolName}</strong> has been created.
        Here are your login credentials:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #d1fae5;font-weight:600;">Employee ID</td>
          <td style="padding:10px 14px;font-size:13px;color:#065f46;border:1px solid #d1fae5;font-weight:700;">${employeeId}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Login Email</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">${loginEmail}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-weight:600;">Temporary Password</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;font-family:monospace;">${password}</td>
        </tr>
      </table>
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:18px;">
        <p style="color:#92400e;font-size:13px;margin:0;">
          ⚠️ Please change your password after your first login for security.
        </p>
      </div>
      ${btn(`${loginUrl}`, 'Login to Portal', '#059669')}
    `,
  }),
});

