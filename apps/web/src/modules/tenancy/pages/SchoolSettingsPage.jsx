import React, { useState, useEffect } from 'react';
import { useGetSchoolSettingsQuery, useUpdateSchoolSettingsMutation } from '@modules/admissions/api/admissionApi';
import {
  useGetSchoolNotifSettingsQuery,
  useUpdateSchoolNotifSettingsMutation,
  useSendBulkAnnouncementMutation,
} from '@modules/notifications/api/notificationPreferenceApi';
import toast from 'react-hot-toast';
import {
  MdCalendarMonth, MdBarChart, MdAttachMoney, MdEventNote,
  MdAssignment, MdAnnouncement, MdReport, MdSecurity,
  MdCampaign, MdEmail, MdAccessTime, MdSend, MdTune,
  MdCheck, MdPerson, MdWarning, MdCheckCircle, MdNotifications,
} from 'react-icons/md';

// ── Existing toggle (Tailwind) ─────────────────────────────────────────────────
const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-100 last:border-b-0">
    <div className="min-w-0 flex-1">
      <h4 className="text-sm font-medium text-gray-900 leading-snug">{label}</h4>
      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

// ── Existing section card (Tailwind) ───────────────────────────────────────────
const SectionCard = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-4 sm:px-5 py-3 border-b border-gray-200 bg-gray-50">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="px-4 sm:px-5">{children}</div>
  </div>
);

// ── Notification type list ─────────────────────────────────────────────────────
const NOTIF_TYPES = [
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

// ── Inline toggle for notification section (matches Tailwind style, not className) ─
const NotifRowToggle = ({ checked, onChange, id }) => (
  <button
    id={id}
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none ${
      checked ? 'bg-indigo-600' : 'bg-gray-300'
    }`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

// ── Notification Settings section ─────────────────────────────────────────────
const NotificationSettingsSection = () => {
  const { data: notifData, isLoading: notifLoading } = useGetSchoolNotifSettingsQuery();
  const [updateNotifSettings, { isLoading: isSavingNotif }] = useUpdateSchoolNotifSettingsMutation();
  const [sendAnnouncement,    { isLoading: isSending }]     = useSendBulkAnnouncementMutation();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [enabledTypes, setEnabledTypes] = useState({});
  const [digestTime,   setDigestTime]   = useState('18:00');

  // Announcement form
  const [annTitle,     setAnnTitle]     = useState('');
  const [annMessage,   setAnnMessage]   = useState('');
  const [annRoles,     setAnnRoles]     = useState({ student: true, teacher: true });
  const [annEmail,     setAnnEmail]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showAnnForm,  setShowAnnForm]  = useState(false);

  useEffect(() => {
    if (notifData?.data) {
      setEmailEnabled(notifData.data.emailEnabled !== false);
      setEnabledTypes(notifData.data.enabledTypes || {});
      setDigestTime(notifData.data.digestTime || '18:00');
    }
  }, [notifData]);

  const handleNotifSave = async () => {
    try {
      await updateNotifSettings({ emailEnabled, enabledTypes, digestTime }).unwrap();
      toast.success('Notification settings saved');
    } catch { toast.error('Failed to save notification settings'); }
  };

  const handleSendAnnouncement = async () => {
    const targetRoles = Object.entries(annRoles).filter(([,v]) => v).map(([k]) => k);
    if (!annTitle.trim() || !annMessage.trim() || targetRoles.length === 0) {
      toast.error('Please fill title, message, and select at least one role');
      return;
    }
    try {
      const res = await sendAnnouncement({
        title:       annTitle,
        message:     annMessage,
        targetRoles,
        sendEmail:   annEmail,
      }).unwrap();
      toast.success(`Announcement sent to ${res.data?.count} users`);
      setAnnTitle(''); setAnnMessage('');
      setShowConfirm(false); setShowAnnForm(false);
    } catch { toast.error('Failed to send announcement'); setShowConfirm(false); }
  };

  if (notifLoading) return (
    <div className="py-8 text-center text-sm text-gray-400">Loading notification settings…</div>
  );

  return (
    <div className="mt-5 space-y-4">

      {/* ── Master Email Switch ──────────────────────────────── */}
      <SectionCard title="Notifications — Email">
        <Toggle
          label="Enable Email Notifications"
          description="Master switch — if OFF, no emails are sent from this school regardless of user preferences."
          checked={emailEnabled}
          onChange={setEmailEnabled}
        />
        {/* Digest time */}
        <div className="flex items-center gap-4 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-gray-900 leading-snug flex items-center gap-2">
              <MdAccessTime size={15} style={{ color: '#6B7280' }} />
              Daily Digest Time
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              When the digest email is sent to users who switch to digest mode
            </p>
          </div>
          <input
            id="digest-time-input"
            type="time"
            value={digestTime}
            onChange={e => setDigestTime(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </SectionCard>

      {/* ── Per-type toggles ─────────────────────────────────── */}
      <SectionCard title="Notifications — Enabled Types">
        <p className="text-xs text-gray-400 pt-3 pb-1">
          Disabling a type will stop all notifications of that type school-wide, overriding user preferences.
        </p>
        {NOTIF_TYPES.map(({ key, label, Icon }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={14} style={{ color: TYPE_COLOR[key], flexShrink: 0 }} />
              <span className="text-sm text-gray-700 font-medium">{label}</span>
            </div>
            <NotifRowToggle
              id={`school-notif-type-${key}`}
              checked={enabledTypes[key] !== false}
              onChange={v => setEnabledTypes(prev => ({ ...prev, [key]: v }))}
            />
          </div>
        ))}
        <div className="py-4 flex justify-end">
          <button
            id="save-notif-settings-btn"
            onClick={handleNotifSave}
            disabled={isSavingNotif}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            <MdCheck size={15} />
            {isSavingNotif ? 'Saving…' : 'Save Notification Settings'}
          </button>
        </div>
      </SectionCard>

      {/* ── Send Announcement ────────────────────────────────── */}
      <SectionCard title="Send Announcement">
        {!showAnnForm ? (
          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Send an in-app notification (and optional email) to all students or teachers.</p>
            </div>
            <button
              id="open-announcement-form-btn"
              onClick={() => setShowAnnForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <MdSend size={14} /> New Announcement
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="ann-title" className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
              <input
                id="ann-title"
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value.slice(0, 100))}
                placeholder="Announcement title…"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">{annTitle.length}/100</p>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="ann-message" className="block text-xs font-semibold text-gray-600 mb-1">Message *</label>
              <textarea
                id="ann-message"
                value={annMessage}
                onChange={e => setAnnMessage(e.target.value.slice(0, 500))}
                placeholder="Write your announcement…"
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">{annMessage.length}/500</p>
            </div>

            {/* Target roles */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Target Roles</p>
              <div className="flex gap-5">
                {[['student', 'Students'], ['teacher', 'Teachers']].map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annRoles[k]}
                      onChange={e => setAnnRoles(prev => ({ ...prev, [k]: e.target.checked }))}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <MdPerson size={14} className="text-gray-400" />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            {/* Also send email */}
            <div className="flex items-center gap-3">
              <NotifRowToggle id="ann-email-toggle" checked={annEmail} onChange={setAnnEmail} />
              <div>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                  <MdEmail size={13} className="text-gray-500" /> Also send email
                </p>
                <p className="text-xs text-gray-400">Sends email in addition to in-app notification</p>
              </div>
            </div>

            {/* Confirm / Send buttons */}
            {!showConfirm ? (
              <div className="flex gap-3 pt-1">
                <button
                  id="send-announcement-btn"
                  onClick={() => setShowConfirm(true)}
                  disabled={!annTitle.trim() || !annMessage.trim()}
                  className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MdSend size={14} /> Send
                </button>
                <button
                  onClick={() => { setShowAnnForm(false); setShowConfirm(false); }}
                  className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <MdWarning size={16} className="text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-800 flex-1">
                  This will notify all active {Object.entries(annRoles).filter(([,v])=>v).map(([k])=>k).join(' + ')} users. Proceed?
                </span>
                <button
                  id="confirm-send-announcement-btn"
                  onClick={handleSendAnnouncement}
                  disabled={isSending}
                  className="flex items-center gap-1 bg-indigo-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  <MdCheckCircle size={14} />
                  {isSending ? 'Sending…' : 'Yes, Send'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </SectionCard>

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// Main SchoolSettingsPage
// ══════════════════════════════════════════════════════════════════════════════
const SchoolSettingsPage = () => {
  const { data, isLoading } = useGetSchoolSettingsQuery();
  const [updateSettings] = useUpdateSchoolSettingsMutation();
  const settings = data?.data || {};

  const handleToggle = async (key, value) => {
    try {
      await updateSettings({ [key]: value }).unwrap();
      toast.success('Setting updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Error');
    }
  };

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="w-full max-w-2xl mx-auto px-0 sm:px-0">

      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">School Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage modules, attendance rules, and notification preferences</p>
      </div>

      {/* Auto-Generate IDs */}
      <SectionCard title="Auto-Generate Student IDs">
        <Toggle
          label="Admission Number"
          description="System generates admission numbers like ADM-2600001"
          checked={settings.autoGenerateAdmissionNo ?? true}
          onChange={(v) => handleToggle('autoGenerateAdmissionNo', v)}
        />
        <Toggle
          label="Roll Number"
          description="System generates roll numbers like 265A1 (session+class+section+serial)"
          checked={settings.autoGenerateRollNo ?? true}
          onChange={(v) => handleToggle('autoGenerateRollNo', v)}
        />
        <Toggle
          label="Student ID"
          description="System generates student IDs like STU-264738"
          checked={settings.autoGenerateStudentId ?? true}
          onChange={(v) => handleToggle('autoGenerateStudentId', v)}
        />
      </SectionCard>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4 text-xs text-blue-700 leading-relaxed">
        When auto-generation is <strong>ON</strong>, the field is read-only during registration.
        When <strong>OFF</strong>, admission staff must enter values manually.
      </div>

      {/* Attendance Settings */}
      <div className="mt-5">
        <SectionCard title="Attendance Settings">
          <Toggle
            label="Hall / Full-Day Attendance"
            description="Allow any teacher to mark a single full-day attendance (not subject-wise). Useful for assembly days, exams, etc."
            checked={settings.allowHallAttendance ?? false}
            onChange={(v) => handleToggle('allowHallAttendance', v)}
          />
        </SectionCard>
      </div>

      {/* OASES Workflows */}
      <div className="mt-5">
        <SectionCard title="OASES Workflows">
          <Toggle
            label="Enable OASES Answer Sheet Workflow"
            description="Allow scan operators to upload answer sheets and evaluators to process them via the OASES workflow."
            checked={settings.isOasesEnabled ?? false}
            onChange={(v) => handleToggle('isOasesEnabled', v)}
          />
        </SectionCard>
      </div>

      {/* ── Phase 3: Notification Settings ──────────────────────────────────── */}
      <NotificationSettingsSection />

    </div>
  );
};

export default SchoolSettingsPage;
