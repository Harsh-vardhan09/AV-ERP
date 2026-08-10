import React from 'react';
import { NavLink } from 'react-router-dom';
import LoginForm from './LoginForm';

// Super Admin is listed for discoverability but has its own portal and its own
// JWT secret — picking it redirects to /superadmin/login rather than posting here.
const STAFF_ROLES = [
  { value: 'teacher',    label: 'Teacher'     },
  { value: 'admission',  label: 'Admission'   },
  { value: 'admin',      label: 'Admin'       },
  { value: 'superadmin', label: 'Super Admin' },
];

const StaffLogin = () => (
  <LoginForm
    roles={STAFF_ROLES}
    defaultRole="teacher"
    emailPlaceholder="Ex: teacher@school.com"
    footer={
      <p className="text-xs font-medium text-slate-500">
        Are you a student?{' '}
        <NavLink
          to="/login"
          className="font-semibold text-indigo-600 hover:text-indigo-700 transition duration-150"
        >
          Sign in here
        </NavLink>
      </p>
    }
  />
);

export default StaffLogin;
