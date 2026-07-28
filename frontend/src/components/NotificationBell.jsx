import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MdNotifications, MdNotificationsNone, MdDoneAll, MdSettings } from 'react-icons/md';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllReadMutation,
} from '../redux/api/notificationApi';
import {
  setUnreadCount,
  decrementUnreadCount,
  resetUnreadCount,
} from '../redux/slices/notificationSlice';

// ── Type colour map ────────────────────────────────────────────
const TYPE_CONFIG = {
  attendance:   { color: '#3B82F6', label: 'Attendance' },
  marks:        { color: '#10B981', label: 'Marks' },
  fee:          { color: '#F59E0B', label: 'Fee' },
  leave:        { color: '#8B5CF6', label: 'Leave' },
  assignment:   { color: '#EC4899', label: 'Assignment' },
  notice:       { color: '#06B6D4', label: 'Notice' },
  complaint:    { color: '#EF4444', label: 'Complaint' },
  system:       { color: '#6B7280', label: 'System' },
  announcement: { color: '#4F46E5', label: 'Announcement' },
};

// ── Time-ago helper ────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Real-time count from Redux slice (updated by socket in App.jsx)
  const socketCount = useSelector((s) => s.notifications?.unreadCount ?? 0);

  // RTK Query — poll every 60 s as socket fallback
  const { data: countData } = useGetUnreadCountQuery();

  // Sync RTK count into slice on first load / refetch
  useEffect(() => {
    if (countData?.data?.count !== undefined) {
      dispatch(setUnreadCount(countData.data.count));
    }
  }, [countData, dispatch]);

  const unreadCount = socketCount;

  // Fetch last 10 notifications only when dropdown is open
  const { data: notifData, isLoading } = useGetNotificationsQuery(
    { limit: 10 },
    { skip: !open }
  );

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const notifications = notifData?.data?.notifications || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
      dispatch(decrementUnreadCount());
    }
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAll = async () => {
    await markAllRead();
    dispatch(resetUnreadCount());
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>

      {/* ── Bell button ─────────────────────────────────── */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((p) => !p)}
        title="Notifications"
        style={{
          position: 'relative',
          background: open ? 'rgba(79,70,229,0.08)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '7px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: unreadCount > 0 ? '#4F46E5' : 'var(--color-text-secondary, #6B7280)',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {unreadCount > 0
          ? <MdNotifications size={22} />
          : <MdNotificationsNone size={22} />
        }

        {/* Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2, right: 2,
            minWidth: 16, height: 16,
            background: '#EF4444',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
            boxShadow: '0 0 0 2px var(--color-background-primary, #fff)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ─────────────────────────────────────── */}
      {open && (
        <div
          id="notification-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 340,
            background: 'var(--color-background-primary, #fff)',
            border: '1px solid var(--color-border-tertiary, #E5E7EB)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.13)',
            zIndex: 1200,
            overflow: 'hidden',
            animation: 'notif-drop 0.18s ease',
          }}
        >
          <style>{`
            @keyframes notif-drop {
              from { opacity:0; transform:translateY(-6px); }
              to   { opacity:1; transform:translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid var(--color-border-tertiary, #E5E7EB)',
          }}>
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: 'var(--color-text-primary, #111827)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  background: '#EEF2FF', color: '#4F46E5',
                  fontSize: 11, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 10,
                }}>
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                title="Mark all as read"
                style={{
                  fontSize: 12, color: '#4F46E5',
                  background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: 4, fontWeight: 500,
                  padding: '3px 6px', borderRadius: 6,
                  transition: 'background 0.15s',
                }}
              >
                <MdDoneAll size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 368, overflowY: 'auto' }}>
            {isLoading && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-secondary, #6B7280)', fontSize: 13 }}>
                Loading…
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <MdNotificationsNone size={36} style={{ color: '#D1D5DB', marginBottom: 10 }} />
                <div style={{ color: 'var(--color-text-secondary, #6B7280)', fontSize: 13 }}>
                  No notifications yet
                </div>
              </div>
            )}

            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => handleNotifClick(notif)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--color-border-tertiary, #E5E7EB)',
                  cursor: notif.link ? 'pointer' : 'default',
                  background: notif.isRead
                    ? 'transparent'
                    : 'rgba(79,70,229,0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(79,70,229,0.07)'; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notif.isRead
                    ? 'transparent'
                    : 'rgba(79,70,229,0.04)';
                }}
              >
                {/* Type dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: TYPE_CONFIG[notif.type]?.color || '#6B7280',
                  flexShrink: 0, marginTop: 5,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: notif.isRead ? 400 : 600,
                    color: 'var(--color-text-primary, #111827)',
                    lineHeight: 1.4, marginBottom: 3,
                  }}>
                    {notif.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary, #6B7280)',
                    lineHeight: 1.5, marginBottom: 5,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {notif.message}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary, #9CA3AF)',
                    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      background: 'var(--color-background-secondary, #F3F4F6)',
                      padding: '1px 7px', borderRadius: 4,
                      fontSize: 10, fontWeight: 600,
                      color: TYPE_CONFIG[notif.type]?.color || '#6B7280',
                    }}>
                      {TYPE_CONFIG[notif.type]?.label || notif.type}
                    </span>
                    {timeAgo(notif.createdAt)}
                    {notif.triggeredByName && (
                      <span>· {notif.triggeredByName}</span>
                    )}
                  </div>
                </div>

                {/* Unread indicator dot */}
                {!notif.isRead && (
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#4F46E5', flexShrink: 0, marginTop: 5,
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Footer — Phase 3: added Preferences shortcut */}
          <div style={{
            padding: '10px 14px',
            borderTop: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button
              id="view-all-notifications-btn"
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              style={{
                fontSize: 12, fontWeight: 500,
                color: '#4F46E5', background: 'none',
                border: 'none', cursor: 'pointer',
                padding: '3px 6px', borderRadius: 6,
                transition: 'background 0.15s',
              }}
            >
              View all →
            </button>

            <button
              id="notif-preferences-btn"
              onClick={() => { setOpen(false); navigate('/notification-preferences'); }}
              style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary, #9CA3AF)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '3px 6px', borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <MdSettings size={12} /> Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
