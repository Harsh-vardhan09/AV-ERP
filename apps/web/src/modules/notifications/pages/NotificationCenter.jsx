import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { showPermissionError } from '@shared/utils/permissionAlert';
import {
  MdNotificationsNone, MdFilterList, MdDoneAll,
  MdDeleteSweep, MdDelete, MdCheckCircle,
  MdCalendarMonth, MdBarChart, MdAttachMoney, MdEventNote,
  MdAssignment, MdAnnouncement, MdReport, MdSecurity,
  MdCampaign, MdNotifications, MdTune,
} from 'react-icons/md';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
} from '../api/notificationApi';
import { resetUnreadCount, decrementUnreadCount } from '../store/notificationSlice';

// ── Config ─────────────────────────────────────────────────────────────────────
// One map, not two. The icon used to live in a separate TYPE_ICONS lookup that
// was never actually declared, so rendering any notification row threw
// "TYPE_ICONS is not defined" and the whole page fell through to ErrorPage.
// Keeping the icon beside the colour it is drawn in means they cannot drift.
const TYPE_CONFIG = {
  attendance:   { color: '#3B82F6', bg: '#EFF6FF', label: 'Attendance',   icon: MdCalendarMonth },
  marks:        { color: '#10B981', bg: '#ECFDF5', label: 'Marks',        icon: MdBarChart      },
  fee:          { color: '#F59E0B', bg: '#FFFBEB', label: 'Fee',          icon: MdAttachMoney   },
  leave:        { color: '#8B5CF6', bg: '#F5F3FF', label: 'Leave',        icon: MdEventNote     },
  assignment:   { color: '#EC4899', bg: '#FDF2F8', label: 'Assignment',   icon: MdAssignment    },
  notice:       { color: '#06B6D4', bg: '#ECFEFF', label: 'Notice',       icon: MdAnnouncement  },
  complaint:    { color: '#EF4444', bg: '#FEF2F2', label: 'Complaint',    icon: MdReport        },
  system:       { color: '#6B7280', bg: '#F9FAFB', label: 'System',       icon: MdSecurity      },
  announcement: { color: '#4F46E5', bg: '#EEF2FF', label: 'Announcement', icon: MdCampaign      },
};




const TYPE_OPTIONS = [
  { value: 'all',          label: 'All Types'    },
  { value: 'attendance',   label: 'Attendance'   },
  { value: 'marks',        label: 'Marks'        },
  { value: 'fee',          label: 'Fee'          },
  { value: 'leave',        label: 'Leave'        },
  { value: 'assignment',   label: 'Assignment'   },
  { value: 'notice',       label: 'Notice'       },
  { value: 'complaint',    label: 'Complaint'    },
  { value: 'system',       label: 'System'       },
  { value: 'announcement', label: 'Announcement' },
];

const READ_OPTIONS = [
  { value: 'all',    label: 'All'    },
  { value: 'unread', label: 'Unread' },
  { value: 'read',   label: 'Read'   },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ── Phase 3: Date grouping ─────────────────────────────────────────────────────
const groupByDate = (notifications) => {
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (d.toDateString() === today.toDateString()) {
      groups.Today.push(n);
    } else if (d.toDateString() === yesterday.toDateString()) {
      groups.Yesterday.push(n);
    } else if ((today - d) / 86400000 <= 7) {
      groups['This Week'].push(n);
    } else {
      groups.Earlier.push(n);
    }
  }

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, arr]) => arr.length > 0)
  );
};

// ── Phase 3: Empty state messages per filter ───────────────────────────────────
const getEmptyMessage = (typeFilter) => {
  const map = {
    all:          { title: "You're all caught up!",       sub: 'No notifications yet.'                                   },
    attendance:   { title: 'No attendance alerts',        sub: 'Attendance updates will appear here.'                    },
    marks:        { title: 'No marks updates',            sub: 'Mark uploads and report cards will appear here.'         },
    fee:          { title: 'No fee notifications',        sub: 'Payment receipts and reminders will appear here.'        },
    leave:        { title: 'No leave updates',            sub: 'Leave application status will appear here.'              },
    assignment:   { title: 'No assignment notifications', sub: 'New assignments will appear here.'                       },
    notice:       { title: 'No notices',                  sub: 'School notices will appear here.'                        },
    complaint:    { title: 'No complaint updates',        sub: 'Complaint status will appear here.'                      },
    system:       { title: 'No system notifications',     sub: 'Account and security alerts will appear here.'           },
    announcement: { title: 'No announcements',            sub: 'School-wide announcements will appear here.'             },
  };
  return map[typeFilter] || { title: 'Nothing here', sub: 'No notifications found.' };
};

// ── Phase 3: Loading skeleton ──────────────────────────────────────────────────
const NotificationSkeleton = () => (
  <div style={{ padding: '10px 16px' }}>
    <style>{`
      @keyframes notifPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
    `}</style>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          display: 'flex', gap: 12, marginBottom: 16,
          animation: 'notifPulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.08}s`,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'var(--color-border-tertiary, #E5E7EB)',
          marginTop: 2,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, width: '58%', borderRadius: 4, background: 'var(--color-border-tertiary, #E5E7EB)', marginBottom: 8 }} />
          <div style={{ height: 11, width: '90%', borderRadius: 4, background: 'var(--color-border-tertiary, #E5E7EB)', marginBottom: 6 }} />
          <div style={{ height: 10, width: '32%', borderRadius: 4, background: 'var(--color-border-tertiary, #E5E7EB)' }} />
        </div>
      </div>
    ))}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const NotificationCenter = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [readFilter,    setReadFilter]    = useState('all');
  const [page,          setPage]          = useState(1);
  const [confirmClear,  setConfirmClear]  = useState(false);
  const LIMIT = 20;

  const queryParams = {
    page,
    limit: LIMIT,
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    ...(readFilter === 'unread' ? { isRead: false } : {}),
    ...(readFilter === 'read'   ? { isRead: true  } : {}),
  };

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetNotificationsQuery(queryParams);
  const [markAsRead]  = useMarkAsReadMutation();
  const [markAllRead] = useMarkAllReadMutation();
  const [deleteNotif] = useDeleteNotificationMutation();
  const [clearAll]    = useClearAllNotificationsMutation();

  const notifications = data?.data?.notifications || [];
  const pagination    = data?.data?.pagination    || {};
  const totalPages    = pagination.totalPages || 1;

  const handleClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
      dispatch(decrementUnreadCount());
    }
    if (notif.link) navigate(notif.link);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotif(id);
  };

  const handleMarkAll = async () => {
    await markAllRead();
    dispatch(resetUnreadCount());
  };

  const handleClearAll = async () => {
    await clearAll();
    dispatch(resetUnreadCount());
    setConfirmClear(false);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  // A failed list call used to fall through to "You're all caught up!", which
  // reads as "you have no notifications" rather than "we could not load them".
  // 403 is called out separately — that is a permission/module problem, not an
  // outage, and the user can do nothing about it except tell an admin.
  const status = error?.status;
  const errorMessage = !isError
    ? ''
    : status === 403
      ? error?.data?.message ||
        'You do not have permission to view notifications. Ask your school admin to enable access.'
      : status === 401
        ? 'Your session has expired. Please sign in again.'
        : error?.data?.message || 'Could not load notifications. Please try again.';

  useEffect(() => {
    if (isError && status === 403) showPermissionError(errorMessage);
  }, [isError, status, errorMessage]);

  // Group for display
  const grouped = groupByDate(notifications);
  const emptyMsg = getEmptyMessage(typeFilter);
  const showingFetching = (isLoading || isFetching) && notifications.length === 0;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: {
      padding: '28px 28px 48px',
      maxWidth: 860, margin: '0 auto',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: {
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', flexWrap: 'wrap',
      gap: 12, marginBottom: 24,
    },
    title: {
      fontSize: 22, fontWeight: 700,
      color: 'var(--color-text-primary, #111827)', margin: 0,
    },
    subTitle: {
      fontSize: 13, color: 'var(--color-text-secondary, #6B7280)', marginTop: 4,
    },
    actionRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    iconBtn: (danger) => ({
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 8, border: 'none',
      cursor: 'pointer', fontSize: 13, fontWeight: 500,
      transition: 'background 0.15s',
      background: danger ? '#FEF2F2' : '#EEF2FF',
      color:      danger ? '#DC2626' : '#4F46E5',
    }),
    filterBar: {
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      marginBottom: 16, padding: '12px 16px',
      background: 'var(--color-background-primary, #fff)',
      borderRadius: 10, border: '1px solid var(--color-border-tertiary, #E5E7EB)',
    },
    select: {
      padding: '7px 10px', borderRadius: 7,
      border: '1px solid var(--color-border-tertiary, #E5E7EB)',
      fontSize: 13, color: 'var(--color-text-primary, #111827)',
      background: 'var(--color-background-primary, #fff)',
      cursor: 'pointer', outline: 'none',
    },
    card: {
      background: 'var(--color-background-primary, #fff)',
      borderRadius: 12,
      border: '1px solid var(--color-border-tertiary, #E5E7EB)',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    },
    groupLabel: {
      fontSize: 11, fontWeight: 600,
      color: 'var(--color-text-tertiary, #9CA3AF)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      padding: '12px 20px 6px',
      background: 'var(--color-background-secondary, #F9FAFB)',
      borderBottom: '1px solid var(--color-border-tertiary, #F3F4F6)',
    },
    notifRow: (isRead) => ({
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 20px',
      borderBottom: '1px solid var(--color-border-tertiary, #F3F4F6)',
      background: isRead ? 'transparent' : 'rgba(79,70,229,0.03)',
      cursor: 'pointer', transition: 'background 0.15s', position: 'relative',
    }),
    typeIcon: (type) => ({
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: TYPE_CONFIG[type]?.bg || '#F3F4F6', fontSize: 18,
    }),
    unreadDot: {
      position: 'absolute', top: 18, right: 56,
      width: 8, height: 8, borderRadius: '50%', background: '#4F46E5',
    },
    deleteBtn: {
      position: 'absolute', top: 12, right: 14,
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#D1D5DB', padding: 4, borderRadius: 6,
      display: 'flex', alignItems: 'center', transition: 'color 0.15s',
    },
    pagination: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, marginTop: 22,
    },
    pageBtn: (active) => ({
      padding: '6px 12px', borderRadius: 7,
      border: '1px solid ' + (active ? '#4F46E5' : 'var(--color-border-tertiary, #E5E7EB)'),
      background: active ? '#4F46E5' : 'transparent',
      color: active ? '#fff' : 'var(--color-text-primary, #111827)',
      cursor: active ? 'default' : 'pointer', fontSize: 13, fontWeight: 500,
    }),
    navBtn: (disabled) => ({
      padding: '6px 14px', borderRadius: 7,
      border: '1px solid var(--color-border-tertiary, #E5E7EB)',
      background: 'transparent',
      color: disabled ? '#D1D5DB' : 'var(--color-text-primary, #111827)',
      cursor: disabled ? 'default' : 'pointer', fontSize: 13, fontWeight: 500,
    }),
  };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div style={s.page}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Notification Center</h1>
          <p style={s.subTitle}>
            {pagination.total !== undefined
              ? `${pagination.total} total notification${pagination.total !== 1 ? 's' : ''}`
              : 'Loading…'}
          </p>
        </div>
        <div style={s.actionRow}>
          {/* Phase 3: Link to preferences — icon only, no emoji */}
          <Link
            to="/notification-preferences"
            style={{
              fontSize: 12, color: '#4F46E5',
              textDecoration: 'none', fontWeight: 500,
              padding: '7px 12px', borderRadius: 8,
              background: '#EEF2FF',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <MdTune size={14} /> Preferences
          </Link>
          <button
            id="mark-all-read-btn"
            onClick={handleMarkAll}
            style={s.iconBtn(false)}
          >
            <MdDoneAll size={16} /> Mark all read
          </button>
          {!confirmClear ? (
            <button
              id="clear-all-btn"
              onClick={() => setConfirmClear(true)}
              style={s.iconBtn(true)}
            >
              <MdDeleteSweep size={16} /> Clear all
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Sure?</span>
              <button
                id="confirm-clear-btn"
                onClick={handleClearAll}
                style={{ ...s.iconBtn(true), padding: '7px 12px' }}
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ ...s.iconBtn(false), padding: '7px 12px' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <MdFilterList size={18} style={{ color: '#9CA3AF' }} />
        <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginRight: 2 }}>
          Type:
        </label>
        <select
          id="type-filter-select"
          value={typeFilter}
          onChange={handleFilterChange(setTypeFilter)}
          style={s.select}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginLeft: 8, marginRight: 2 }}>
          Status:
        </label>
        <select
          id="read-filter-select"
          value={readFilter}
          onChange={handleFilterChange(setReadFilter)}
          style={s.select}
        >
          {READ_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {(typeFilter !== 'all' || readFilter !== 'all') && (
          <button
            onClick={() => { setTypeFilter('all'); setReadFilter('all'); setPage(1); }}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 12, color: '#4F46E5', fontWeight: 500,
            }}
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── Notification card ───────────────────────────────────── */}
      <div style={s.card}>

        {/* Phase 3: Loading skeleton */}
        {showingFetching && <NotificationSkeleton />}

        {/* A failed load is its own state — never dressed up as "no notifications" */}
        {isError && !isFetching && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <MdReport size={48} style={{ color: '#EF4444', marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              {status === 403 ? 'Access denied' : "Couldn't load notifications"}
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>{errorMessage}</div>
            {status !== 403 && status !== 401 && (
              <button
                onClick={refetch}
                style={{
                  fontSize: 13, fontWeight: 500, color: '#4F46E5',
                  background: '#EEF2FF', border: 'none', borderRadius: 8,
                  padding: '8px 16px', cursor: 'pointer',
                }}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* Phase 3: Per-filter empty state */}
        {!isError && !isLoading && !isFetching && notifications.length === 0 && (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <MdNotificationsNone size={52} style={{ color: '#D1D5DB', marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              {emptyMsg.title}
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
              {emptyMsg.sub}
            </div>
            {(typeFilter !== 'all' || readFilter !== 'all') && (
              <button
                onClick={() => { setTypeFilter('all'); setReadFilter('all'); setPage(1); }}
                style={{
                  background: '#EEF2FF', color: '#4F46E5',
                  border: 'none', padding: '8px 18px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Show all notifications
              </button>
            )}
          </div>
        )}

        {/* Phase 3: Date-grouped notification rows */}
        {!showingFetching && Object.entries(grouped).map(([groupName, groupNotifs]) => (
          <div key={groupName}>
            {/* Group header */}
            <div style={s.groupLabel}>{groupName}</div>

            {groupNotifs.map((notif) => (
              <div
                key={notif._id}
                id={`notif-row-${notif._id}`}
                onClick={() => handleClick(notif)}
                style={s.notifRow(notif.isRead)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(79,70,229,0.06)'; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notif.isRead
                    ? 'transparent' : 'rgba(79,70,229,0.03)';
                }}
              >
                {/* Type icon — react-icon in coloured circle */}
                <div style={s.typeIcon(notif.type)}>
                  {(() => {
                    const Icon = TYPE_CONFIG[notif.type]?.icon || MdNotifications;
                    return <Icon size={19} style={{ color: TYPE_CONFIG[notif.type]?.color || '#6B7280' }} />;
                  })()}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 13, fontWeight: notif.isRead ? 500 : 700,
                      color: 'var(--color-text-primary, #111827)',
                    }}>
                      {notif.title}
                    </span>
                    {!notif.isRead && (
                      <span style={{
                        background: '#EEF2FF', color: '#4F46E5',
                        fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8,
                      }}>
                        NEW
                      </span>
                    )}
                  </div>

                  <div style={{
                    fontSize: 13, color: 'var(--color-text-secondary, #6B7280)',
                    lineHeight: 1.5, marginBottom: 8,
                  }}>
                    {notif.message}
                  </div>

                  {/* Meta row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, color: 'var(--color-text-tertiary, #9CA3AF)', flexWrap: 'wrap',
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: TYPE_CONFIG[notif.type]?.bg || '#F9FAFB',
                      color:      TYPE_CONFIG[notif.type]?.color || '#6B7280',
                      padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    }}>
                      {TYPE_CONFIG[notif.type]?.label || notif.type}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(notif.createdAt)}</span>
                    {notif.triggeredByName && (
                      <>
                        <span>·</span>
                        <span>From {notif.triggeredByName}</span>
                      </>
                    )}
                    {notif.isRead && notif.readAt && (
                      <>
                        <span>·</span>
                        <MdCheckCircle size={12} style={{ color: '#10B981' }} />
                        <span style={{ color: '#10B981' }}>Read</span>
                      </>
                    )}
                    {notif.link && (
                      <>
                        <span>·</span>
                        <span style={{ color: '#4F46E5' }}>View →</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Unread dot */}
                {!notif.isRead && <div style={s.unreadDot} />}

                {/* Delete button */}
                <button
                  id={`delete-notif-${notif._id}`}
                  onClick={(e) => handleDelete(e, notif._id)}
                  style={s.deleteBtn}
                  title="Delete"
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#D1D5DB'; }}
                >
                  <MdDelete size={17} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            id="prev-page-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={s.navBtn(page === 1)}
          >
            ← Prev
          </button>

          {pageNumbers.map((n) => (
            <button
              key={n}
              id={`page-btn-${n}`}
              onClick={() => setPage(n)}
              style={s.pageBtn(n === page)}
            >
              {n}
            </button>
          ))}

          <button
            id="next-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={s.navBtn(page === totalPages)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
