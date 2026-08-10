import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  MdDashboard,
  MdAssignment,
  MdNotifications,
  MdPerson,
  MdLogout,
  MdClose,
  MdCheckCircle,
  MdUploadFile,
  MdBook,
  MdDescription,
  MdReport,
  MdBarChart,
  MdEmail,
  MdPhone,
  MdBusiness,
  MdPersonPin
} from 'react-icons/md';
import { FaCalendarCheck, FaChalkboardTeacher, FaUserGraduate } from 'react-icons/fa';
import { isModuleEnabled } from '@av-erp/shared';
import { userlogout } from '@shared/lib/store/userSlice';
import { authApi, useLogoutMutation, useCheak_authQuery } from '@modules/identity/api/userApi';

const MobileBottomNav = ({ role }) => {
  const [showMeDrawer, setShowMeDrawer] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const { data: authData } = useCheak_authQuery();
  const rawUser = useSelector(state => state?.user);
  const user = authData?.user || rawUser?.user?.user || rawUser?.user || rawUser || {};
  const enabledModules = useSelector(state => state?.moduleSettings?.modules ?? {});
  const moduleAllows = (entry) => !entry.module || isModuleEnabled(enabledModules, entry.module);

  const handleLogout = async () => {
    setShowMeDrawer(false);
    await dispatch(userlogout());
    await logout();
    localStorage.removeItem('token');
    dispatch(authApi.util.resetApiState());
    navigate('/login');
  };

  if (role !== 'student' && role !== 'teacher') {
    return null;
  }

  const studentTabs = [
    { to: '/student/dashboard', icon: <MdDashboard size={22} />, label: 'Home' },
    { to: '/student/attendance', icon: <FaCalendarCheck size={20} />, label: 'Attendance' },
    { to: '/student/assignments', icon: <MdAssignment size={22} />, label: 'Assignments', module: 'assignments' },
    { to: '/student/notices', icon: <MdNotifications size={22} />, label: 'Notices', module: 'communication' },
  ];

  const teacherTabs = [
    { to: '/teacher/dashboard', icon: <MdDashboard size={22} />, label: 'Home' },
    { to: '/teacher/attendance', icon: <FaCalendarCheck size={20} />, label: 'Attendance' },
    { to: '/teacher/assignments', icon: <MdAssignment size={22} />, label: 'Assignments', module: 'assignments' },
    { to: '/teacher/student-leaves', icon: <MdCheckCircle size={22} />, label: 'Leaves', module: 'communication' },
  ];

  const tabs = (role === 'student' ? studentTabs : teacherTabs).filter(moduleAllows);

  // retired: library, fee_management — re-add when modules.json marks them available
  const studentQuickLinks = [
    { to: '/student/marks', icon: <MdBarChart size={18} />, label: 'Marks & Results' },
    { to: '/student/leave', icon: <MdDescription size={18} />, label: 'Apply Leave', module: 'communication' },
    { to: '/student/materials', icon: <MdBook size={18} />, label: 'Knowledge Center', module: 'communication' },
    { to: '/student/report-card', icon: <MdDescription size={18} />, label: 'Report Card', module: 'report_cards' },
    { to: '/student/complaints', icon: <MdReport size={18} />, label: 'Complaints', module: 'communication' },
  ];

  // retired: oases, payroll — re-add when modules.json marks them available
  const teacherQuickLinks = [
    { to: '/teacher/marks', icon: <MdUploadFile size={18} />, label: 'Upload Marks' },
    { to: '/teacher/tests', icon: <FaChalkboardTeacher size={18} />, label: 'My Tests' },
    { to: '/teacher/materials', icon: <MdBook size={18} />, label: 'Knowledge Center', module: 'communication' },
    { to: '/teacher/leave', icon: <MdDescription size={18} />, label: 'My Leave', module: 'communication' },
    { to: '/teacher/my-students', icon: <FaUserGraduate size={18} />, label: 'My Students' },
    { to: '/teacher/co-scholastic', icon: <MdCheckCircle size={18} />, label: 'Co-Scholastic Marks' },
    { to: '/teacher/report-cards', icon: <MdDescription size={18} />, label: 'Report Cards', module: 'report_cards' },
  ];

  const quickLinks = (role === 'student' ? studentQuickLinks : teacherQuickLinks).filter(moduleAllows);

  return (
    <>
      {/* ── Slide-up 'Me / More' Drawer ── */}
      {showMeDrawer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-fade-in"
          onClick={() => setShowMeDrawer(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                    {user?.firstName} {user?.lastName}
                  </h4>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {role} Account
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMeDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Account Details Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                <MdPersonPin className="text-indigo-600 size-4" />
                Account Overview
              </div>

              <div className="space-y-2">
                {user?.email && (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <MdEmail size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Email Address</p>
                      <p className="font-semibold text-xs text-slate-900 truncate">{user.email}</p>
                    </div>
                  </div>
                )}

                {user?.phone && (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <MdPhone size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Phone Number</p>
                      <p className="font-semibold text-xs text-slate-900">{user.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                    <MdBusiness size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">School / Branch</p>
                    <p className="font-semibold text-xs text-slate-900 truncate">
                      {user?.school?.name || user?.schoolName || 'Demo Public School'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Action */}
            <div className="pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors"
              >
                <MdLogout size={18} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom Bar for Mobile (`< 768px`) ── */}
      <nav
        id="erp-mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around"
      >
        {tabs.map((tab, idx) => (
          <NavLink
            key={idx}
            to={tab.to}
            end={tab.to.endsWith('/dashboard')}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-600 font-bold scale-105'
                  : 'text-slate-500 font-medium hover:text-slate-800'
              }`
            }
          >
            <span className="transition-transform">{tab.icon}</span>
            <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
          </NavLink>
        ))}

        {/* 'Me' Profile Drawer Button */}
        <button
          onClick={() => setShowMeDrawer(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            showMeDrawer
              ? 'text-indigo-600 font-bold scale-105'
              : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <MdPerson size={22} />
          <span className="text-[10px] tracking-tight mt-0.5">Me</span>
        </button>
      </nav>
    </>
  );
};

export default MobileBottomNav;
