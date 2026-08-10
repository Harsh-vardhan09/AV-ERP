const NOTICE = require('../models/notice');
const logger = require('../../../core/logging/logger.js');

const { notifyMultipleUsers } = require('../../notifications').notificationService;
const { User } = require('../../identity');

// An audience maps to the roles it notifies. 'all' keeps the original reach —
// every active user in the school — rather than narrowing to these two.
const AUDIENCE_ROLES = {
  students: ['student'],
  teachers: ['teacher'],
};

// Each role lands on the notice screen its own nav can reach; one shared link
// sent every recipient to the student route.
const NOTICE_LINKS = {
  student: '/student/notices',
  teacher: '/box',
};

// Create a notice
const CreateNotice = async (req, res) => {
  try {
    const { title, Body, category, audience, member } = req.body;

    if (!title || !Body || !category) {
      return res.status(400).json({
        success: false,
        message: 'title, Body and category are required',
      });
    }

    // SECURITY: Stamp schoolId on every new notice
    const notice = await NOTICE.create({
      title,
      Body,
      category,
      ...(audience ? { audience } : {}),
      ...(Array.isArray(member) ? { member } : {}),
      createdByID: req.user._id,
      schoolId: req.schoolId,
    });

    res.status(200).json({
      data: notice,
      message: 'Notice Created',
    });

    // NOTIFICATION BLOCK — non-blocking
    (async () => {
      try {
        const schoolId = notice.schoolId;
        if (!schoolId) return;

        const roles = AUDIENCE_ROLES[notice.audience];
        const userFilter = { schoolId, isActive: true };
        if (roles) userFilter.role = { $in: roles };

        const users = await User.find(userFilter).select('_id role').lean();
        if (users.length === 0) return;

        const body = String(notice.Body || '');
        const message = body
          ? `${body.substring(0, 120)}${body.length > 120 ? '...' : ''}`
          : 'A new notice has been published. Please check the notice board.';

        // One batch per role so each recipient gets a link they can actually open
        const byRole = users.reduce((acc, u) => {
          (acc[u.role] ||= []).push(u._id);
          return acc;
        }, {});

        for (const [role, userIds] of Object.entries(byRole)) {
          await notifyMultipleUsers(userIds, {
            schoolId,
            type: 'notice',
            title: `New Notice — ${notice.title || 'Notice'}`,
            message,
            link: NOTICE_LINKS[role] || '/box',
            metadata: { noticeId: notice._id },
          });
        }
      } catch (notifErr) {
        logger.warn('[Notif] Notice notification failed', { error: notifErr.message });
      }
    })();
  } catch (error) {
    logger.error('[Notice] create failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to create notice' });
  }
};

// GET All the notices — scoped to current school
const getNotice = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };
    if (req.query.audience) filter.audience = req.query.audience;

    const data = await NOTICE.find(filter)
      .populate('createdByID', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      data: data,
      message: 'data Received',
    });
  } catch (error) {
    logger.error('[Notice] list failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch notices' });
  }
};

// GET one particular notice
const getone = async (req, res) => {
  try {
    const id = req.params.id;
    // SECURITY: scope to current school to prevent cross-tenant access
    const data = await NOTICE.findOne({ _id: id, schoolId: req.schoolId });
    return res.status(200).json({
      data: data,
    });
  } catch (error) {
    logger.debug('error in getone : ', error);
  }
};

const Delete = async (req, res) => {
  try {
    const id = req.params.id;
    // SECURITY: scope to current school to prevent cross-tenant deletion
    const data = await NOTICE.findOneAndDelete({ _id: id, schoolId: req.schoolId });
    return res.status(201).json({
      message: 'Notice Deleted',
    });
  } catch (error) {
    logger.debug('error in deleting notice : ', error);
  }
};

const getphoto = async (req, res) => {
  const data = req.body;
  logger.debug(data);
  return res.json({
    message: 'success',
  });
};

module.exports = {
  CreateNotice,
  getNotice,
  getone,
  Delete,
  getphoto,
};
