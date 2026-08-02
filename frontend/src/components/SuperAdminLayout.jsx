import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useLogoutSuperAdminMutation } from '../redux/api/superAdminApi';
import { superAdminApi, setStoredSuperAdminToken } from '../redux/api/superAdminApi';
import { clearSuperAdmin } from '../redux/slices/superAdminSlice';
import { MdDashboard, MdSchool, MdLogout, MdMenu, MdAdminPanelSettings, MdArticle, MdDescription } from 'react-icons/md';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const COLLAPSE_KEY = 'superadmin.sidebar.collapsed';

const navItems = [
  { to: '/superadmin/dashboard',           icon: <MdDashboard size={18} />,   label: 'Dashboard'            },
  { to: '/superadmin/schools',             icon: <MdSchool size={18} />,       label: 'Schools'              },
  { to: '/superadmin/templates',           icon: <MdArticle size={18} />,      label: 'Report Templates'     },
  { to: '/superadmin/school-templates',    icon: <MdArticle size={18} />,      label: 'Per-School Templates' },
  { to: '/superadmin/admission-templates', icon: <MdDescription size={18} />, label: 'Admission Templates'  },
];

const SuperAdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
  });

  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [logout]  = useLogoutSuperAdminMutation();
  const superAdmin = useSelector((state) => state.superAdmin?.superAdmin);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (_) { /* server clears cookie regardless */ }

    // 1. Clear Redux state + the stored Bearer token (the cookie is cleared
    //    server-side; this kills the localStorage copy used in production)
    setStoredSuperAdminToken(null);
    dispatch(clearSuperAdmin());
    // 2. Reset ALL superAdminApi cached data so SuperAdminProtectedRoute
    //    won't re-authenticate and bounce back to dashboard
    dispatch(superAdminApi.util.resetApiState());
    // 3. Navigate away
    navigate('/superadmin/login', { replace: true });
    toast.success('Logged out successfully');
  };

  const sidebarWidth = collapsed ? 68 : 256;

  const SidebarContent = ({ isCollapsed, onMobileClose }) => (
    <>
      {/* Header — Platform branding only, centered column */}
      <div className="erp-sidebar-header" style={{
        padding: isCollapsed ? '14px 8px 10px' : '22px 14px 18px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
        borderBottom: '1px solid var(--sidebar-border)'
      }}>

        {/* Collapse / close toggle — absolute top-right */}
        <div style={{ position: 'absolute', top: 10, right: 8 }}>
          <button
            className="erp-sidebar-toggle"
            onClick={onMobileClose || toggleCollapse}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {onMobileClose
              ? <ChevronLeft size={15} />
              : isCollapsed
                ? <ChevronRight size={15} />
                : <ChevronLeft size={15} />
            }
          </button>
        </div>

        {/* UC Logo — big and centered */}
        <div style={{
          width: isCollapsed ? 38 : 58,
          height: isCollapsed ? 38 : 58,
          borderRadius: isCollapsed ? 10 : 16,
          background: 'linear-gradient(145deg, #2563eb 0%, #1e3a8a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          marginBottom: isCollapsed ? 0 : 12,
          flexShrink: 0,
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <span style={{
            color: '#fff', fontWeight: 900,
            fontSize: isCollapsed ? 14 : 24,
            letterSpacing: '-1px', lineHeight: 1
          }}>UC</span>
        </div>

        {/* UNIFIED CAMPUS text — only when expanded */}
        {!isCollapsed && (
          <h1 style={{
            margin: 0, fontSize: 11, fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)', textAlign: 'center',
            lineHeight: 1.4
          }}>
            UNIFIED CAMPUS
          </h1>
        )}

        {/* Super Admin user info — below branding */}
        {superAdmin && !isCollapsed && (
          <div className="erp-sidebar-user" style={{ marginTop: 14, justifyContent: 'flex-start', width: '100%' }}>
            <div className="erp-avatar" title={`${superAdmin.firstName} ${superAdmin.lastName}`}>
              {superAdmin.firstName?.[0]?.toUpperCase() || 'S'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="erp-user-name">{superAdmin.firstName} {superAdmin.lastName}</div>
              <div className="erp-user-email">{superAdmin.email}</div>
              <span className="erp-role-badge">Platform Admin</span>
            </div>
          </div>
        )}
        {superAdmin && isCollapsed && (
          <div style={{ marginTop: 8 }}>
            <div className="erp-avatar" title={`${superAdmin.firstName} ${superAdmin.lastName}`}>
              {superAdmin.firstName?.[0]?.toUpperCase() || 'S'}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="erp-nav">
        {!isCollapsed && <div className="erp-nav-section-label">Navigation</div>}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
            style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', gap: isCollapsed ? 0 : 10 }}
          >
            {item.icon}
            <span className="erp-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="erp-sidebar-footer">
        <button
          className="erp-logout-btn"
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : undefined}
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', gap: isCollapsed ? 0 : 10 }}
        >
          <MdLogout size={18} />
          <span className="erp-logout-label">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} className="erp-main-bg">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="erp-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        id="erp-mobile-sidebar"
        className="erp-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <SidebarContent isCollapsed={false} onMobileClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        id="erp-desktop-sidebar"
        className={`erp-sidebar${collapsed ? ' erp-sidebar--collapsed' : ''}`}
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 30,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <SidebarContent isCollapsed={collapsed} onMobileClose={null} />
      </aside>

      {/* Spacer */}
      <div
        id="erp-sidebar-spacer"
        style={{ width: sidebarWidth, flexShrink: 0, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header className="erp-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="erp-topbar-mobile-btn" onClick={() => setMobileOpen(true)}>
              <MdMenu size={22} />
            </button>
            <div className="erp-topbar-brand">
              <MdAdminPanelSettings size={20} />
              <span>Super Admin Panel</span>
            </div>
          </div>
          <div className="erp-topbar-right">
            {superAdmin && (
              <span className="erp-topbar-role-pill">
                {superAdmin.firstName} {superAdmin.lastName}
              </span>
            )}
          </div>
        </header>

        <main className="erp-main-content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
