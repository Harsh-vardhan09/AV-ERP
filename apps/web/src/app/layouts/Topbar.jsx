import React, { useEffect, useRef, useState } from 'react';
import {
  MdMenu, MdSchool, MdClose, MdLogout, MdPerson, MdEmail, MdPhone, MdBusiness,
} from 'react-icons/md';
import { ChevronDown } from 'lucide-react';
import NotificationBell from '@shared/ui/NotificationBell';
import { roleLabels } from '@app/layouts/navConfig';

const DetailRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ padding: 6, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', display: 'flex', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: 10, color: '#94a3b8', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px'
      }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, ...(label === 'Email' ? { wordBreak: 'break-all' } : null) }}>
        {value}
      </div>
    </div>
  </div>
);

const Topbar = ({ role, user, school, onMobileOpen, onLogout }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="erp-topbar">
      {role !== 'student' && role !== 'teacher' && (
        <button className="erp-topbar-mobile-btn" onClick={onMobileOpen}>
          <MdMenu size={22} />
        </button>
      )}

      <div className="erp-topbar-brand" style={{ gap: 10 }}>
        {school?.logoUrl ? (
          <img src={school.logoUrl} alt={school.name}
            style={{
              width: 30, height: 30, borderRadius: 6, objectFit: 'cover', flexShrink: 0,
              border: '1.5px solid var(--card-border)'
            }} />
        ) : (
          <div style={{
            width: 30, height: 30, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff'
          }}>
            {school?.name?.[0]?.toUpperCase() || <MdSchool size={16} />}
          </div>
        )}
        <span style={{ fontWeight: 600, fontSize: 15 }}>
          {school?.name || 'Loading...'}
        </span>
      </div>

      <div className="erp-topbar-right">
        <NotificationBell />

        {/* Hidden on phones — account info lives in the bottom 'Me' drawer there */}
        <div ref={profileRef} className="hidden md:block" style={{ position: 'relative' }}>
          <button
            id="topbar-profile-btn"
            onClick={() => setProfileOpen(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              background: profileOpen ? 'var(--color-primary-light)' : 'var(--card-bg)',
              border: '1.5px solid var(--card-border)', borderRadius: 8,
              padding: '5px 10px 5px 6px', transition: 'all 0.18s ease',
              color: 'var(--text-primary)'
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff'
            }}>
              {user?.firstName?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600, maxWidth: 110, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)'
            }}>
              {user?.firstName} {user?.lastName}
            </span>
            <ChevronDown size={13} style={{
              flexShrink: 0, color: 'var(--text-secondary)',
              transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'
            }} />
          </button>

          {profileOpen && (
            <div id="topbar-profile-panel" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 'min(290px, calc(100vw - 24px))', background: '#ffffff',
              border: '1px solid #cbd5e1', borderRadius: 16,
              boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.12)', zIndex: 100,
              overflow: 'hidden', animation: 'fadeSlideDown 0.18s ease'
            }}>
              <div style={{
                padding: '16px', background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: '#4f46e5',
                  border: '2px solid #e0e7ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#ffffff'
                }}>
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 15, color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginTop: 1 }}>
                    {roleLabels[role]}
                  </div>
                </div>
                <button onClick={() => setProfileOpen(false)}
                  style={{
                    marginLeft: 'auto', background: '#e2e8f0',
                    border: 'none', borderRadius: 8, color: '#64748b',
                    width: 26, height: 26, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                  }}>
                  <MdClose size={15} />
                </button>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {user?.email && <DetailRow icon={<MdEmail size={16} />} label="Email" value={user.email} />}
                {user?.phone && <DetailRow icon={<MdPhone size={16} />} label="Phone" value={user.phone} />}
                {school?.name && <DetailRow icon={<MdBusiness size={16} />} label="School" value={school.name} />}
                {user?.role && <DetailRow icon={<MdPerson size={16} />} label="Role" value={roleLabels[role]} />}
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', background: '#fafafa' }}>
                <button onClick={onLogout} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 10, border: '1px solid #fecdd3',
                  background: '#fff1f2', color: '#e11d48',
                  cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s'
                }}>
                  <MdLogout size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
