/**
 * notificationController.js — CRUD API for user notifications.
 *
 * All routes require varifyToken + schoolIsolation middleware.
 * Every query is scoped to { userId, schoolId } for multi-tenancy.
 */

const Notification = require('../models/Notification');
const logger = require('../../../core/logging/logger');

// GET /api/v1/notifications
// Query params: page, limit, type, isRead
exports.getNotifications = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;
    const userId = req.user._id;
    const { page = 1, limit = 20, type, isRead } = req.query;

    const filter = { userId, schoolId };
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/notifications/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      schoolId: req.schoolId,
      isRead: false,
    });
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        schoolId: req.schoolId,
      },
      { isRead: true, readAt: new Date() }
    );
    return res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        userId: req.user._id,
        schoolId: req.schoolId,
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
      schoolId: req.schoolId,
    });
    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/notifications/clear-all
exports.clearAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({
      userId: req.user._id,
      schoolId: req.schoolId,
    });
    return res.status(200).json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    next(error);
  }
};
