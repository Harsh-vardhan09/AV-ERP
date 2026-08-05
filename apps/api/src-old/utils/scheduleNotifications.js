const logger = require('./logger');

// Lazy-load queues to avoid circular deps at boot time
const getQueues = () => {
  const {
    feeReminderQueue,
    feeOverdueQueue,
    marksDeadlineQueue,
  } = require('../workers/notificationWorker');
  return { feeReminderQueue, feeOverdueQueue, marksDeadlineQueue };
};

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Schedule a fee DUE reminder for a specific student.
// Call this when a fee structure is assigned OR from a daily job that checks
// upcoming due dates. Pass delayUntil = 3 days before dueDate for best UX.
//
// Example call from exam creation:
//   const threeDaysBefore = new Date(dueDate);
//   threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
//   await scheduleFeeReminder({ ..., delayUntil: threeDaysBefore });
// ─────────────────────────────────────────────────────────────────────────────
exports.scheduleFeeReminder = async ({
  schoolId, studentUserId, studentEmail,
  studentName, amount, dueDate, schoolName,
  delayUntil, // Date object — when the job should fire
}) => {
  try {
    const { feeReminderQueue } = getQueues();
    const delay = delayUntil
      ? Math.max(0, new Date(delayUntil).getTime() - Date.now())
      : 0;

    await feeReminderQueue.add(
      {
        schoolId:      String(schoolId),
        studentUserId: String(studentUserId),
        studentEmail,
        studentName,
        amount,
        dueDate,
        schoolName,
      },
      { ...JOB_OPTS, delay },
    );

    logger.info('[Schedule] Fee reminder queued', { studentUserId, dueDate, delay });
  } catch (err) {
    logger.warn('[Schedule] Failed to queue fee reminder', { error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Schedule a fee OVERDUE alert (fires immediately — call when past due date).
// Also notifies admin users.
// ─────────────────────────────────────────────────────────────────────────────
exports.scheduleFeeOverdue = async ({
  schoolId, studentUserId, studentEmail,
  studentName, amount, dueSince, schoolName, adminUserIds,
}) => {
  try {
    const { feeOverdueQueue } = getQueues();

    await feeOverdueQueue.add(
      {
        schoolId:      String(schoolId),
        studentUserId: String(studentUserId),
        studentEmail,
        studentName,
        amount,
        dueSince,
        schoolName,
        adminUserIds: (adminUserIds || []).map(String),
      },
      JOB_OPTS,
    );

    logger.info('[Schedule] Fee overdue queued', { studentUserId });
  } catch (err) {
    logger.warn('[Schedule] Failed to queue fee overdue', { error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Schedule a marks entry deadline reminder for a teacher.
// Call from createExam after saving, with daysLeft = days until deadline.
// Recommended: schedule at (marksEntryDeadline - 2 days).
// ─────────────────────────────────────────────────────────────────────────────
exports.scheduleMarksDeadlineReminder = async ({
  schoolId, teacherUserId, teacherEmail,
  teacherName, examName, subjectName,
  daysLeft, schoolName,
}) => {
  try {
    const { marksDeadlineQueue } = getQueues();

    await marksDeadlineQueue.add(
      {
        schoolId:      String(schoolId),
        teacherUserId: String(teacherUserId),
        teacherEmail,
        teacherName,
        examName,
        subjectName,
        daysLeft,
        schoolName,
      },
      JOB_OPTS,
    );

    logger.info('[Schedule] Marks deadline reminder queued', { teacherUserId, examName, daysLeft });
  } catch (err) {
    logger.warn('[Schedule] Failed to queue marks deadline reminder', { error: err.message });
  }
};
