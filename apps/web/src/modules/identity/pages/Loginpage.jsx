import React from 'react';
import { NavLink } from 'react-router-dom';
import LoginForm from './LoginForm';

// Students are the overwhelming majority of sign-ins, so /login is theirs alone.
// Staff pick their role on /staff-login instead.
const LOGIN_ROLES = [{ value: 'student', label: 'Student' }];

const Login = () => (
  <LoginForm
    roles={LOGIN_ROLES}
    defaultRole="student"
    emailPlaceholder="Roll No or email — e.g. 101 or student1@school.com"
    footer={
      <p className="text-xs font-medium text-slate-500">
        Teacher, admin or staff member?{' '}
        <NavLink
          to="/staff-login"
          className="font-semibold text-indigo-600 hover:text-indigo-700 transition duration-150"
        >
          Sign in here
        </NavLink>
      </p>
    }
  />
);

export default Login;
