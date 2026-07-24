// import React from 'react';
// import { useForm } from 'react-hook-form';
// import { NavLink, useNavigate } from 'react-router-dom';
// import { useLoginMutation } from '../redux/api/userApi';
// import { useDispatch } from 'react-redux';
// import { setUser } from '../redux/reducers/userreducer';
// import toast from 'react-hot-toast';
// import Loader from '../components/Loader';


// const NewLogin = () => {
//   const dispatch =useDispatch();

//   const { register, handleSubmit, formState: { errors } } = useForm();
//   const navigate = useNavigate();
//   const [login, { isLoading, error }] = useLoginMutation();
//   const onSubmit = async (data) => {
//     const formData = new FormData();
//     formData.append('email', data.email);
//     formData.append('password', data.password);
//     // formData.append('photo', data.photo[0]); 

//     try {
//       const result = await login(formData).unwrap();
//       console.log("API Response:", result); // Response को console में check करें

//       if (result?.token) {
//         localStorage.setItem("token", result.token);
//         console.log("Token Stored:", localStorage.getItem("token")); // Check करें token store हुआ या नहीं
//         toast.success("Login successful");

//         dispatch(setUser(result)); // Redux store में user को set करें
//         navigate('/', { replace: true });
//       } else {
//         toast.error("Login failed: Token not received");
//       }
//     } catch (error) {
//       console.error("Login Error:", error);
//       toast.error(`Error during login: ${error.data?.message || "Something went wrong"}`);
//     }


//   };


//   return (
//     <div className="flex justify-center items-center h-screen">
//       <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
//         <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Log In</h2>

//         <form  onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//           {/* Email Input */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-2" htmlFor="email">Email Address</label>
//             <input
//               type="email"
//               name="email"
//               id="email"
//               placeholder="Your Email Address"
//               className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
//               {...register('email', {
//                 required: 'Email is required',
//                 pattern: {
//                   value: /\S+@\S+\.\S+/,
//                   message: 'Invalid email address',
//                 },
//               })}
//             />
//             {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
//           </div>

//           {/* Password Input */}
//           <div>
//             <label className="block text-gray-700 font-medium mb-2" htmlFor="password">Password</label>
//             <input
//               type="password"
//               name="password"
//               id="password"
//               placeholder="Your Password"
//               className={`w-full px-4 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
//               {...register('password', {
//                 required: 'Password is required',
//                 minLength: {
//                   value: 6,
//                   message: 'Password must be at least 6 characters',
//                 },
//               })}
//             />
//             {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
//           </div>
//           {/* <div>
//             <input type="file" name="photo" {...register('photo')} />
//           </div> */}
//           {/* Submit Button */}
//           <button
//             type="submit"
//             className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
//             disabled={isLoading} // Disable button when loading
//           >
//             {isLoading ? <Loader></Loader> : 'Log In'}
//           </button>

//           {/* Display error message */}
//           {error && <p className="text-red-500 text-sm mt-2">Login failed. Please try again.</p>}
//         </form>

//         <div className="text-center mt-4">
//           <NavLink to="/forgot-password" className="text-indigo-500 hover:text-indigo-700 transition duration-300">Forgot Password?</NavLink>
//         </div>

//         <div className="text-center mt-6 text-gray-500">
//           Don't have an account? <NavLink to="/signup" className="text-indigo-500">Sign up</NavLink>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default NewLogin;
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../redux/api/userApi';
import { authApi } from '../redux/api/userApi';
import { useDispatch } from 'react-redux';
import { setUser, userlogout } from '../redux/reducers/userreducer';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import useOasesAuthStore from './oases/store/authStore';

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
        role:       loginRole,   // Bug 1 Fix: send the selected role so backend can validate it
      }).unwrap();

      if (result?.user) {
        // Fix E: Clear any stale persisted state from a previous session before
        // setting new user data — prevents old schoolId bleeding in.
        dispatch(userlogout());
        dispatch(authApi.util.resetApiState());

        dispatch(setUser(result));

        // ── OASES: if user has an OASES role, wire the OASES store + redirect ──
        if (result.user.oasesRole) {
          setOasesAuth(result.user, result.token);
          toast.success(`Welcome to OASES, ${result.user.firstName}!`);
          navigate(OASES_REDIRECTS[result.user.oasesRole] || '/admin/oases/dashboard', { replace: true });
          return;
        }

        // Normal ERP redirect
        toast.success('Login successful');
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
    <div className="flex justify-center items-center min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Welcome Back</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Login as dropdown ─────────────────────────────────────── */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="login-role">
              Login as
            </label>
            <div className="relative">
              <select
                id="login-role"
                value={loginRole}
                onChange={handleRoleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-800 appearance-none cursor-pointer"
              >
                {LOGIN_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {/* Custom chevron */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {loginRole === 'superadmin' && (
              <p className="text-indigo-600 text-xs mt-1 font-medium">
                Redirecting to Super Admin portal…
              </p>
            )}
          </div>

          {/* ── The following fields are only for school roles ─────── */}
          {/* School Code Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="schoolCode">
              School Code
            </label>
            <input
              type="text"
              id="schoolCode"
              placeholder="Enter your school code (e.g. DPS2025)"
              className={`w-full px-4 py-2 border ${
                errors.schoolCode ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('schoolCode', {
                required: 'School code is required',
              })}
            />
            {errors.schoolCode && (
              <p className="text-red-500 text-sm mt-1">{errors.schoolCode.message}</p>
            )}
          </div>

          {/* Email or Roll No Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
              Email or Roll No
            </label>
            <input
              type="text"
              id="email"
              placeholder="Email or Roll No"
              className={`w-full px-4 py-2 border ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
              {...register('email', {
                required: 'Email or Roll No is required'
              })}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                className={`w-full px-4 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
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
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? (
                  <span className="material-icons text-sm">visibility_off</span>
                ) : (
                  <span className="material-icons text-sm">visibility</span>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <NavLink
              to="/forgot-password"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </NavLink>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300 flex justify-center items-center"
            disabled={isLoading}
          >
            {isLoading ? <Loader /> : 'Sign In'}
          </button>
        </form>


      </div>
    </div>
  );
};

export default Login;

