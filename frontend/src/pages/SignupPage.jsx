import React from 'react';
import { useForm } from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSignupMutation } from '../redux/api/userApi';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/reducers/userreducer';
import toast from 'react-hot-toast';

const Signup = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [signup, { isLoading, error }] = useSignupMutation();
 const dispatch = useDispatch();

   const onSubmit = async (data) => {
    try {
      await signup({ email: data.email, password: data.password, name: data.name , scholar_no:data.scholar_no}).unwrap();
    dispatch(setUser(data));
      toast.success('Sign up successful:');
      navigate('/otp');
    } 
    catch (err) {
      toast.error('Error during sign up :', err);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Sign Up</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="name">Full Name</label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Your Full Name"
              className={`w-full px-4 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('name', { required: 'Full Name is required' })}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
              

          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor=" scholar_no">scholar number</label>
            <input
              type="string"
              name=" scholar_no"
              id=" scholar_no"
              placeholder="Your scholar Number"
              className={`w-full px-4 py-2 border ${errors.scholar_no ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('scholar_no', {
                required: 'scholar is required'
              })}
            />
            {errors.scholar_no && <p className="text-red-500 text-sm mt-1">{errors.scholar_no.message}</p>}
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="Your Email Address"
              className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Create a Password"
              className={`w-full px-4 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>
          {/* <div>
            <input type="file" name="photo" {...register('photo')} />
          </div> */}

          {/* Submit Button */}
          <button  
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            disabled={isLoading} // Disable button during loading state
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
          {/* Show API error message */}

          {error && (
            <p className="text-red-500 text-sm mt-1">{error.data?.message || 'Error signing up'}</p>
          )}
        </form>

        <div className="text-center mt-6 text-gray-500">
          Already have an account? <NavLink to="/login" className="text-indigo-500">Log in</NavLink>
        </div>
      </div>
    </div>
  );
};

export default Signup;
