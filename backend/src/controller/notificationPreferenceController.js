/**
 * notificationPreferenceController.js — Phase 3
 *
 * Routes:
 *   GET    /my        — get current user's preferences
 *   PATCH  /my        — update preference(s) for current user
 *   DELETE /my        — reset all preferences to default (delete document)
 *
 *   GET    /school                — admin: get school-wide notification settings
 *   PATCH  /school                — admin: update school-wide settings
 *   GET    /school/history        — admin: last-30-days notification history
 *   POST   /school/announcement   — admin: send bulk announcement
 */

const NotificationPreference                     = require('../models/NotificationPreference');
const SchoolSettings                             = require('../models/SchoolSettings');
const Notification                               = require('../models/Notification');
const School                                     = require('../models/School');
// User model uses NAMED export: { User }
const { User }                                   = require('../models/user');
const { notifyMultipleUsers, sendBulkEmails }    = require('../services/notificationService');
const logger                                     = require('../utils/logger');

const VALID_TYPES = [
  'attendance', 'marks', 'fee', 'leave', 'assignment',
  'notice', 'complaint', 'system', 'announcement',
];

// email for these types cannot be disabled by the user
const FORCED_EMAIL_TYPES = ['system'];

// Default preference shape returned when no document exists yet
const buildDefaults = () => {
  const defaults = {};
  for (const type of VALID_TYPES) {
    defaults[type] = { inApp: true, email: true };
  }
  return defaults;
};

// ── GET /my ───────────────────────────────────────────────────────────────────
exports.getMyPreferences = async (req, res, next) => {
  try {
    const userId   = req.user._id;
    const schoolId = req.schoolId;

    const pref = await NotificationPreference.findOne({
      userId, schoolId,
    }).lean();

    if (!pref) {
      return res.status(200).json({
        success: true,
        data: {
          preferences: buildDefaults(),
          emailMode:   'instant',
          quietHours:  { enabled: false, startTime: '22:00', endTime: '07:00' },
          isDefault:   true, // signals frontend to show "using default settings"
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        preferences: pref.preferences,
        emailMode:   pref.emailMode,
        quietHours:  pref.quietHours,
        isDefault:   false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /my ─────────────────────────────────────────────────────────────────
exports.updateMyPreferences = async (req, res, next) => {
  try {
    const userId   = req.user._id;
    const schoolId = req.schoolId;

    const {
      type,       // specific notification type to update
      inApp,      // boolean
      email,      // boolean
      emailMode,  // 'instant' | 'digest'
      quietHours, // { enabled, startTime, endTime }
    } = req.body;

    const updateObj = {};

    // ── Per-type update ──────────────────────────────────────────────────────
    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Valid types: ${VALID_TYPES.join(', ')}`,
        });
      }

      // Prevent disabling forced email types
      if (FORCED_EMAIL_TYPES.includes(type) && email === false) {
        return res.status(400).json({
          success: false,
          message: `Email notifications for '${type}' cannot be disabled — they are required for account security.`,
        });
      }

      if (typeof inApp === 'boolean') {
        updateObj[`preferences.${type}.inApp`] = inApp;
      }
      if (typeof email === 'boolean') {
        updateObj[`preferences.${type}.email`] = email;
      }
    }

    // ── Email mode update ────────────────────────────────────────────────────
    if (emailMode && ['instant', 'digest'].includes(emailMode)) {
      updateObj.emailMode = emailMode;
    }

    // ── Quiet hours update ───────────────────────────────────────────────────
    if (quietHours && typeof quietHours === 'object') {
      if (typeof quietHours.enabled === 'boolean') {
        updateObj['quietHours.enabled'] = quietHours.enabled;
      }
      if (quietHours.startTime) {
        updateObj['quietHours.startTime'] = quietHours.startTime;
      }
      if (quietHours.endTime) {
        updateObj['quietHours.endTime'] = quietHours.endTime;
      }
    }

    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update.',
      });
    }

    // Upsert — create preference document if it does not exist yet
    const updated = await NotificationPreference.findOneAndUpdate(
      { userId, schoolId },
      { $set: updateObj },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Preferences updated',
      data: {
        preferences: updated.preferences,
        emailMode:   updated.emailMode,
        quietHours:  updated.quietHours,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /my ────────────────────────────────────────────────────────────────
exports.resetMyPreferences = async (req, res, next) => {
  try {
    await NotificationPreference.findOneAndDelete({
      userId:   req.user._id,
      schoolId: req.schoolId,
    });

    return res.status(200).json({
      success: true,
      message: 'Preferences reset to defaults',
    });
  } catch (error) {
    next(error);
  }
};

// ── ADMIN GET /school ─────────────────────────────────────────────────────────
exports.getSchoolNotificationSettings = async (req, res, next) => {
  try {
    const settings = await SchoolSettings.findOne({
      schoolId: req.schoolId,
    })
      .select('notificationSettings')
      .lean();

    const defaultEnabledTypes = Object.fromEntries(
      VALID_TYPES.map((t) => [t, true])
    );

    return res.status(200).json({
      success: true,
      data: settings?.notificationSettings || {
        emailEnabled: true,
        enabledTypes: defaultEnabledTypes,
        digestTime:   '18:00',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── ADMIN PATCH /school ───────────────────────────────────────────────────────
exports.updateSchoolNotificationSettings = async (req, res, next) => {
  try {
    const { emailEnabled, enabledTypes, digestTime } = req.body;
    const updateObj = {};

    if (typeof emailEnabled === 'boolean') {
      updateObj['notificationSettings.emailEnabled'] = emailEnabled;
    }

    if (enabledTypes && typeof enabledTypes === 'object') {
      for (const [type, val] of Object.entries(enabledTypes)) {
        if (VALID_TYPES.includes(type) && typeof val === 'boolean') {
          updateObj[`notificationSettings.enabledTypes.${type}`] = val;
        }
      }
    }

    if (digestTime && /^\d{2}:\d{2}$/.test(digestTime)) {
      updateObj['notificationSettings.digestTime'] = digestTime;
    }

    await SchoolSettings.findOneAndUpdate(
      { schoolId: req.schoolId },
      { $set: updateObj },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'School notification settings updated',
    });
  } catch (error) {
    next(error);
  }
};

// ── ADMIN GET /school/history ─────────────────────────────────────────────────
exports.getNotificationHistory = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filter = {
      schoolId:  req.schoolId,
      createdAt: { $gte: thirtyDaysAgo },
    };
    if (type) filter.type = type;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('userId', 'firstName lastName role')
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page:       Number(page),
          limit:      Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── ADMIN POST /school/announcement ──────────────────────────────────────────
exports.sendBulkAnnouncement = async (req, res, next) => {
  try {
    const { title, message, targetRoles, sendEmail } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'title and message are required',
      });
    }

    const roles = targetRoles || ['student', 'teacher'];

    const users = await User.find({
      schoolId: req.schoolId,
      role:     { $in: roles },
      isActive: true,
    })
      .select('_id email firstName lastName')
      .lean();

    const userIds = users.map((u) => u._id);

    // In-app notification to all targets
    await notifyMultipleUsers(userIds, {
      schoolId:        req.schoolId,
      type:            'announcement',
      title,
      message,
      link:            null,
      triggeredBy:     req.user._id,
      triggeredByName: `${req.user.firstName} ${req.user.lastName}`,
    });

    // Email if requested
    if (sendEmail) {
      const school     = await School.findById(req.schoolId).select('name').lean();
      const schoolName = school?.name || 'School';
      const loginUrl   =
        process.env.CLIENT_URL || 'https://campus-nexus.nexisparkx.com';

      const emailList = users.map((user) => ({
        to:      user.email,
        subject: `${title} | ${schoolName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#4F46E5;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
              <h2 style="color:#fff;margin:0;">${schoolName}</h2>
              <p style="color:#C7D2FE;margin:5px 0 0;font-size:13px;">Announcement</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #E5E7EB;
                        border-top:none;border-radius:0 0 8px 8px;">
              <h3 style="color:#111827;font-size:16px;margin:0 0 12px;">${title}</h3>
              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">${message}</p>
              <div style="text-align:center;">
                <a href="${loginUrl}" style="background:#4F46E5;color:#fff;padding:10px 24px;
                   border-radius:6px;text-decoration:none;font-size:14px;
                   font-weight:600;display:inline-block;">
                  Open Portal
                </a>
              </div>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;">
              <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
                ${schoolName} &mdash; Do not reply to this email.
              </p>
            </div>
          </div>
        `,
      }));

      await sendBulkEmails(emailList);
    }

    logger.info('[Admin] Bulk announcement sent', {
      schoolId:  req.schoolId,
      count:     userIds.length,
      roles,
      sentEmail: !!sendEmail,
    });

    return res.status(200).json({
      success: true,
      message: `Announcement sent to ${userIds.length} users`,
      data:    { count: userIds.length, emailSent: !!sendEmail },
    });
  } catch (error) {
    next(error);
  }
};
