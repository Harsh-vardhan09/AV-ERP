/**
 * ForcePasswordChange.jsx
 * Shown when mustChangePassword === true immediately after login.
 * Styled to match the existing login page (bg-gray-50 / white card / indigo-600).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useCheak_authQuery, useChangeFirstPasswordMutation } from '../api/userApi';
import { setUser } from '@shared/lib/store/userSlice';
import toast from 'react-hot-toast';

const roleHome = {
  admin:     '/admin/dashboard',
  teacher:   '/teacher/dashboard',
  student:   '/student/dashboard',
  admission: '/admission/dashboard',
  accounts:  '/accounts/fee/students',
};

const checks = (pwd) => ({
  length:    pwd.length >= 8,
  uppercase: /[A-Z]/.test(pwd),
  lowercase: /[a-z]/.test(pwd),
  number:    /[0-9]/.test(pwd),
});

const ForcePasswordChange = () => {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { data: authData, refetch } = useCheak_authQuery();
  const user = authData?.user;

  const [changeFirstPassword, { isLoading }] = useChangeFirstPasswordMutation();

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState('');

  const strength = checks(newPassword);
  const allMet   = Object.values(strength).every(Boolean);
  const matched  = confirmPassword && newPassword === confirmPassword;
  const canSubmit = allMet && matched && !isLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await changeFirstPassword({ newPassword, confirmPassword }).unwrap();
      dispatch(setUser({ user: { ...user, mustChangePassword: false } }));
      // Invalidating ['user'] only starts a refetch — the old cheak_auth payload
      // stays readable while it runs, so navigating now lets RouteGuard read
      // mustChangePassword: true and bounce straight back here.
      await refetch();
      toast.success('Password updated successfully. Welcome!');
      navigate(roleHome[user?.role] || '/login', { replace: true });
    } catch (err) {
      const msg = err?.data?.message || 'Failed to change password. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">

        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">
          Set Your Password
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Your account was created by an admin. Please set a personal password to continue.
        </p>

        {/* User info strip */}
        {user && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 mb-6 border">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user.firstName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-800 text-sm truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
            <span className="ml-auto px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold capitalize flex-shrink-0">
              {user.role}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

          {/* New Password */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="newPassword">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Enter new password"
                autoComplete="new-password"
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew(p => !p)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons text-sm">
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Password requirements */}
          {newPassword && (
            <ul className="text-xs space-y-1 bg-gray-50 rounded-lg px-4 py-3 border">
              {[
                { key: 'length',    label: 'At least 8 characters' },
                { key: 'uppercase', label: 'One uppercase letter (A–Z)' },
                { key: 'lowercase', label: 'One lowercase letter (a–z)' },
                { key: 'number',    label: 'One number (0–9)' },
              ].map(({ key, label }) => (
                <li key={key} className={`flex items-center gap-2 ${strength[key] ? 'text-green-600' : 'text-gray-400'}`}>
                  {strength[key] ? (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <span className="w-3.5 h-3.5 flex-shrink-0 inline-block rounded-full border border-gray-300" />
                  )}
                  {label}
                </li>
              ))}
            </ul>
          )}

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(p => !p)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons text-sm">
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {confirmPassword && (
              <p className={`text-xs mt-1 ${matched ? 'text-green-600' : 'text-red-500'}`}>
                {matched ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="set-password-btn"
            disabled={!canSubmit}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Updating password…' : 'Set Password & Continue'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          This is a required one-time step. You cannot access the portal until your password is set.
        </p>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
