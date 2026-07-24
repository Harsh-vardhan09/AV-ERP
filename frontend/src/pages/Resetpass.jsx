import React from 'react';
import { useForm } from 'react-hook-form';
import { NavLink, useParams } from 'react-router-dom';
import { useChangepasswordMutation } from '../redux/api/userApi';
import { toast } from 'react-hot-toast'; // To display success/error notifications

const ForgotPassword = () => {


  const { register, handleSubmit, formState: { errors } } = useForm();
  const [changepassword, { isLoading, error }] = useChangepasswordMutation();

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      await changepassword({ email: data.email }).unwrap();
      toast.success('Password reset link has been sent to your email!');
    } catch (err) {
      toast.error('Failed to send reset link. Please try again.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Forgot Password</h2>
        <p className="text-center text-gray-500 mb-6">Enter your email address to reset your password.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="Enter your email"
              className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                  message: 'Please enter a valid email address',
                },
              })}
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            disabled={isLoading} // Disable button when loading
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {error && (
          <p className="text-red-500 text-sm mt-4 text-center">
            {error?.data?.message || 'An error occurred. Please try again.'}
          </p>
        )}

        <div className="text-center mt-6 text-gray-500">
          Remember your password? <NavLink to="/login" className="text-indigo-500">Log in</NavLink>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
