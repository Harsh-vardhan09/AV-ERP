const { getTransporter } = require('./emailService');
const { PASSWORD_RESET_REQUEST_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } = require('./mailTemplates');
const logger = require('../../../core/logging/logger');

// Transport comes from emailService, which validates the SMTP env vars and pins
// TLS 1.2. This file used to hardcode service:'gmail' and skip both.
const _from = () => process.env.SMTP_FROM || process.env.EMAIL_FROM || `ERP Unified Campus <${process.env.SMTP_USER}>`;

// Errors stay swallowed: otpController awaits these inside its own try/catch and
// still returns 200, so throwing here would change that endpoint's contract
const _send = async (label, mailOptions) => {
  try {
    await getTransporter().sendMail({ from: _from(), ...mailOptions });
  } catch (error) {
    logger.error(`[mailtrap] ${label} failed:`, error.message);
  }
};

exports.sendmail = (email, otp) =>
  _send('sendmail', {
    to:       email,
    subject:  'Verify your email',
    html:     VERIFICATION_EMAIL_TEMPLATE.replace('{verificationCode}', otp),
    category: 'Email verification',
  });

exports.sendwelcomeemail = (mail, names) =>
  _send('sendwelcomeemail', {
    to:       mail,
    subject:  'Welcome to our website!',
    html:     `Hello ${names}, <br> Welcome to our website! Your account has been created successfully.`,
    category: 'Welcome email',
  });

exports.resetPasswordmail = (mail, token) =>
  _send('resetPasswordmail', {
    to:       mail,
    subject:  'Reset your password',
    html:     PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', token),
    category: 'Password Reset',
  });
