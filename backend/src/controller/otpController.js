const { sendmail } = require('../../mailtrap/mailtrap');

// In-memory OTP store: { email -> { otp, expiresAt } }
const otpStore = new Map();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /admission/email/send-otp
exports.sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase().trim(), { otp, expiresAt });

    await sendmail(email, otp);

    res.status(200).json({ success: true, message: `OTP sent to ${email}` });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please check the email address.' });
  }
};

// POST /admission/email/verify-otp
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const key = email.toLowerCase().trim();
    const record = otpStore.get(key);

    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP not requested or already used. Please request a new OTP.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // OTP verified — remove from store
    otpStore.delete(key);
    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};
