import React, { useState } from 'react';
import { useSendEmailOtpMutation, useVerifyEmailOtpMutation } from '../redux/api/admissionApi';
import toast from 'react-hot-toast';

/**
 * EmailOtpVerifier
 * Props:
 *   email        - current email value from parent form
 *   onEmailChange - parent's onChange handler (name="email")
 *   onVerified   - callback(email) when OTP verified successfully
 *   required     - whether email is required (shows * on label)
 *   disabled     - disables all inputs (e.g. during form submission)
 */
const EmailOtpVerifier = ({ email, onEmailChange, onVerified, required = false, disabled = false }) => {
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [sendOtp, { isLoading: sending }] = useSendEmailOtpMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyEmailOtpMutation();

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      await sendOtp({ email }).unwrap();
      setOtpSent(true);
      setVerified(false);
      setOtp('');
      startCountdown();
      toast.success(`OTP sent to ${email}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    try {
      await verifyOtp({ email, otp }).unwrap();
      setVerified(true);
      onVerified?.(email);
      toast.success('Email verified!');
    } catch (err) {
      toast.error(err?.data?.message || 'Incorrect OTP');
    }
  };

  // If email changes after verification, reset
  const handleEmailChange = (e) => {
    if (verified) {
      setVerified(false);
      setOtpSent(false);
      setOtp('');
    }
    onEmailChange(e);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Email{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Email input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            disabled={disabled || verified}
            placeholder="Enter email address"
            className={`w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition
              ${verified ? 'border-green-400 bg-green-50 text-green-800 pr-7' : 'border-gray-300 bg-white'}
              ${disabled ? 'opacity-60' : ''}`}
          />
          {verified && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 text-base">✓</span>
          )}
        </div>
        {!verified && (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sending || countdown > 0 || !email || disabled}
            className="whitespace-nowrap bg-blue-600 text-white text-xs px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
            {sending ? 'Sending…' : countdown > 0 ? `Retry in ${countdown}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
          </button>
        )}
      </div>

      {/* Verified badge */}
      {verified && (
        <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
          ✓ Email verified
          <button type="button" onClick={() => { setVerified(false); setOtpSent(false); }}
            className="text-gray-400 underline text-xs ml-1">Change</button>
        </p>
      )}

      {/* OTP input */}
      {otpSent && !verified && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Enter the 6-digit OTP sent to your email (valid 10 min)</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="- - - - - -"
              className="w-36 border border-gray-300 rounded-md px-3 py-2 text-sm text-center tracking-widest font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || otp.length !== 6}
              className="bg-green-600 text-white text-xs px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium">
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailOtpVerifier;
