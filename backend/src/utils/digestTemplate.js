/**
 * digestTemplate.js — Phase 3
 *
 * Generates a beautiful daily digest email combining multiple
 * notifications into one clean summary email.
 */

const TYPE_LABELS = {
  attendance:   '📅 Attendance',
  marks:        '📝 Marks & Exams',
  fee:          '💰 Fee',
  leave:        '🏖️ Leave',
  assignment:   '📚 Assignments',
  notice:       '📢 Notices',
  complaint:    '📣 Complaints',
  system:       '⚙️ System',
  announcement: '📡 Announcements',
};

exports.generateDigestEmail = ({ notifications, recipientEmail }) => {
  const count = notifications.length;
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });

  // Group notifications by type for the digest summary
  const typeGroups = {};
  for (const notif of notifications) {
    const type = notif.type || 'system';
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(notif.subject);
  }

  const groupsHtml = Object.entries(typeGroups)
    .map(
      ([type, subjects]) => `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:600;color:#374151;
                      margin-bottom:8px;padding-bottom:6px;
                      border-bottom:1px solid #F3F4F6;">
            ${TYPE_LABELS[type] || type}
            <span style="font-weight:400;color:#9CA3AF;
                         font-size:12px;margin-left:6px;">
              (${subjects.length})
            </span>
          </div>
          ${subjects
            .map(
              (s) => `
            <div style="font-size:13px;color:#6B7280;
                        padding:4px 0;padding-left:12px;
                        border-left:2px solid #E5E7EB;">
              ${s}
            </div>
          `
            )
            .join('')}
        </div>
      `
    )
    .join('');

  const loginUrl =
    process.env.CLIENT_URL || 'https://campus-nexus.nexisparkx.com';

  const subject = `Your Daily Summary — ${count} update${count > 1 ? 's' : ''} | ${today}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;
                margin:0 auto;padding:20px;">

      <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);
                  padding:24px;border-radius:8px 8px 0 0;
                  text-align:center;">
        <h2 style="color:#fff;margin:0;font-size:22px;
                   font-weight:700;">
          Daily Summary
        </h2>
        <p style="color:#C7D2FE;margin:6px 0 0;font-size:13px;">
          ${today}
        </p>
      </div>

      <div style="background:#fff;padding:24px;
                  border:1px solid #E5E7EB;border-top:none;
                  border-radius:0 0 8px 8px;">

        <p style="color:#374151;font-size:14px;margin:0 0 20px;">
          You have <strong>${count} notification${count > 1 ? 's' : ''}</strong>
          from today. Here&rsquo;s your summary:
        </p>

        ${groupsHtml}

        <div style="text-align:center;margin:24px 0 16px;">
          <a href="${loginUrl}/notifications"
             style="background:#4F46E5;color:#fff;
                    padding:12px 28px;border-radius:6px;
                    text-decoration:none;font-size:14px;
                    font-weight:600;display:inline-block;">
            View All Notifications
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #E5E7EB;
                   margin:20px 0;">

        <p style="color:#9CA3AF;font-size:12px;
                  text-align:center;margin:0;line-height:1.6;">
          You&rsquo;re receiving this daily digest because you chose
          digest mode in your notification preferences.<br>
          <a href="${loginUrl}/notification-preferences"
             style="color:#4F46E5;text-decoration:none;">
            Change preferences
          </a>
        </p>

      </div>
    </div>
  `;

  return { subject, html };
};
