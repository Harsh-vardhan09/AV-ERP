import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MdCalendarMonth, MdBarChart, MdAttachMoney, MdEventNote,
  MdAssignment, MdAnnouncement, MdReport, MdSecurity,
  MdCampaign, MdNotifications, MdEmail, MdAccessTime,
  MdNotificationsNone, MdTune, MdLock, MdArrowBack,
  MdRestartAlt, MdSave,
} from 'react-icons/md';
import {
  useGetMyPreferencesQuery,
  useUpdateMyPreferencesMutation,
  useResetMyPreferencesMutation,
} from '../redux/api/notificationPreferenceApi';

// ── Type definitions — using react-icons ───────────────────────────────────────
const TYPE_INFO = [
  { key: 'attendance',   label: 'Attendance',   desc: 'Attendance alerts and low attendance warnings',             Icon: MdCalendarMonth, forced: false },
  { key: 'marks',        label: 'Marks',         desc: 'When marks are uploaded or report cards are ready',        Icon: MdBarChart,      forced: false },
  { key: 'fee',          label: 'Fee',           desc: 'Fee reminders, receipts, and overdue alerts',              Icon: MdAttachMoney,   forced: false },
  { key: 'leave',        label: 'Leave',         desc: 'Leave application status updates',                         Icon: MdEventNote,     forced: false },
  { key: 'assignment',   label: 'Assignments',   desc: 'New assignments and deadline reminders',                   Icon: MdAssignment,    forced: false },
  { key: 'notice',       label: 'Notices',       desc: 'School notices and announcements',                         Icon: MdAnnouncement,  forced: false },
  { key: 'complaint',    label: 'Complaints',    desc: 'Complaint status updates',                                 Icon: MdReport,        forced: false },
  { key: 'system',       label: 'System',        desc: 'Account and security notifications (cannot be disabled)', Icon: MdSecurity,      forced: true  },
  { key: 'announcement', label: 'Announcements', desc: 'School-wide announcements from admin',                    Icon: MdCampaign,      forced: false },
];

const TYPE_COLORS = {
  attendance: '#3B82F6', marks: '#10B981', fee: '#F59E0B',
  leave: '#8B5CF6', assignment: '#EC4899', notice: '#06B6D4',
  complaint: '#EF4444', system: '#6B7280', announcement: '#4F46E5',
};

const TYPE_BG = {
  attendance: '#EFF6FF', marks: '#ECFDF5', fee: '#FFFBEB',
  leave: '#F5F3FF', assignment: '#FDF2F8', notice: '#ECFEFF',
  complaint: '#FEF2F2', system: '#F9FAFB', announcement: '#EEF2FF',
};

// ── Skeleton loader ────────────────────────────────────────────────────────────
const PrefSkeleton = () => (
  <div style={{ animation: 'prefPulse 1.5s ease-in-out infinite' }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 20px', borderBottom: '1px solid #F3F4F6',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F3F4F6', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, width: '25%', background: '#F3F4F6', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 11, width: '55%', background: '#F3F4F6', borderRadius: 4 }} />
        </div>
        <div style={{ width: 44, height: 24, borderRadius: 12, background: '#F3F4F6' }} />
        <div style={{ width: 44, height: 24, borderRadius: 12, background: '#F3F4F6' }} />
      </div>
    ))}
  </div>
);

// ── Toggle switch ──────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled, id }) => (
  <label
    htmlFor={id}
    style={{ display: 'inline-flex', alignItems: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
  >
    <input id={id} type="checkbox" checked={checked}
      onChange={e => !disabled && onChange(e.target.checked)}
      disabled={disabled} style={{ display: 'none' }} />
    <span style={{
      display: 'inline-block', width: 44, height: 24, borderRadius: 12,
      background: checked ? '#4F46E5' : '#D1D5DB',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
        transition: 'left 0.2s',
      }} />
    </span>
  </label>
);

// ── Section card wrapper ───────────────────────────────────────────────────────
const SectionCard = ({ icon: Icon, title, subtitle, right, children }) => (
  <div style={{
    background: 'var(--color-background-primary, #fff)',
    border: '1px solid var(--color-border-tertiary, #E5E7EB)',
    borderRadius: 12, overflow: 'hidden', marginBottom: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  }}>
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid var(--color-border-tertiary, #E5E7EB)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {Icon && <Icon size={18} style={{ color: '#4F46E5', flexShrink: 0 }} />}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</p>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const NotificationPreferences = () => {
  const { data, isLoading } = useGetMyPreferencesQuery();
  const [updatePref, { isLoading: isSaving }] = useUpdateMyPreferencesMutation();
  const [resetPref,  { isLoading: isResetting }] = useResetMyPreferencesMutation();

  const [prefs,       setPrefs]       = useState({});
  const [emailMode,   setEmailMode]   = useState('instant');
  const [quietHours,  setQuietHours]  = useState({ enabled: false, startTime: '22:00', endTime: '07:00' });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setPrefs(data.data.preferences || {});
      setEmailMode(data.data.emailMode || 'instant');
      setQuietHours(data.data.quietHours || { enabled: false, startTime: '22:00', endTime: '07:00' });
    }
  }, [data]);

  const isDefault = data?.data?.isDefault === true;

  const handleTypeToggle = async (type, channel, value) => {
    setPrefs(prev => ({ ...prev, [type]: { ...prev[type], [channel]: value } }));
    try {
      await updatePref({ type, [channel]: value }).unwrap();
      toast.success('Preference saved');
    } catch {
      toast.error('Failed to save preference');
      setPrefs(prev => ({ ...prev, [type]: { ...prev[type], [channel]: !value } }));
    }
  };

  const handleEmailModeSave = async () => {
    try { await updatePref({ emailMode }).unwrap(); toast.success('Email mode saved'); }
    catch { toast.error('Failed to save email mode'); }
  };

  const handleQuietHoursSave = async () => {
    try { await updatePref({ quietHours }).unwrap(); toast.success('Quiet hours saved'); }
    catch { toast.error('Failed to save quiet hours'); }
  };

  const handleReset = async () => {
    try {
      await resetPref().unwrap();
      toast.success('Preferences reset to defaults');
      setShowConfirm(false);
    } catch { toast.error('Failed to reset preferences'); }
  };

  const btnPrimary = {
    background: '#4F46E5', color: '#fff', border: 'none',
    cursor: 'pointer', padding: '8px 18px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center',
    gap: 6, transition: 'opacity 0.15s',
  };
  const btnDanger = {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    cursor: 'pointer', padding: '8px 18px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 60px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes prefPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary,#111827)', margin: 0 }}>
            Notification Preferences
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Control how and when you receive notifications
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {isDefault && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#EEF2FF', color: '#4F46E5',
              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
            }}>
              <MdNotificationsNone size={14} /> Using default settings
            </span>
          )}
          <button id="reset-preferences-btn" style={btnDanger}
            onClick={() => setShowConfirm(true)} disabled={isResetting}>
            <MdRestartAlt size={15} />
            {isResetting ? 'Resetting…' : 'Reset to Defaults'}
          </button>
        </div>
      </div>

      {/* Confirm reset */}
      {showConfirm && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
          padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
            Reset all preferences to default settings?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button id="confirm-reset-btn" onClick={handleReset} disabled={isResetting}
              style={{ ...btnDanger, padding: '6px 14px', fontSize: 12 }}>
              {isResetting ? 'Resetting…' : 'Yes, Reset'}
            </button>
            <button onClick={() => setShowConfirm(false)} style={{
              background: '#F3F4F6', color: '#374151', border: 'none',
              cursor: 'pointer', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION 1: Per-type toggles ───────────────────────────────────── */}
      <SectionCard
        icon={MdNotifications}
        title="Notification Types"
        subtitle="Choose which types of notifications you want to receive"
        right={
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 52, textAlign: 'center' }}>In-App</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 52, textAlign: 'center' }}>Email</span>
          </div>
        }
      >
        {isLoading ? <PrefSkeleton /> : TYPE_INFO.map((t, idx) => {
          const { Icon } = t;
          const typePref = prefs[t.key] || { inApp: true, email: true };
          return (
            <div
              key={t.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                borderBottom: idx < TYPE_INFO.length - 1 ? '1px solid #F3F4F6' : 'none',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,70,229,0.025)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: TYPE_BG[t.key] || '#F9FAFB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} style={{ color: TYPE_COLORS[t.key] || '#6B7280' }} />
              </div>

              {/* Label + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.label}</span>
                  {t.forced && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#FEF3C7', color: '#92400E',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    }}>
                      <MdLock size={9} /> Required
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{t.desc}</span>
              </div>

              {/* In-App toggle */}
              <div style={{ minWidth: 52, display: 'flex', justifyContent: 'center' }}>
                <Toggle id={`${t.key}-inapp`} checked={typePref.inApp !== false}
                  onChange={v => handleTypeToggle(t.key, 'inApp', v)} disabled={t.forced} />
              </div>

              {/* Email toggle */}
              <div style={{ minWidth: 52, display: 'flex', justifyContent: 'center' }}>
                <Toggle id={`${t.key}-email`} checked={typePref.email !== false}
                  onChange={v => handleTypeToggle(t.key, 'email', v)} disabled={t.forced} />
              </div>
            </div>
          );
        })}
      </SectionCard>

      {/* ── SECTION 2: Email delivery mode ───────────────────────────────── */}
      <SectionCard
        icon={MdEmail}
        title="Email Delivery Mode"
        subtitle="Choose when emails are delivered to your inbox"
      >
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { value: 'instant', label: 'Instant',       desc: 'Receive each email as it happens, in real time',                    Icon: MdNotifications },
              { value: 'digest',  label: 'Daily Digest',  desc: 'Receive one summary email at 6 PM with all your notifications',     Icon: MdAccessTime },
            ].map(opt => (
              <label key={opt.value} htmlFor={`email-mode-${opt.value}`} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${emailMode === opt.value ? '#4F46E5' : '#E5E7EB'}`,
                background: emailMode === opt.value ? '#F5F3FF' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <input id={`email-mode-${opt.value}`} type="radio" name="emailMode"
                  value={opt.value} checked={emailMode === opt.value}
                  onChange={() => setEmailMode(opt.value)} style={{ marginTop: 3 }} />
                <opt.Icon size={18} style={{ color: emailMode === opt.value ? '#4F46E5' : '#9CA3AF', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button id="save-email-mode-btn" style={btnPrimary} onClick={handleEmailModeSave} disabled={isSaving}>
              <MdSave size={15} />
              {isSaving ? 'Saving…' : 'Save Email Mode'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── SECTION 3: Quiet hours ────────────────────────────────────────── */}
      <SectionCard
        icon={MdAccessTime}
        title="Quiet Hours"
        subtitle="No emails will be sent during these hours"
        right={
          <Toggle id="quiet-hours-toggle" checked={quietHours.enabled}
            onChange={v => setQuietHours(prev => ({ ...prev, enabled: v }))} />
        }
      >
        {quietHours.enabled ? (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label htmlFor="quiet-start" style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Start Time</label>
                <input id="quiet-start" type="time" value={quietHours.startTime}
                  onChange={e => setQuietHours(prev => ({ ...prev, startTime: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
              <span style={{ fontSize: 14, color: '#9CA3AF', marginTop: 18 }}>→</span>
              <div>
                <label htmlFor="quiet-end" style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>End Time</label>
                <input id="quiet-end" type="time" value={quietHours.endTime}
                  onChange={e => setQuietHours(prev => ({ ...prev, endTime: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 12 }}>
              Emails during quiet hours will be skipped entirely. Overnight windows (e.g. 22:00 to 07:00) are supported.
            </p>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button id="save-quiet-hours-btn" style={btnPrimary} onClick={handleQuietHoursSave} disabled={isSaving}>
                <MdSave size={15} />
                {isSaving ? 'Saving…' : 'Save Quiet Hours'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>Enable quiet hours above to configure the time window.</span>
            <button id="save-quiet-hours-btn" style={{ ...btnPrimary, padding: '6px 14px', fontSize: 12 }}
              onClick={handleQuietHoursSave} disabled={isSaving}>
              <MdSave size={14} />
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </SectionCard>

      {/* Back link */}
      <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
        <Link to="/notifications" style={{ color: '#4F46E5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <MdArrowBack size={13} /> Back to Notification Center
        </Link>
      </p>
    </div>
  );
};

export default NotificationPreferences;
