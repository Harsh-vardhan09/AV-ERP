import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginSuperAdminMutation, useCheckSuperAdminAuthQuery } from '../../redux/api/superAdminApi';
import { setSuperAdmin } from '../../redux/slices/superAdminSlice';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

const SuperAdminLogin = () => {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const [login, { isLoading }] = useLoginSuperAdminMutation();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});

  // If already authenticated, redirect immediately
  const { data: authData, isLoading: authChecking } = useCheckSuperAdminAuthQuery();
  useEffect(() => {
    if (!authChecking && authData?.success) {
      navigate('/superadmin/dashboard', { replace: true });
    }
  }, [authData, authChecking, navigate]);

  const validate = () => {
    const errs = {};
    if (!email.trim())              errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email address';
    if (!password)                  errs.password = 'Password is required';
    else if (password.length < 6)   errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    try {
      const res = await login({ email: email.trim(), password }).unwrap();
      dispatch(setSuperAdmin(res.superAdmin));
      toast.success('Login successful');
      navigate('/superadmin/dashboard', { replace: true });
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  if (authChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
          Super Admin Login
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          NexiSpark Platform Control
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="sa-email">
              Email Address
            </label>
            <input
              id="sa-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((er) => ({ ...er, email: '' })); }}
              placeholder="superadmin@nexisparkx.com"
              autoComplete="email"
              className={`w-full px-4 py-2 border ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="sa-password">
              Password
            </label>
            <div className="relative">
              <input
                id="sa-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((er) => ({ ...er, password: '' })); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`w-full px-4 py-2 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowPass((p) => !p)}
              >
                <span className="material-icons text-sm">
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            id="sa-login-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300 flex justify-center items-center"
          >
            {isLoading ? <Loader /> : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6 text-gray-600">
          School admin?{' '}
          <NavLink to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Login here →
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
