import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdLogout } from 'react-icons/md';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { navConfig } from '@app/layouts/navConfig';

const SUB_ITEM_STYLE = { fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 };

const navClass = ({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`;

const SubItem = ({ item, onMobileClose }) => {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} onClick={onMobileClose} className={navClass} style={SUB_ITEM_STYLE}>
      <Icon size={17} />
      <span className="erp-nav-label">{item.label}</span>
    </NavLink>
  );
};

// One component for all seven collapsible groups; open state persists per group.
const NavGroup = ({ group, isCollapsed, onMobileClose }) => {
  const Icon = group.icon;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(group.storageKey) !== 'false'; } catch { return group.defaultOpen; }
  });

  const toggle = () => setOpen((prev) => {
    const next = !prev;
    try { localStorage.setItem(group.storageKey, String(next)); } catch { }
    return next;
  });

  if (isCollapsed) {
    return (
      <button onClick={toggle} title={group.label} className="erp-nav-item"
        style={{ justifyContent: 'center', gap: 0, width: '100%' }}>
        <Icon size={20} />
      </button>
    );
  }

  return (
    <div>
      <button onClick={toggle} className="erp-nav-item"
        style={{ width: '100%', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon size={18} />
          <span className="erp-nav-label">{group.label}</span>
        </span>
        {open
          ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ paddingLeft: 14 }}>
          {group.items.map((item, i) => (
            <SubItem key={i} item={item} onMobileClose={onMobileClose} />
          ))}
        </div>
      )}
    </div>
  );
};

const NavItem = ({ item, isCollapsed, onMobileClose }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onMobileClose}
      title={isCollapsed ? item.label : undefined}
      className={navClass}
      style={{ justifyContent: isCollapsed ? 'center' : undefined, gap: isCollapsed ? 0 : undefined }}
    >
      <Icon size={item.size} />
      {!isCollapsed && <span className="erp-nav-label">{item.label}</span>}
    </NavLink>
  );
};

const Sidebar = ({ role, isCollapsed, isClassTeacher, onMobileClose, onToggleCollapse, onLogout }) => {
  const isOasesEnabled = useSelector((state) => state?.oasesSettings?.isOasesEnabled ?? false);
  const enabledModules = useSelector((state) => state?.moduleSettings?.modules ?? {});

  const entries = (navConfig[role] || []).filter((entry) => {
    if (entry.group) return true;
    if (entry.classTeacherOnly && !isClassTeacher) return false;
    // OASES reads its own slice — the school toggle composed with the Super
    // Admin switch, which moduleSettings.oases alone does not capture.
    if (entry.module === 'oases') return isOasesEnabled;
    if (entry.module) return enabledModules[entry.module] !== false;
    return true;
  });

  return (
    <>
      {/* Header — platform branding, centered column */}
      <div className="erp-sidebar-header" style={{
        padding: isCollapsed ? '14px 8px 10px' : '22px 14px 18px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: 10, right: 8 }}>
          {onMobileClose ? (
            <button onClick={onMobileClose} className="erp-sidebar-toggle">
              <ChevronLeft size={17} />
            </button>
          ) : (
            <button onClick={onToggleCollapse} className="erp-sidebar-toggle"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          )}
        </div>

        <img
          src="/unified_campus.png"
          alt="AV ERP"
          style={{
            width: isCollapsed ? 38 : 80,
            height: isCollapsed ? 38 : 80,
            objectFit: 'contain',
            borderRadius: isCollapsed ? 8 : 12,
            marginBottom: isCollapsed ? 0 : 8,
            flexShrink: 0,
            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            background: '#fff',
            padding: isCollapsed ? 3 : 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          }}
        />

        {!isCollapsed && (
          <span style={{
            margin: 0, fontSize: 10, fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
            color: '#64748b', textAlign: 'center',
            lineHeight: 1.4, display: 'block'
          }}>
            AV ERP
          </span>
        )}
      </div>

      <nav className="erp-nav">
        {!isCollapsed && <div className="erp-nav-section-label">Navigation</div>}

        {entries.map((entry, i) => (
          entry.group
            ? <NavGroup key={entry.group} group={entry} isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
            : <NavItem key={`${entry.to}-${i}`} item={entry} isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        ))}
      </nav>

      <div className="erp-sidebar-footer">
        <button
          onClick={onLogout}
          className="erp-logout-btn"
          title={isCollapsed ? 'Logout' : undefined}
          style={{ justifyContent: isCollapsed ? 'center' : undefined, gap: isCollapsed ? 0 : undefined }}
        >
          <MdLogout size={18} />
          {!isCollapsed && <span className="erp-logout-label">Logout</span>}
        </button>
      </div>
    </>
  );
};

export default Sidebar;
