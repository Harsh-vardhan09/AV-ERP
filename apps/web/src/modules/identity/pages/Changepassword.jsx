import React from 'react';
import { useForm } from 'react-hook-form';
import { useConformpasswordMutation } from '../api/userApi';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const ChangePassword = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
const { token } = useParams();
  const password = watch('password');
  const [conformpassword, { isLoading, error }] = useConformpasswordMutation();
 const navigate= useNavigate();
  const onSubmit =async (data) => {
    const { password, password2 } = data;
    try {
      await conformpassword({
        token, 
        password, 
        password2
      }).unwrap();
      toast.success('Password reset successful');
      navigate('/')
    } catch (err) {
      toast.error('Password reset failed', err);

    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Change Password</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* New Password Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">New Password</label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Enter your new password"
              className={`w-full px-4 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}

          {/* Confirm Password Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirm your new password"
              className={`w-full px-4 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('password2', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
