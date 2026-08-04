import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useVarifyemailidMutation } from '../redux/api/userApi';
import toast from 'react-hot-toast';

const OTPVerification = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const [varifyemailid, { isLoading, error }] = useVarifyemailidMutation(); // RTK Query hook
  // Form submission handler

  const onSubmit =async (data) => {
    const otp = data.otp;
    toast.success('OTP Submitted:', otp);
    // Here, you would typically send the OTP to your backend for verification
    try {
 await varifyemailid({otp }).unwrap();
 toast.success("email verified successfully");
     navigate('/login')
    } catch (error) {
      toast.error(`Error during sign up:${error.data.message}`);
    }
  };



  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Verify OTP</h2>
        <p className="text-center text-gray-500 mb-6">Enter the 6-digit OTP sent to your email/phone.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* OTP Input */}
          <div className="flex justify-center">
            <input
              type="text"
              name="otp"
              maxLength="6"
              placeholder="Enter OTP"
              className={`w-full px-4 py-2 text-center tracking-widest text-lg border ${errors.otp ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('otp', {
                required: 'OTP is required',
                pattern: {
                  value: /^\d{6}$/,
                  message: 'Invalid OTP. Please enter a 6-digit code',
                },
              })}
            />
          </div>
          {errors.otp && <p className="text-red-500 text-sm mt-1 text-center">{errors.otp.message}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
          >
            Verify OTP
          </button>
          {error && (
            <p className="text-red-500 text-sm mt-1">{error.data?.message || 'Error signing up'}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default OTPVerification;
