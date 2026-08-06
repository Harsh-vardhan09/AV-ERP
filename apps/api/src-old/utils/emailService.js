/**
 * emailService.js — Gmail SMTP via Nodemailer
 * ──────────────────────────────────────────────────────────────────────────────
 * Single SMTP module for the entire ERP.
 *
 * Environment variables consumed:
 *   SMTP_HOST          — smtp.gmail.com
 *   SMTP_PORT          — 587
 *   SMTP_SECURE        — "false"  (STARTTLS on 587)
 *   SMTP_USER          — Gmail address (e.g. school-erp@gmail.com)
 *   SMTP_PASS          — Gmail App Password (16-char, NOT the account password)
 *   SMTP_FROM          — Sender display address (falls back to SMTP_USER)
 *   EMAIL_FROM         — Alias for SMTP_FROM (legacy compat)
 *   CLIENT_URL         — Frontend base URL used in email links
 */

'use strict';

const nodemailer = require('nodemailer');
const logger     = require('../../src/core/logging/logger.js');

// ─────────────────────────────────────────────────────────────────────────────
// Transporter factory
//
// WHY pool:false + no singleton caching?
//   Serverless environments (Vercel, AWS Lambda) kill TCP connections between
//   warm invocations. A pooled / cached transporter reuses a dead socket and
//   throws ECONNRESET on the very next send.  Creating a fresh transporter per
//   call is ~1 ms overhead and is the only reliable approach in both serverless
//   and long-running (PM2 / Docker) modes.
// ─────────────────────────────────────────────────────────────────────────────
const getTransporter = () => {
  const host   = process.env.SMTP_HOST;
  const port   = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true'; // false → STARTTLS on 587
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const missing = [
      !host && 'SMTP_HOST',
      !user && 'SMTP_USER',
      !pass && 'SMTP_PASS',
    ].filter(Boolean);
    logger.error('emailService: Missing required SMTP environment variables', { missing });
    throw new Error(`Missing SMTP config: ${missing.join(', ')}`);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },

    // ── NO connection pool — fresh TCP per send (serverless-safe) ──────────
    pool: false,

    tls: {
      minVersion:         'TLSv1.2',
      rejectUnauthorized: true,
    },

    // Explicit timeouts — avoid hanging forever in flaky network conditions
    connectionTimeout: 10_000,  // 10 s  — TCP connect
    greetingTimeout:   10_000,  // 10 s  — EHLO/HELO
    socketTimeout:     15_000,  // 15 s  — idle socket

    logger: process.env.NODE_ENV === 'development',
    debug:  process.env.NODE_ENV === 'development',
  });

  logger.info('emailService: SMTP transporter created', {
    host,
    port,
    secure,
    user: `${user.slice(0, 3)}***`,
  });

  return transporter;
};

/**
 * Verify SMTP credentials — call once at server boot.
 * Does NOT throw; the server can still start if email is misconfigured.
 */
const verifyTransporter = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    logger.info('emailService: SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('emailService: SMTP verification failed — emails will not be sent', {
      error: error.message,
      code:  error.code,
    });
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal send helper
// ─────────────────────────────────────────────────────────────────────────────
const _send = async ({ to, subject, html, attachments }) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    ...(attachments && { attachments }),
  });

  logger.info('emailService: Email sent', { to, subject, messageId: result.messageId });
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML shell — shared layout (inline CSS for email-client compatibility)
// ─────────────────────────────────────────────────────────────────────────────
const _shell = ({ headerBg = '#4F46E5', headerLabel, schoolName, body }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${headerLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:${headerBg};padding:26px 32px;border-radius:10px 10px 0 0;text-align:center;">
      <h2 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:0.4px;">
        ${schoolName || 'School ERP'}
      </h2>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${headerLabel}</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:30px 32px;border:1px solid #e5e7eb;
                border-top:none;border-radius:0 0 10px 10px;">
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        ${schoolName || 'School ERP'} — Automated message. Please do not reply.
      </p>
    </div>

  </div>
</body>
</html>`.trim();

// CTA button helper
const _btn = (url, label, bg = '#4F46E5') => `
  <div style="text-align:center;margin:24px 0;">
    <a href="${url}"
       style="background:${bg};color:#fff;padding:12px 28px;border-radius:7px;
              text-decoration:none;font-size:14px;font-weight:700;display:inline-block;">
      ${label}
    </a>
  </div>`;

// Warning banner helper
const _warn = (text, bg = '#fffbeb', border = '#f59e0b', color = '#92400e') => `
  <div style="background:${bg};border-left:4px solid ${border};padding:12px 16px;
              border-radius:0 6px 6px 0;margin-bottom:18px;">
    <p style="color:${color};font-size:13px;margin:0;line-height:1.6;">${text}</p>
  </div>`;

// ─────────────────────────────────────────────────────────────────────────────
// Role display-name map
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_DISPLAY_NAMES = {
  admission:       'Admission Staff',
  accounts:        'Accounts Staff',
  librarian:       'Librarian',
  exam_controller: 'Exam Controller',
  admin:           'School Administrator',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. sendStaffCredentials
//    Called by: staffController, libraryController, superAdminController
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} p
 * @param {string} p.to           - Recipient email
 * @param {string} p.staffName    - Full display name
 * @param {string} p.role         - Role key (e.g. "exam_controller")
 * @param {string} p.schoolName   - School name
 * @param {string} p.schoolCode   - School code
 * @param {string} p.tempPassword - Plain-text temporary password (shown once)
 * @param {string} p.loginUrl     - ERP login URL
 */
const sendStaffCredentials = async ({
  to, staffName, role, schoolName, schoolCode, tempPassword, loginUrl,
}) => {
  if (!to || !staffName || !tempPassword) {
    throw new Error('sendStaffCredentials: to, staffName, and tempPassword are required');
  }

  const roleLabel = ROLE_DISPLAY_NAMES[role] || (role.charAt(0).toUpperCase() + role.slice(1));
  const subject   = `Your ${roleLabel} Account — ${schoolName}`;
  const url       = loginUrl || process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';

  const html = _shell({
    headerBg:    '#4F46E5',
    headerLabel: 'Staff Account Created',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">Dear <strong>${staffName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 18px;">
        Your <strong>${roleLabel}</strong> account has been created on the
        <strong>${schoolName}</strong> ERP portal. Here are your login credentials:
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr style="background:#eef2ff;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #c7d2fe;
                     font-weight:600;width:40%;">School Code</td>
          <td style="padding:10px 14px;font-size:13px;color:#3730a3;border:1px solid #c7d2fe;
                     font-weight:700;">${schoolCode}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">Login URL</td>
          <td style="padding:10px 14px;font-size:13px;border:1px solid #e5e7eb;">
            <a href="${url}" style="color:#4f46e5;">${url}</a>
          </td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">Email / Username</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">
            ${to}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">Temporary Password</td>
          <td style="padding:10px 14px;font-size:18px;border:1px solid #e5e7eb;
                     font-family:monospace;letter-spacing:2px;font-weight:700;color:#1e1b4b;">
            ${tempPassword}
          </td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">Role</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">
            ${roleLabel}
          </td>
        </tr>
      </table>

      ${_warn('⚠️ You will be required to change this password on your first login. Do not share your credentials with anyone.')}
      ${_btn(url, 'Login to ERP Portal', '#4F46E5')}
      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
        If you did not expect this email, please contact your school administrator.
      </p>
    `,
  });

  try {
    const result = await _send({ to, subject, html });
    logger.info('sendStaffCredentials: Sent successfully', { to, role, schoolCode, messageId: result.messageId });
    return result;
  } catch (error) {
    logger.error('sendStaffCredentials: Failed to send', { to, role, error: error.message, code: error.code });
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. sendAdminCredentials
//    Called by: platformRoutes, superAdminController (role === 'admin')
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} p
 * @param {string} p.to           - Recipient email
 * @param {string} p.adminName    - Full display name
 * @param {string} p.schoolName   - School name
 * @param {string} p.schoolCode   - School code
 * @param {string} p.tempPassword - Plain-text temporary password
 * @param {string} p.loginUrl     - ERP login URL
 */
const sendAdminCredentials = async ({
  to, adminName, schoolName, schoolCode, tempPassword, loginUrl,
}) => {
  if (!to || !adminName || !tempPassword) {
    throw new Error('sendAdminCredentials: to, adminName, and tempPassword are required');
  }

  const subject = `Your School Admin Account — ${schoolName}`;
  const url     = loginUrl || process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';

  const html = _shell({
    headerBg:    '#059669',
    headerLabel: 'Admin Account Created',
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">Dear <strong>${adminName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 18px;">
        Congratulations! Your <strong>Administrator</strong> account for
        <strong>${schoolName}</strong> has been set up on the ERP Portal.
        Here are your credentials:
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #d1fae5;
                     font-weight:600;width:40%;">School Name</td>
          <td style="padding:10px 14px;font-size:13px;color:#065f46;border:1px solid #d1fae5;
                     font-weight:700;">${schoolName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">School Code</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-family:monospace;">${schoolCode}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">Login URL</td>
          <td style="padding:10px 14px;font-size:13px;border:1px solid #e5e7eb;">
            <a href="${url}" style="color:#059669;">${url}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">Admin Email</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;">
            ${to}
          </td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;
                     font-weight:600;">Temporary Password</td>
          <td style="padding:10px 14px;font-size:18px;border:1px solid #e5e7eb;
                     font-family:monospace;letter-spacing:2px;font-weight:700;color:#065f46;">
            ${tempPassword}
          </td>
        </tr>
      </table>

      ${_warn('⚠️ Please change your password immediately after your first login. Keep your credentials secure — do not share them with anyone.')}
      ${_btn(url, 'Login as Admin', '#059669')}
      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
        If you did not expect this email, please contact the platform administrator.
      </p>
    `,
  });

  try {
    const result = await _send({ to, subject, html });
    logger.info('sendAdminCredentials: Sent successfully', { to, schoolCode, messageId: result.messageId });
    return result;
  } catch (error) {
    logger.error('sendAdminCredentials: Failed to send', { to, error: error.message, code: error.code });
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. sendPasswordChangedNotification
//    Called by: authenticates.js (changePassword / changeFirstPassword)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} p
 * @param {string} p.to         - Recipient email
 * @param {string} p.userName   - Staff display name
 * @param {string} p.schoolName - School name
 */
const sendPasswordChangedNotification = async ({ to, userName, schoolName }) => {
  if (!to) {
    logger.warn('sendPasswordChangedNotification: No recipient email — skipping');
    return;
  }

  const subject = `Password Changed — ${schoolName || 'School ERP'}`;
  const now     = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const html = _shell({
    headerBg:    '#DC2626',
    headerLabel: 'Security Alert',
    schoolName:  schoolName || 'School ERP',
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">Dear <strong>${userName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your account password was successfully changed on
        <strong>${now} (IST)</strong>.
      </p>
      ${_warn(
        '🔒 If you did not make this change, please contact your school administrator immediately and reset your password.',
        '#fef2f2', '#dc2626', '#991b1b'
      )}
    `,
  });

  try {
    const result = await _send({ to, subject, html });
    logger.info('sendPasswordChangedNotification: Sent', { to, messageId: result.messageId });
    return result;
  } catch (err) {
    // Non-critical — log warning only, do not rethrow (don't block the auth flow)
    logger.warn('sendPasswordChangedNotification: Failed (non-critical)', {
      to,
      error: err.message,
      code:  err.code,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. sendPayslipEmail
//    Called by: payrollWorker / payroll controllers
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} p
 * @param {string} p.to           - Recipient email
 * @param {string} p.teacherName  - Teacher display name
 * @param {number} p.month        - Month (1–12)
 * @param {number} p.year         - Year
 * @param {string} p.schoolName   - School name
 * @param {string} p.pdfUrl       - Signed URL / path for the payslip PDF
 */
const sendPayslipEmail = async ({ to, teacherName, month, year, schoolName, pdfUrl }) => {
  if (!to) {
    logger.warn('sendPayslipEmail: No recipient email provided', { teacherName, month, year });
    throw new Error('sendPayslipEmail: Recipient email is required');
  }

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = MONTHS[month - 1] || String(month);
  const subject   = `Your Payslip for ${monthName} ${year} — ${schoolName}`;

  const html = _shell({
    headerBg:    '#059669',
    headerLabel: `Payslip — ${monthName} ${year}`,
    schoolName,
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">Dear <strong>${teacherName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your payslip for <strong>${monthName} ${year}</strong> has been generated
        and is ready to download.
      </p>
      ${_btn(pdfUrl, 'Download Payslip PDF', '#059669')}
      <p style="color:#6b7280;font-size:12px;text-align:center;margin:8px 0 0;">
        This link may expire. Log in to the portal to download again if needed.
      </p>
    `,
  });

  try {
    const result = await _send({
      to,
      subject,
      html,
      attachments: [{
        filename:    `Payslip_${monthName}_${year}.pdf`,
        path:        pdfUrl,
        contentType: 'application/pdf',
      }],
    });
    logger.info('sendPayslipEmail: Sent successfully', { to, month, year, messageId: result.messageId });
    return result;
  } catch (error) {
    logger.error('sendPayslipEmail: Failed to send', { to, error: error.message, code: error.code });
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Legacy wrappers — backward-compat for old routes using mailtrap templates
// ─────────────────────────────────────────────────────────────────────────────

/** OTP / email-verification email (legacy) */
const sendmail = async (email, otp) => {
  const { VERIFICATION_EMAIL_TEMPLATE } = require('../../mailtrap/mailtamplate');
  return _send({
    to:      email,
    subject: 'Verify your email — ERP Portal',
    html:    VERIFICATION_EMAIL_TEMPLATE.replace('{verificationCode}', otp),
  });
};

/** Welcome email (legacy) */
const sendwelcomeemail = async (mail, name) => {
  return _send({
    to:      mail,
    subject: 'Welcome to the ERP Portal!',
    html:    `<p style="font-family:Arial,sans-serif;">Hello <strong>${name}</strong>,<br><br>Welcome! Your account has been created successfully.</p>`,
  });
};

/** Password-reset link email (legacy) */
const resetPasswordmail = async (mail, resetURL) => {
  const { PASSWORD_RESET_REQUEST_TEMPLATE } = require('../../mailtrap/mailtamplate');
  return _send({
    to:      mail,
    subject: 'Reset your password — ERP Portal',
    html:    PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', resetURL),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  getTransporter,
  verifyTransporter,
  // Primary (used by controllers)
  sendStaffCredentials,
  sendAdminCredentials,
  sendPasswordChangedNotification,
  sendPayslipEmail,
  // Legacy (used by old routes)
  sendmail,
  sendwelcomeemail,
  resetPasswordmail,
};