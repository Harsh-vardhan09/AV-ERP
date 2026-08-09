import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  MdCalendarMonth, MdBarChart, MdAttachMoney, MdEventNote,
  MdAssignment, MdAnnouncement, MdReport, MdSecurity, MdCampaign,
  MdSettings, MdEmail, MdAccessTime, MdHistory, MdTune, MdSend,
  MdNotifications, MdPerson, MdCheck, MdCheckCircle, MdWarning,
} from 'react-icons/md';
import {
  useGetSchoolNotifSettingsQuery,
  useUpdateSchoolNotifSettingsMutation,
  useGetNotificationHistoryQuery,
  useSendBulkAnnouncementMutation,
} from '@modules/notifications/api/notificationPreferenceApi';
import NotificationPreferences from '@modules/notifications/pages/NotificationPreferences';

// ── Shared type list with icons ────────────────────────────────────────────────
const VALID_TYPES = [
  { key: 'attendance',   label: 'Attendance',   Icon: MdCalendarMonth },
  { key: 'marks',        label: 'Marks',         Icon: MdBarChart      },
  { key: 'fee',          label: 'Fee',           Icon: MdAttachMoney   },
  { key: 'leave',        label: 'Leave',         Icon: MdEventNote     },
  { key: 'assignment',   label: 'Assignments',   Icon: MdAssignment    },
  { key: 'notice',       label: 'Notices',       Icon: MdAnnouncement  },
  { key: 'complaint',    label: 'Complaints',    Icon: MdReport        },
  { key: 'system',       label: 'System',        Icon: MdSecurity      },
  { key: 'announcement', label: 'Announcements', Icon: MdCampaign      },
];

const TYPE_COLOR = {
  attendance: '#3B82F6', marks: '#10B981', fee: '#F59E0B',
  leave: '#8B5CF6', assignment: '#EC4899', notice: '#06B6D4',
  complaint: '#EF4444', system: '#6B7280', announcement: '#4F46E5',
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Reusable Toggle ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, id }) => (
  <label htmlFor={id} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
    <input id={id} type="checkbox" checked={checked}
      onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
    <span style={{
      display: 'inline-block', width: 44, height: 24, borderRadius: 12,
      background: checked ? '#4F46E5' : '#D1D5DB',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'left 0.2s',
      }} />
    </span>
  </label>
);

// ── Section card ───────────────────────────────────────────────────────────────
const SCard = ({ icon: Icon, title, subtitle, children }) => (
  <div style={{
    background: '#fff', border: '1px solid #E5E7EB',
    borderRadius: 10, overflow: 'hidden', marginBottom: 18,
  }}>
    <div style={{
      padding: '12px 20px', borderBottom: '1px solid #F3F4F6',
      background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {Icon && <Icon size={16} style={{ color: '#4F46E5', flexShrink: 0 }} />}
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>{title}</p>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const btnPrimary = {
  background: '#4F46E5', color: '#fff', border: 'none',
  padding: '9px 20px', borderRadius: 8, fontSize: 13,
  fontWeight: 600, cursor: 'pointer', display: 'flex',
  alignItems: 'center', gap: 6,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — School Settings
// ═══════════════════════════════════════════════════════════════════════════════
const SchoolSettingsTab = () => {
  const { data, isLoading } = useGetSchoolNotifSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSchoolNotifSettingsMutation();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [enabledTypes, setEnabledTypes] = useState({});
  const [digestTime,   setDigestTime]   = useState('18:00');

  useEffect(() => {
    if (data?.data) {
      setEmailEnabled(data.data.emailEnabled !== false);
      setEnabledTypes(data.data.enabledTypes || {});
      setDigestTime(data.data.digestTime || '18:00');
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateSettings({ emailEnabled, enabledTypes, digestTime }).unwrap();
      toast.success('School notification settings saved');
    } catch { toast.error('Failed to save settings'); }
  };

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
      Loading settings…
    </div>
  );

  return (
    <div>
      {/* Master toggle */}
      <SCard icon={MdEmail} title="Master Email Switch"
        subtitle="If disabled, no emails will be sent from this school regardless of user preferences.">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              Enable Email Notifications
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {emailEnabled
                ? 'All school emails are currently enabled'
                : 'All school emails are globally disabled'}
            </div>
          </div>
          <Toggle id="school-email-toggle" checked={emailEnabled} onChange={setEmailEnabled} />
        </div>
      </SCard>

      {/* Per-type toggles */}
      <SCard icon={MdTune} title="Enabled Notification Types"
        subtitle="Disabling a type will stop all notifications of that type for all users school-wide.">
        {VALID_TYPES.map(({ key, label, Icon }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 20px', borderBottom: '1px solid #F9FAFB',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={15} style={{ color: TYPE_COLOR[key] || '#6B7280', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</span>
            </div>
            <Toggle
              id={`school-type-${key}`}
              checked={enabledTypes[key] !== false}
              onChange={v => setEnabledTypes(prev => ({ ...prev, [key]: v }))}
            />
          </div>
        ))}
      </SCard>

      {/* Digest time */}
      <SCard icon={MdAccessTime} title="Daily Digest Time"
        subtitle="When the digest email is sent to users who have chosen digest mode">
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <input
            id="digest-time-input"
            type="time"
            value={digestTime}
            onChange={e => setDigestTime(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Local school time</span>
        </div>
      </SCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button id="save-school-settings-btn" onClick={handleSave} disabled={isSaving} style={btnPrimary}>
          <MdCheck size={16} />
          {isSaving ? 'Saving…' : 'Save School Settings'}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Send Announcement
// ═══════════════════════════════════════════════════════════════════════════════
const SendAnnouncementTab = () => {
  const [sendAnnouncement, { isLoading }] = useSendBulkAnnouncementMutation();

  const [title,       setTitle]       = useState('');
  const [message,     setMessage]     = useState('');
  const [roles,       setRoles]       = useState({ student: true, teacher: true });
  const [sendEmail,   setSendEmail]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastResult,  setLastResult]  = useState(null);

  const targetRoles = Object.entries(roles).filter(([,v]) => v).map(([k]) => k);
  const canSend = title.trim() && message.trim() && targetRoles.length > 0;

  const handleSend = async () => {
    try {
      const res = await sendAnnouncement({ title, message, targetRoles, sendEmail }).unwrap();
      setLastResult(res.data);
      toast.success(`Announcement sent to ${res.data?.count} users`);
      setTitle(''); setMessage(''); setShowConfirm(false);
    } catch {
      toast.error('Failed to send announcement');
      setShowConfirm(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 24 }}>

        {lastResult && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#ECFDF5', border: '1px solid #6EE7B7',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          }}>
            <MdCheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#065F46' }}>
              {lastResult.count} users notified{lastResult.emailSent ? ', emails sent' : ''}
            </span>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="ann-title" style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Title *
          </label>
          <input id="ann-title" value={title} placeholder="Announcement title…"
            onChange={e => setTitle(e.target.value.slice(0, 100))} style={inputStyle} />
          <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
            {title.length}/100
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="ann-message" style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Message *
          </label>
          <textarea id="ann-message" value={message} placeholder="Write your announcement…"
            rows={5} onChange={e => setMessage(e.target.value.slice(0, 500))}
            style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
            {message.length}/500
          </div>
        </div>

        {/* Target roles */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>Target Roles</p>
          <div style={{ display: 'flex', gap: 16 }}>
            {[['student', 'Students'], ['teacher', 'Teachers']].map(([k, label]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={roles[k]}
                  onChange={e => setRoles(prev => ({ ...prev, [k]: e.target.checked }))}
                  style={{ width: 16, height: 16 }} />
                <MdPerson size={15} style={{ color: '#6B7280' }} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Send email toggle */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Toggle id="send-email-toggle" checked={sendEmail} onChange={setSendEmail} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdEmail size={14} style={{ color: '#6B7280' }} /> Also send email
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Send email to all targeted users in addition to in-app notification
            </div>
          </div>
        </div>

        {/* Preview */}
        {(title || message) && (
          <div style={{
            background: '#F9FAFB', border: '1px solid #E5E7EB',
            borderRadius: 8, padding: '14px 16px', marginBottom: 20,
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              Preview
            </p>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
              {title || '—'}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
              {message || '—'}
            </div>
          </div>
        )}

        {!showConfirm ? (
          <button id="send-announcement-btn" disabled={!canSend || isLoading}
            onClick={() => setShowConfirm(true)}
            style={{
              ...btnPrimary,
              background: canSend ? '#4F46E5' : '#D1D5DB',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}>
            <MdSend size={15} />
            Send to {targetRoles.join(' + ')}
          </button>
        ) : (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 8, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <MdWarning size={16} style={{ color: '#D97706', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#92400E', flex: 1 }}>
              This will notify all active {targetRoles.join(' and ')} users. Proceed?
            </span>
            <button id="confirm-send-btn" onClick={handleSend} disabled={isLoading}
              style={btnPrimary}>
              {isLoading ? 'Sending…' : 'Yes, Send'}
            </button>
            <button onClick={() => setShowConfirm(false)} style={{
              background: '#F3F4F6', color: '#374151', border: 'none',
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Notification History
// ═══════════════════════════════════════════════════════════════════════════════
const HistoryTab = () => {
  const [typeFilter, setTypeFilter] = useState('');
  const [page,       setPage]       = useState(1);

  const { data, isLoading, isFetching } = useGetNotificationHistoryQuery({
    type: typeFilter || undefined, page, limit: 30,
  });

  const notifications = data?.data?.notifications || [];
  const pagination    = data?.data?.pagination    || {};

  return (
    <div>
      {/* Filter row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select
          id="history-type-filter"
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          style={{
            padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8,
            fontSize: 13, outline: 'none', background: '#fff',
          }}
        >
          <option value="">All Types</option>
          {VALID_TYPES.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        {pagination.total !== undefined && (
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{pagination.total} total</span>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '130px 1fr 180px 110px',
          gap: 12, padding: '10px 20px', background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
        }}>
          {['Type', 'Title', 'Sent To', 'Date'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>

        {(isLoading || isFetching) && (
          <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
            Loading history…
          </div>
        )}
        {!isLoading && !isFetching && notifications.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
            No notifications found in the last 30 days
          </div>
        )}

        {notifications.map(n => {
          const TypeIcon = VALID_TYPES.find(t => t.key === n.type)?.Icon || MdNotifications;
          return (
            <div key={n._id} style={{
              display: 'grid', gridTemplateColumns: '130px 1fr 180px 110px',
              gap: 12, padding: '11px 20px', borderBottom: '1px solid #F3F4F6',
              alignItems: 'center',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${TYPE_COLOR[n.type] || '#6B7280'}18`,
                color: TYPE_COLOR[n.type] || '#6B7280',
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              }}>
                <TypeIcon size={11} /> {n.type}
              </span>
              <span style={{ fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.title}
              </span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {n.userId?.firstName} {n.userId?.lastName}
                {n.userId?.role && <span style={{ color: '#9CA3AF', fontSize: 11, marginLeft: 4 }}>({n.userId.role})</span>}
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{timeAgo(n.createdAt)}</span>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{
            padding: '6px 14px', borderRadius: 7, border: '1px solid #E5E7EB',
            background: 'transparent', fontSize: 13, cursor: page === 1 ? 'default' : 'pointer',
            color: page === 1 ? '#D1D5DB' : '#374151',
          }}>
            Prev
          </button>
          <span style={{ fontSize: 13, color: '#6B7280', padding: '6px 10px' }}>
            {page} / {pagination.totalPages}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages} style={{
            padding: '6px 14px', borderRadius: 7, border: '1px solid #E5E7EB',
            background: 'transparent', fontSize: 13,
            cursor: page === pagination.totalPages ? 'default' : 'pointer',
            color: page === pagination.totalPages ? '#D1D5DB' : '#374151',
          }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tab config with react-icons
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'settings',     label: 'School Settings',   Icon: MdSettings  },
  { key: 'announcement', label: 'Send Announcement',  Icon: MdSend      },
  { key: 'history',      label: 'History',            Icon: MdHistory   },
  { key: 'myprefs',      label: 'My Preferences',     Icon: MdTune      },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main — 4-tab admin control panel
// ═══════════════════════════════════════════════════════════════════════════════
const NotificationAdmin = () => {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 60px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
          Notification Control Panel
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          School-wide notification settings, bulk announcements, and audit history
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 24,
        borderBottom: '2px solid #E5E7EB',
      }}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              id={`admin-tab-${key}`}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#4F46E5' : '#6B7280',
                borderBottom: `2px solid ${active ? '#4F46E5' : 'transparent'}`,
                marginBottom: '-2px', transition: 'all 0.15s',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'settings'     && <SchoolSettingsTab />}
      {activeTab === 'announcement' && <SendAnnouncementTab />}
      {activeTab === 'history'      && <HistoryTab />}
      {activeTab === 'myprefs'      && <NotificationPreferences />}
    </div>
  );
};

export default NotificationAdmin;
