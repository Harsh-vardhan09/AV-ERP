/**
 * notificationService.js — Phase 3 (extended from Phase 1)
 *
 * Phase 3 additions:
 *   - preference checking in createInAppNotification and sendEmailNotification
 *   - critical notification bypass (system, fee-overdue, low-attendance)
 *   - quiet hours detection
 *   - digest queue rerouting
 *
 * All existing function signatures are unchanged — callers do NOT need to change.
 * sendEmailNotification accepts optional { userId, schoolId, type, title, message }
 * to enable preference checking.  Callers that don't pass these get the previous
 * instant-send behaviour.
 *
 * RULE: Notifications are always NON-BLOCKING.
 * A notification failure must NEVER break the main action.
 */

const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const SchoolSettings = require('../../tenancy').SchoolSettings;
const { getTransporter } = require('../lib/emailService');
const { getIo } = require('../../../core/realtime/socket');
const logger = require('../../../core/logging/logger');

// PHASE 3 HELPERS — internal, not exported

// Critical types that ALWAYS send regardless of any user or school preference
const CRITICAL_TYPES = new Set(['system']);

/**
 * Returns true if this notification is critical and must bypass preferences.
 * Critical rules:
 *   - type === 'system' (account changes, security)
 *   - type === 'fee' AND title/message mentions "Overdue"
 *   - type === 'attendance' AND title/message mentions "Low Attendance" or "75%"
 */
const isCriticalNotification = (type, title = '', message = '') => {
  if (CRITICAL_TYPES.has(type)) return true;

  if (
    type === 'fee' &&
    (title.toLowerCase().includes('overdue') || message.toLowerCase().includes('overdue'))
  )
    return true;

  if (
    type === 'attendance' &&
    (title.toLowerCase().includes('low attendance') || message.includes('75%'))
  )
    return true;

  return false;
};

/**
 * Returns the effective preference for a user+school+type combination.
 * Resolution order (most specific wins):
 *   1. User-level preference document
 *   2. School-wide notificationSettings
 *   3. Default → all ON
 *
 * Never throws — on any error it returns the safe default (all ON).
 */
const getUserPreference = async (userId, schoolId, type) => {
  try {
    // 1. User-level preference
    const userPref = await NotificationPreference.findOne({
      userId,
      schoolId,
    }).lean();

    // 2. School-level setting
    const schoolSettings = await SchoolSettings.findOne({ schoolId })
      .select('notificationSettings')
      .lean();

    const schoolEmailEnabled = schoolSettings?.notificationSettings?.emailEnabled !== false;
    const schoolTypeEnabled = schoolSettings?.notificationSettings?.enabledTypes?.[type] !== false;

    // School has disabled this type entirely — nothing sends
    if (!schoolTypeEnabled) {
      return { inApp: false, email: false, emailMode: 'instant' };
    }

    // User has no preference document — use school defaults
    if (!userPref) {
      return {
        inApp: true,
        email: schoolEmailEnabled,
        emailMode: 'instant',
      };
    }

    const typePref = userPref.preferences?.[type];

    return {
      inApp: typePref?.inApp !== false,
      email: typePref?.email !== false && schoolEmailEnabled,
      emailMode: userPref.emailMode || 'instant',
      quietHours: userPref.quietHours,
    };
  } catch (err) {
    // Preference check failed — default to sending (safe fallback)
    logger.warn('[notificationService] getUserPreference failed — defaulting to send', {
      userId: userId?.toString(),
      type,
      error: err.message,
    });
    return { inApp: true, email: true, emailMode: 'instant' };
  }
};

/**
 * Returns true if the current time falls within the user's quiet hours window.
 * Handles overnight windows (e.g. 22:00 – 07:00).
 */
const isInQuietHours = (quietHours) => {
  if (!quietHours?.enabled) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const start = quietHours.startTime || '22:00';
  const end = quietHours.endTime || '07:00';

  // Overnight window (start > end, e.g. 22:00 → 07:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }
  // Same-day window
  return currentTime >= start && currentTime < end;
};

/**
 * Adds an email payload to the digest queue so it can be sent at 6 PM.
 * Falls back silently on error.
 */
const addToDigestQueue = async (data) => {
  try {
    const { digestQueue } = require('../jobs/digestWorker');
    await digestQueue.add('collect', data, {
      removeOnComplete: false, // keep until scheduler processes them
      removeOnFail: false,
    });
  } catch (err) {
    logger.warn('[notificationService] Failed to add to digest queue', {
      error: err.message,
    });
  }
};

// FUNCTION 1: createInAppNotification
// Creates DB record + emits via socket.
// Phase 3: checks user preference before creating.
// Returns the saved notification or null (never throws).

exports.createInAppNotification = async ({
  userId,
  schoolId,
  type,
  title,
  message,
  link,
  metadata,
  triggeredBy,
  triggeredByName,
}) => {
  try {
    // Phase 3: Preference check
    // Skip check for critical notifications — they always create
    if (!isCriticalNotification(type, title, message)) {
      const pref = await getUserPreference(userId, schoolId, type);
      if (!pref.inApp) {
        // User opted out of in-app for this type — skip silently
        logger.info('[notificationService] In-app skipped — user preference', {
          userId: userId?.toString(),
          type,
        });
        return null;
      }
    }

    // Create the notification document
    const notification = await Notification.create({
      userId,
      schoolId,
      type,
      title,
      message,
      link: link || null,
      metadata: metadata || {},
      triggeredBy: triggeredBy || null,
      triggeredByName: triggeredByName || null,
    });

    // Emit real-time via Socket.io to user's personal room
    try {
      const io = getIo();
      if (io) {
        io.to(`user:${userId.toString()}`).emit('notification:new', {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          metadata: notification.metadata,
          triggeredByName: notification.triggeredByName,
          isRead: false,
          createdAt: notification.createdAt,
        });
      }
    } catch (socketErr) {
      // Socket failure must NEVER break notification creation
      logger.warn('[notificationService] Socket emit failed', {
        userId: userId.toString(),
        error: socketErr.message,
      });
    }

    return notification;
  } catch (error) {
    logger.error('[notificationService] createInAppNotification failed', {
      userId: userId ? userId.toString() : 'unknown',
      type,
      error: error.message,
    });
    return null;
  }
};

// FUNCTION 2: sendEmailNotification
// Sends a single email. Returns true/false. Never throws.
// Phase 3: optional { userId, schoolId, type, title, message } for pref-checking.

exports.sendEmailNotification = async ({
  to,
  subject,
  html,
  // Optional Phase 3 context — used for preference checking only
  userId,
  schoolId,
  type,
  title,
  message,
}) => {
  try {
    if (!to || !subject || !html) {
      logger.warn('[notificationService] sendEmailNotification: missing required fields', {
        to,
        subject,
      });
      return false;
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('[notificationService] sendEmailNotification: SMTP not configured');
      return false;
    }

    // Phase 3: Preference check (only when context is provided)
    if (userId && schoolId && type) {
      const isCritical = isCriticalNotification(type, title || '', message || '');

      if (!isCritical) {
        const pref = await getUserPreference(userId, schoolId, type);

        // User opted out of email for this type
        if (!pref.email) {
          logger.info('[notificationService] Email skipped — user preference', {
            userId: userId?.toString(),
            type,
          });
          return true; // return true so caller doesn't retry
        }

        // Quiet hours check
        if (isInQuietHours(pref.quietHours)) {
          logger.info('[notificationService] Email skipped — quiet hours', {
            userId: userId?.toString(),
            type,
          });
          return true; // skipped — not an error
        }

        // Digest mode — queue instead of sending now
        if (pref.emailMode === 'digest') {
          await addToDigestQueue({
            userId: userId?.toString(),
            schoolId: schoolId?.toString(),
            type,
            to,
            subject,
            html,
          });
          logger.info('[notificationService] Email queued for digest', {
            userId: userId?.toString(),
            type,
          });
          return true;
        }
      }
    }

    // Send immediately
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    logger.error('[notificationService] sendEmailNotification failed', {
      to,
      subject,
      error: error.message,
    });
    return false;
  }
};

// FUNCTION 3: notifyMultipleUsers
// Create in-app notifications for multiple users at once.
// Uses Promise.allSettled — one failure won't stop others.

exports.notifyMultipleUsers = async (userIds, notificationData) => {
  if (!userIds || userIds.length === 0) return [];

  const results = await Promise.allSettled(
    userIds.map((userId) =>
      exports.createInAppNotification({
        ...notificationData,
        userId,
      })
    )
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    logger.warn(`[notificationService] notifyMultipleUsers: ${failed}/${userIds.length} failed`);
  }

  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
};

// FUNCTION 4: sendBulkEmails
// Send emails to multiple addresses.
// Uses Promise.allSettled — one failure never blocks others.

exports.sendBulkEmails = async (emailList) => {
  if (!emailList || emailList.length === 0) return;

  const results = await Promise.allSettled(
    emailList.map((emailData) => exports.sendEmailNotification(emailData))
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    logger.warn(`[notificationService] sendBulkEmails: ${failed}/${emailList.length} failed`);
  }
};
