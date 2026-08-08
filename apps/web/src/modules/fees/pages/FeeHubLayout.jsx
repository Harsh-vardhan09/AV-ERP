import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiDollarSign, FiLayers, FiList, FiUsers, FiCreditCard,
  FiCalendar, FiAlertTriangle, FiBarChart2, FiBook,
} from 'react-icons/fi';
import { MdDashboard } from 'react-icons/md';

const ADMIN_TABS = [
  { path: 'dashboard',  label: 'Dashboard',      icon: MdDashboard },
  { path: 'sessions',   label: 'Sessions',        icon: FiCalendar },
  { path: 'heads',      label: 'Fee Heads',       icon: FiList },
  { path: 'structures', label: 'Fee Structures',  icon: FiLayers },
  { path: 'defaulters', label: 'Defaulters',      icon: FiAlertTriangle },
  { path: 'reports',    label: 'Reports',         icon: FiBarChart2 },
  { path: 'ledger',     label: 'Student Ledger',  icon: FiBook },
  { path: 'refunds',    label: 'Refunds',         icon: FiDollarSign },
];

const ACCOUNTS_TABS = [
  { path: 'students', label: 'Student Fees',    icon: FiUsers },
  { path: 'collect',  label: 'Collect Payment', icon: FiCreditCard },
];

const FeeHubLayout = () => {
  const role = useSelector(s => s.user?.user?.user?.role || s.user?.user?.role);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive basePath from URL: /admin/fee or /accounts/fee
  const feeIndex = location.pathname.indexOf('/fee');
  const basePath = feeIndex !== -1 ? location.pathname.substring(0, feeIndex + 4) : '/admin/fee';

  const tabs = role === 'admin' ? ADMIN_TABS : ACCOUNTS_TABS;
  const isActive = (tabPath) => location.pathname.startsWith(`${basePath}/${tabPath}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FiDollarSign size={16} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Fee Management</h1>
            <p className="text-xs text-gray-500">
              {role === 'admin'
                ? 'Full access — configure and collect fees'
                : 'View student fee status and collect payments'}
            </p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-0.5">
          {tabs.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(`${basePath}/${path}`)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </div>
    </div>
  );
};

export default FeeHubLayout;
