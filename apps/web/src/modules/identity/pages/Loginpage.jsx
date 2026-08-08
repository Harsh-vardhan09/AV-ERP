import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ArrowRight
} from 'lucide-react';
import { useLoginMutation, authApi } from '../api/userApi';
import { useDispatch } from 'react-redux';
import { setUser, userlogout } from '@shared/lib/store/userSlice';
import toast from 'react-hot-toast';
import Loader from '@shared/ui/Loader';
import useOasesAuthStore from '@modules/oases/store/authStore';
import BackgroundBeams from '@shared/ui/background-beams';

// ── Role options shown in the "Login as" dropdown ────────────────────────────
const LOGIN_ROLES = [
  { value: 'student',         label: 'Student'          },
  { value: 'teacher',         label: 'Teacher'          },
  { value: 'admin',           label: 'Admin'            },
  { value: 'admission',       label: 'Admission'        },
  { value: 'accounts',        label: 'Accounts'         },
  { value: 'librarian',       label: 'Librarian'        },
  { value: 'exam_controller', label: 'Exam Controller'  },
  { value: 'superadmin',      label: 'Super Admin'      },
];

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginRole, setLoginRole]       = useState('student');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const [login, { isLoading }] = useLoginMutation();
  const setOasesAuth = useOasesAuthStore((s) => s.setAuth);

  const OASES_REDIRECTS = {
    SCHOOL_ADMIN:  '/admin/oases/admin/exam-setup',
    SCAN_OPERATOR: '/admin/oases/scan-operator/upload',
    EVALUATOR:     '/admin/oases/evaluator/queue',
    HEAD_EXAMINER: '/admin/oases/head-examiner/conflicts',
    SUPER_ADMIN:   '/admin/oases/dashboard',
  };

  const ERP_REDIRECTS = {
    admin:           '/admin/dashboard',
    teacher:         '/teacher/dashboard',
    student:         '/student/dashboard',
    admission:       '/admission/dashboard',
    accounts:        '/accounts/fee/students',
    librarian:       '/librarian/dashboard',
    exam_controller: '/exam-controller/dashboard',
  };

  // ── Handle role dropdown change ──────────────────────────────────────────
  const handleRoleChange = (e) => {
    const selected = e.target.value;
    setLoginRole(selected);
    if (selected === 'superadmin') {
      navigate('/superadmin/login');
    }
  };

  const onSubmit = async (data) => {
    try {
      const result = await login({
        email:      data.email,
        password:   data.password,
        schoolCode: data.schoolCode,
        role:       loginRole,
      }).unwrap();

      if (result?.user) {
        // Clear any stale persisted state from a previous session
        dispatch(userlogout());
        dispatch(authApi.util.resetApiState());

        dispatch(setUser(result));

        // ── OASES integration ──────────────────────────────────────────────
        if (result.user.oasesRole) {
          setOasesAuth(result.user, result.token);
          toast.success(`Welcome to OASES, ${result.user.firstName}!`);
          navigate(OASES_REDIRECTS[result.user.oasesRole] || '/admin/oases/dashboard', { replace: true });
          return;
        }

        // Normal ERP redirect
        toast.success('Login successful! Redirecting…');
        navigate(ERP_REDIRECTS[result.user.role] || '/', { replace: true });
      } else {
        toast.error('Login failed: unexpected server response');
      }
    } catch (error) {
      console.error('Login Error:', error);
      toast.error(error.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  const togglePasswordVisibility = () => setShowPassword((p) => !p);

  return (
    <div className="relative flex justify-center items-center min-h-[100dvh] bg-slate-50 py-6 sm:py-10 px-3 sm:px-4 overflow-x-hidden font-sans">
      {/* Background Animated Black Waves */}
      <BackgroundBeams />

      {/* Main Login Form Card */}
      <div className="bg-white/75 backdrop-blur-[25px] border border-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6 sm:p-9 rounded-2xl w-full max-w-[420px] relative z-10 my-auto">

        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Sign in to access your portal
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">

          {/* ── Login as dropdown ─────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="login-role">
              Login As
            </label>
            <div className="relative">
              <select
                id="login-role"
                value={loginRole}
                onChange={handleRoleChange}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50/80 border border-slate-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm font-medium appearance-none cursor-pointer transition duration-150"
              >
                {LOGIN_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {loginRole === 'superadmin' && (
              <p className="text-indigo-600 text-xs mt-1 font-medium">
                Redirecting to Super Admin portal…
              </p>
            )}
          </div>

          {/* ── School Code Input ───────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="schoolCode">
              School Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="schoolCode"
                placeholder="Ex: DEMO2025"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border ${errors.schoolCode ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-300/80 focus:ring-indigo-500/20'
                  } rounded-xl text-slate-900 text-sm font-medium placeholder:font-normal placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:border-indigo-500 transition duration-150`}
                {...register('schoolCode', {
                  required: 'School code is required',
                })}
              />
            </div>
            {errors.schoolCode && (
              <p className="text-red-500 text-xs font-medium mt-1.5">{errors.schoolCode.message}</p>
            )}
          </div>

          {/* ── Email or Roll No Input ──────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="email">
              Email or Roll No
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="email"
                placeholder="Ex: student1@school.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border ${errors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-300/80 focus:ring-indigo-500/20'
                  } rounded-xl text-slate-900 text-sm font-medium placeholder:font-normal placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:border-indigo-500 transition duration-150`}
                {...register('email', {
                  required: 'Email or Roll No is required'
                })}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs font-medium mt-1.5">{errors.email.message}</p>
            )}
          </div>

          {/* ── Password Input ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="password">
                Password
              </label>
              <NavLink
                to="/forgot-password"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition duration-150"
              >
                Forgot password?
              </NavLink>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
                className={`w-full pl-10 pr-11 py-2.5 bg-slate-50/80 border ${errors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-300/80 focus:ring-indigo-500/20'
                  } rounded-xl text-slate-900 text-sm font-medium placeholder:font-normal placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:border-indigo-500 transition duration-150`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                onClick={togglePasswordVisibility}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password.message}</p>
            )}
          </div>

          {/* ── Remember Me ────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
              />
              Remember this device
            </label>
          </div>

          {/* ── Submit Button ───────────────────────────────────────── */}
          <button
            type="submit"
            className="group w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-xs hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
