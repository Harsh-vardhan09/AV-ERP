'use strict';

const {
  sendmail: sendEmailVerification,
  sendwelcomeemail: sendWelcomeEmail,
  resetPasswordmail: sendPasswordResetEmail,
} = require('./emailService');

const logger = require('../../../core/logging/logger');

/**
 * Legacy Mailtrap-compatible wrappers.
 *
 * The actual email delivery is now handled by Resend
 * through emailService.js.
 *
 * These wrappers are kept so existing controllers do not
 * need to change immediately.
 */

exports.sendmail = async (email, otp) => {
  try {
    return await sendEmailVerification(email, otp);
  } catch (error) {
    logger.error('[mail] sendmail failed:', error.message);
    throw error; // OTP must report failure
  }
};

exports.sendwelcomeemail = async (mail, names) => {
  try {
    return await sendWelcomeEmail(mail, names);
  } catch (error) {
    // Welcome email is non-critical.
    logger.error('[mail] sendwelcomeemail failed:', error.message);
    return undefined;
  }
};

exports.resetPasswordmail = async (mail, token) => {
  try {
    return await sendPasswordResetEmail(mail, token);
  } catch (error) {
    // Password-reset email should normally be reported to the caller.
    logger.error('[mail] resetPasswordmail failed:', error.message);
    throw error;
  }
};
