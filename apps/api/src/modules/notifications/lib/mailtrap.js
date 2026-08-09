const { getTransporter, fromAddress } = require('./emailService');
const { PASSWORD_RESET_REQUEST_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } = require('./mailTemplates');
const logger = require('../../../core/logging/logger');

// Transport comes from emailService, which validates the SMTP env vars and pins
// TLS 1.2. This file used to hardcode service:'gmail' and skip both.
const _from = fromAddress;

// Errors stay swallowed for the fire-and-forget mails: a failed welcome email
// must not fail the registration that triggered it. OTP is the exception —
// swallowing there returns "OTP sent" for a mail that never left, so the user
// waits on a code that will never arrive.
const _send = async (label, mailOptions, { rethrow = false } = {}) => {
  try {
    await getTransporter().sendMail({ from: _from(), ...mailOptions });
  } catch (error) {
    logger.error(`[mailtrap] ${label} failed:`, error.message);
    if (rethrow) throw error;
  }
};

exports.sendmail = (email, otp) =>
  _send(
    'sendmail',
    {
      to: email,
      subject: 'Verify your email',
      html: VERIFICATION_EMAIL_TEMPLATE.replace('{verificationCode}', otp),
      category: 'Email verification',
    },
    { rethrow: true }
  );

exports.sendwelcomeemail = (mail, names) =>
  _send('sendwelcomeemail', {
    to: mail,
    subject: 'Welcome to our website!',
    html: `Hello ${names}, <br> Welcome to our website! Your account has been created successfully.`,
    category: 'Welcome email',
  });

exports.resetPasswordmail = (mail, token) =>
  _send('resetPasswordmail', {
    to: mail,
    subject: 'Reset your password',
    html: PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', token),
    category: 'Password Reset',
  });
