'use strict';

const logger = require('../../../core/logging/logger');

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const useResendApi = () =>
  Boolean(process.env.RESEND_API_KEY) && process.env.EMAIL_TRANSPORT !== 'smtp';

// Shaped like a nodemailer transport so every existing caller works unchanged
const resendApiTransport = () => ({
  sendMail: async ({ from, to, subject, html, text, attachments }) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        ...(html && { html }),
        ...(text && { text }),
        // Resend takes the same filename/path/content keys; contentType is inferred
        ...(attachments?.length && {
          attachments: attachments.map(({ filename, path, content }) => ({
            filename,
            ...(path && { path }),
            ...(content && { content }),
          })),
        }),
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Resend API ${response.status}: ${body?.message || 'send failed'}`);
    }
    return { messageId: body.id };
  },

  // Nothing to handshake over HTTP; a key check is the only useful signal
  verify: async () => {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    return true;
  },
});

// SMTP_USER is not an address on every provider — with Resend it is literally
// "resend", which the API rejects with a 422. Only fall back to it if it looks
// like an email
const fromAddress = () => {
  const explicit = process.env.SMTP_FROM || process.env.EMAIL_FROM;
  if (explicit) return explicit;
  const user = process.env.SMTP_USER;
  return user && user.includes('@') ? user : 'onboarding@resend.dev';
};

const _send = async ({ to, subject, html, text, attachments }) => {
  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html && { html }),
    ...(text && { text }),
    ...(attachments?.length && { attachments }),
  });

  if (error) {
    throw new Error(error.message || 'Resend email failed');
  }

  return {
    messageId: data.id,
  };
};

// HTML shell — shared layout (inline CSS for email-client compatibility)
const _shell = ({ headerBg = '#4F46E5', headerLabel, schoolName, body }) =>
  `
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

// Role display-name map
const ROLE_DISPLAY_NAMES = {
  admission: 'Admission Staff',
  accounts: 'Accounts Staff',
  librarian: 'Librarian',
  exam_controller: 'Exam Controller',
  admin: 'School Administrator',
};

const sendStaffCredentials = async ({
  to,
  staffName,
  role,
  schoolName,
  schoolCode,
  tempPassword,
  loginUrl,
}) => {
  if (!to || !staffName || !tempPassword) {
    throw new Error('sendStaffCredentials: to, staffName, and tempPassword are required');
  }

  const roleLabel = ROLE_DISPLAY_NAMES[role] || role.charAt(0).toUpperCase() + role.slice(1);
  const subject = `Your ${roleLabel} Account — ${schoolName}`;
  const url = loginUrl || process.env.CLIENT_URL || 'https://averp.com';

  const html = _shell({
    headerBg: '#4F46E5',
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
    logger.info('sendStaffCredentials: Sent successfully', {
      to,
      role,
      schoolCode,
      messageId: result.messageId,
    });
    return result;
  } catch (error) {
    logger.error('sendStaffCredentials: Failed to send', {
      to,
      role,
      error: error.message,
      code: error.code,
    });
    throw error;
  }
};

const sendAdminCredentials = async ({
  to,
  adminName,
  schoolName,
  schoolCode,
  tempPassword,
  loginUrl,
}) => {
  if (!to || !adminName || !tempPassword) {
    throw new Error('sendAdminCredentials: to, adminName, and tempPassword are required');
  }

  const subject = `Your School Admin Account — ${schoolName}`;
  const url = loginUrl || process.env.CLIENT_URL || 'https://averp.com';

  const html = _shell({
    headerBg: '#059669',
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
    logger.info('sendAdminCredentials: Sent successfully', {
      to,
      schoolCode,
      messageId: result.messageId,
    });
    return result;
  } catch (error) {
    logger.error('sendAdminCredentials: Failed to send', {
      to,
      error: error.message,
      code: error.code,
    });
    throw error;
  }
};

const sendPasswordChangedNotification = async ({ to, userName, schoolName }) => {
  if (!to) {
    logger.warn('sendPasswordChangedNotification: No recipient email — skipping');
    return;
  }

  const subject = `Password Changed — ${schoolName || 'School ERP'}`;
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const html = _shell({
    headerBg: '#DC2626',
    headerLabel: 'Security Alert',
    schoolName: schoolName || 'School ERP',
    body: `
      <p style="color:#111827;font-size:15px;margin:0 0 12px;">Dear <strong>${userName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your account password was successfully changed on
        <strong>${now} (IST)</strong>.
      </p>
      ${_warn(
        '🔒 If you did not make this change, please contact your school administrator immediately and reset your password.',
        '#fef2f2',
        '#dc2626',
        '#991b1b'
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
      code: err.code,
    });
  }
};

const sendPayslipEmail = async ({ to, teacherName, month, year, schoolName, pdfUrl }) => {
  if (!to) {
    logger.warn('sendPayslipEmail: No recipient email provided', { teacherName, month, year });
    throw new Error('sendPayslipEmail: Recipient email is required');
  }

  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthName = MONTHS[month - 1] || String(month);
  const subject = `Your Payslip for ${monthName} ${year} — ${schoolName}`;

  const html = _shell({
    headerBg: '#059669',
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
      attachments: [
        {
          filename: `Payslip_${monthName}_${year}.pdf`,
          path: pdfUrl,
          contentType: 'application/pdf',
        },
      ],
    });
    logger.info('sendPayslipEmail: Sent successfully', {
      to,
      month,
      year,
      messageId: result.messageId,
    });
    return result;
  } catch (error) {
    logger.error('sendPayslipEmail: Failed to send', {
      to,
      error: error.message,
      code: error.code,
    });
    throw error;
  }
};

// Legacy wrappers — backward-compat for old routes using mailtrap templates

/** OTP / email-verification email (legacy) */
const sendmail = async (email, otp) => {
  const { VERIFICATION_EMAIL_TEMPLATE } = require('./mailTemplates');
  return _send({
    to: email,
    subject: 'Verify your email — ERP Portal',
    html: VERIFICATION_EMAIL_TEMPLATE.replace('{verificationCode}', otp),
  });
};

const sendwelcomeemail = async (mail, name) => {
  return _send({
    to: mail,
    subject: 'Welcome to the ERP Portal!',
    html: `<p style="font-family:Arial,sans-serif;">Hello <strong>${name}</strong>,<br><br>Welcome! Your account has been created successfully.</p>`,
  });
};

/** Password-reset link email (legacy) */
const resetPasswordmail = async (mail, resetURL) => {
  const { PASSWORD_RESET_REQUEST_TEMPLATE } = require('./mailTemplates');
  return _send({
    to: mail,
    subject: 'Reset your password — ERP Portal',
    html: PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', resetURL),
  });
};

module.exports = {
  fromAddress,
  sendStaffCredentials,
  sendAdminCredentials,
  sendPasswordChangedNotification,
  sendPayslipEmail,
  // Legacy (used by old routes)
  sendmail,
  sendwelcomeemail,
  resetPasswordmail,
};
