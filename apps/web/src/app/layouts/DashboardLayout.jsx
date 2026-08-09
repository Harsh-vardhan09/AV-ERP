import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { authApi, useLogoutMutation, useGetMySchoolQuery, useCheak_authQuery } from '@modules/identity/api/userApi';
import { userlogout } from '@shared/lib/store/userSlice';
import { useGetMyClassTeacherQuery } from '@modules/people/api/teacherApi';
import LibraryDueAlert from '@modules/library/components/LibraryDueAlert';
import MobileBottomNav from '@shared/ui/MobileBottomNav';
import Sidebar from '@app/layouts/Sidebar';
import Topbar from '@app/layouts/Topbar';

const COLLAPSE_KEY = 'erp.sidebar.collapsed';
const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED = 68;

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  // Always take the role from the API check-auth result — redux-persist
  // rehydration mismatches otherwise show the wrong sidebar.
  const { data: authData } = useCheak_authQuery();
  const rawUser = useSelector(state => state?.user);

  const role = authData?.user?.role ||
    rawUser?.user?.user?.role ||
    rawUser?.user?.role ||
    rawUser?.role ||
    'student';

  const user = authData?.user ||
    rawUser?.user?.user ||
    rawUser?.user ||
    rawUser ||
    {};

  const { data: schoolData } = useGetMySchoolQuery(undefined, { skip: !user?._id });
  const school = schoolData?.school || null;

  const { data: ctData } = useGetMyClassTeacherQuery(undefined, { skip: role !== 'teacher' });
  const isClassTeacher = (ctData?.data?.length ?? 0) > 0;

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { }
      return next;
    });
  };

  const handleLogout = async () => {
    await dispatch(userlogout());
    await logout();
    localStorage.removeItem('token');
    dispatch(authApi.util.resetApiState());
    navigate('/login');
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;
  const sidebarProps = { role, isClassTeacher, onToggleCollapse: toggleCollapse, onLogout: handleLogout };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="erp-overlay" />
      )}

      {/* Mobile sidebar — always expanded, whatever the desktop preference is */}
      <aside
        id="erp-mobile-sidebar"
        className="erp-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 50, width: SIDEBAR_WIDTH,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Sidebar {...sidebarProps} isCollapsed={false} onMobileClose={() => setMobileOpen(false)} />
      </aside>

      <aside
        id="erp-desktop-sidebar"
        className="erp-sidebar"
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 30, width: sidebarWidth, flexShrink: 0 }}
      >
        <Sidebar {...sidebarProps} isCollapsed={collapsed} onMobileClose={null} />
      </aside>

      {/* Desktop content spacer — hidden on mobile via CSS */}
      <div
        id="erp-sidebar-spacer"
        style={{ width: sidebarWidth, flexShrink: 0, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          role={role}
          user={user}
          school={school}
          onMobileOpen={() => setMobileOpen(true)}
          onLogout={handleLogout}
        />

        <main className="erp-main-content p-3.5 sm:p-7" style={{ flex: 1, overflowY: 'auto', background: 'var(--page-bg)' }}>
          <Outlet />
          {(role === 'student' || role === 'teacher') && (
            <div className="h-28 w-full shrink-0 md:hidden pointer-events-none" aria-hidden="true" />
          )}
        </main>
      </div>

      <MobileBottomNav role={role} />

      {/* Renders only for students with overdue or due-soon books */}
      <LibraryDueAlert />
    </div>
  );
};

export default DashboardLayout;
