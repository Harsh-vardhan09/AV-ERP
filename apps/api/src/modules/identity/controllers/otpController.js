const { sendmail } = require('../../notifications').mailtrap;
const logger = require('../../../core/logging/logger');

// In-memory OTP store: { key -> { otp, expiresAt } }
const otpStore = new Map();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const normalize = (email) =>
  String(email || '')
    .toLowerCase()
    .trim();

/**
 * Generate an OTP, mail it to `email`, and store it under `key`.
 * Callers that must bind the OTP to more than the address (a student changing
 * their own login email) pass a scoped key such as `${userId}:${email}`.
 */
const issueOtp = async (email, key = normalize(email)) => {
  const otp = generateOtp();
  otpStore.set(key, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  await sendmail(email, otp);
};

/**
 * Check and consume an OTP. Returns null when valid, or a user-facing message.
 */
const consumeOtp = (key, otp) => {
  const record = otpStore.get(key);
  if (!record) return 'OTP not requested or already used. Please request a new OTP.';
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return 'OTP has expired. Please request a new one.';
  }
  if (record.otp !== String(otp || '').trim()) return 'Incorrect OTP. Please try again.';
  otpStore.delete(key);
  return null;
};

// POST /admission/email/send-otp
exports.sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    await issueOtp(email);

    res.status(200).json({ success: true, message: `OTP sent to ${email}` });
  } catch (err) {
    logger.error('Send OTP error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to send OTP. Please check the email address.' });
  }
};

// POST /admission/email/verify-otp
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const error = consumeOtp(normalize(email), otp);
    if (error) return res.status(400).json({ success: false, message: error });

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

exports.issueOtp = issueOtp;
exports.consumeOtp = consumeOtp;
