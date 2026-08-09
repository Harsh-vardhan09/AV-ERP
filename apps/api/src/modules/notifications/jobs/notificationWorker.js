/**
 * notificationWorker.js
 * Bull queue processors for fee reminders, overdue alerts, and
 * marks deadline notifications.
 *
 * FIX CRIT-6: All three Bull queue initialisations are now wrapped in
 * a try/catch with graceful stubs — a Redis hiccup at boot time can
 * no longer crash the entire server.
 */
const logger = require('../../../core/logging/logger');
const { REDIS_URL, REDIS_DISABLED } = require('../../../core/config/redis');

// Graceful stub (used when Redis is unavailable)
const makeStub = (name) => ({
  process: () => {},
  add:     async () => ({ id: null }),
  on:      () => {},
});

// Queue definitions with crash-safe init
let feeReminderQueue;
let feeOverdueQueue;
let marksDeadlineQueue;

try {
  if (REDIS_DISABLED) throw new Error('Redis disabled via REDIS_DISABLED=true');

  const Queue = require('bull');
  feeReminderQueue   = new Queue('fee-reminders',    REDIS_URL);
  feeOverdueQueue    = new Queue('fee-overdue',       REDIS_URL);
  marksDeadlineQueue = new Queue('marks-deadline',    REDIS_URL);

  // Suppress unhandled Redis errors — already logged in config/redis.js
  feeReminderQueue.on('error',   (e) => logger.warn('[NotifWorker] feeReminderQueue Redis error',   { error: e.message }));
  feeOverdueQueue.on('error',    (e) => logger.warn('[NotifWorker] feeOverdueQueue Redis error',    { error: e.message }));
  marksDeadlineQueue.on('error', (e) => logger.warn('[NotifWorker] marksDeadlineQueue Redis error', { error: e.message }));

  logger.info('[NotifWorker] Notification queues initialized');

} catch (err) {
  logger.warn('[NotifWorker] Failed to init Bull queues — Redis unavailable. Notification queuing disabled.', {
    error: err.message,
  });
  feeReminderQueue   = makeStub('fee-reminders');
  feeOverdueQueue    = makeStub('fee-overdue');
  marksDeadlineQueue = makeStub('marks-deadline');
}

// Lazy import to avoid circular deps
const getServices = () => {
  const {
    createInAppNotification,
    sendEmailNotification,
    notifyMultipleUsers,
    sendBulkEmails,
  } = require('../services/notificationService');
  const {
    feeDueReminderTemplate,
    feeOverdueTemplate,
  } = require('../lib/emailTemplates');
  return {
    createInAppNotification,
    sendEmailNotification,
    notifyMultipleUsers,
    sendBulkEmails,
    feeDueReminderTemplate,
    feeOverdueTemplate,
  };
};

// PROCESSOR 1: Fee Due Reminder
// Job data: { schoolId, studentUserId, studentEmail,
//             studentName, amount, dueDate, schoolName }
feeReminderQueue.process(async (job) => {
  const {
    schoolId, studentUserId, studentEmail,
    studentName, amount, dueDate, schoolName,
  } = job.data;

  logger.info('[NotifWorker] Processing fee reminder', { studentUserId, amount, dueDate });

  const svc = getServices();
  const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';

  // In-app notification
  await svc.createInAppNotification({
    userId: studentUserId,
    schoolId,
    type: 'fee',
    title: 'Fee Due Reminder',
    message: `Fee of ₹${amount} is due on ${dueDate}. Please pay on time.`,
    link: '/student/fees',
    metadata: { amount, dueDate },
  });

  // Email notification
  const { subject, html } = svc.feeDueReminderTemplate({
    studentName, amount, dueDate, schoolName, loginUrl,
  });
  await svc.sendEmailNotification({ to: studentEmail, subject, html });

  logger.info('[NotifWorker] Fee reminder sent', { studentUserId });
});

// PROCESSOR 2: Fee Overdue Alert
// Job data: { schoolId, studentUserId, studentEmail,
//             studentName, amount, dueSince, schoolName, adminUserIds }
feeOverdueQueue.process(async (job) => {
  const {
    schoolId, studentUserId, studentEmail,
    studentName, amount, dueSince, schoolName, adminUserIds,
  } = job.data;

  logger.info('[NotifWorker] Processing fee overdue', { studentUserId, amount, dueSince });

  const svc = getServices();
  const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';

  const overdueMsg = `Fee of ₹${amount} was due on ${dueSince} and is now overdue.`;

  // Notify student in-app
  await svc.createInAppNotification({
    userId: studentUserId,
    schoolId,
    type: 'fee',
    title: 'Fee Overdue',
    message: overdueMsg,
    link: '/student/fees',
    metadata: { amount, dueSince },
  });

  // Notify all admin users in-app
  if (adminUserIds && adminUserIds.length > 0) {
    await svc.notifyMultipleUsers(adminUserIds, {
      schoolId,
      type: 'fee',
      title: `Fee Overdue — ${studentName}`,
      message: `${studentName}'s fee of ₹${amount} is overdue since ${dueSince}.`,
      link: '/admin/fee',
      metadata: { amount, dueSince, studentName },
    });
  }

  // Email student
  const { subject, html } = svc.feeOverdueTemplate({
    studentName, amount, dueSince, schoolName, loginUrl,
  });
  await svc.sendEmailNotification({ to: studentEmail, subject, html });

  logger.info('[NotifWorker] Fee overdue alerts sent', { studentUserId });
});

// PROCESSOR 3: Marks Entry Deadline Reminder
// Job data: { schoolId, teacherUserId, teacherEmail,
//             teacherName, examName, subjectName, daysLeft, schoolName }
marksDeadlineQueue.process(async (job) => {
  const {
    schoolId, teacherUserId, teacherEmail,
    teacherName, examName, subjectName, daysLeft, schoolName,
  } = job.data;

  logger.info('[NotifWorker] Processing marks deadline reminder', { teacherUserId, examName, daysLeft });

  const svc = getServices();
  const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';

  const deadlineMsg =
    `Marks entry for ${subjectName} (${examName}) closes in ` +
    `${daysLeft} day${daysLeft > 1 ? 's' : ''}. Please submit before the deadline.`;

  // In-app notification
  await svc.createInAppNotification({
    userId: teacherUserId,
    schoolId,
    type: 'marks',
    title: `Marks Deadline — ${daysLeft} day${daysLeft > 1 ? 's' : ''} left`,
    message: deadlineMsg,
    link: '/teacher/marks',
    metadata: { examName, subjectName, daysLeft },
  });

  // Email notification (only when 2 or fewer days left — avoids spam)
  if (daysLeft <= 2) {
    await svc.sendEmailNotification({
      to: teacherEmail,
      subject: `Marks Deadline Reminder — ${examName} | ${schoolName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:#7C3AED;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h2 style="color:#fff;margin:0;font-size:20px;">${schoolName}</h2>
            <p style="color:#DDD6FE;margin:5px 0 0;font-size:13px;">Marks Entry Deadline Reminder</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
            <p style="color:#111827;font-size:15px;margin:0 0 12px;">Dear ${teacherName},</p>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">${deadlineMsg}</p>
            <div style="text-align:center;margin:20px 0;">
              <a href="${loginUrl}/teacher/marks"
                 style="background:#7C3AED;color:#fff;padding:10px 24px;border-radius:6px;
                        text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
                Upload Marks Now
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;">
            <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
              ${schoolName} — This is an automated message. Do not reply.
            </p>
          </div>
        </div>
      `,
    });
  }

  logger.info('[NotifWorker] Marks deadline reminder sent', { teacherUserId });
});

// Job failure handlers
feeReminderQueue.on('failed', (job, err) => {
  logger.warn('[NotifWorker] feeReminderQueue job failed', {
    jobId: job.id, data: job.data, error: err.message,
  });
});

feeOverdueQueue.on('failed', (job, err) => {
  logger.warn('[NotifWorker] feeOverdueQueue job failed', {
    jobId: job.id, error: err.message,
  });
});

marksDeadlineQueue.on('failed', (job, err) => {
  logger.warn('[NotifWorker] marksDeadlineQueue job failed', {
    jobId: job.id, error: err.message,
  });
});

// Export queues so controllers/utils can enqueue jobs
module.exports = { feeReminderQueue, feeOverdueQueue, marksDeadlineQueue };
