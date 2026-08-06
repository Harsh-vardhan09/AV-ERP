const NOTICE = require("../models/notice");
const logger = require('../../src/core/logging/logger.js');

// ── Phase 2: Notification imports ──────────────────────────────────────────
const { notifyMultipleUsers } = require('../../src/modules/notifications').notificationService;
const { noticePublishedTemplate } = require('../../src/modules/notifications').emailTemplates;
const { User } = require('../../src/modules/identity');

// Create a notice
const CreateNotice = async (req, res) => {
  try {
    const data = req.body;
    // SECURITY: Stamp schoolId on every new notice
    const notice = await NOTICE.create({ ...data, schoolId: req.schoolId });
    if (data.members) {
      const members = data.members;
      members.map((member) => { notice.member.push(member); });
    }
    notice.save();

    res.status(200).json({
      data: notice,
      message: "Notice Created"
    });

    // ── NOTIFICATION BLOCK — non-blocking ──────────────────────────────────
    ;(async () => {
      try {
        const schoolId = data.schoolId || notice.schoolId;
        if (!schoolId) return;

        const loginUrl = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
        const School = require('../../src/modules/tenancy').School;
        const school = await School.findById(schoolId).select('name').lean();
        const schoolName = school?.name || 'School';

        // Find all active users in this school to notify
        const targetRole = data.targetRole || data.forRole || null; // optional role filter on notice
        const userFilter = { schoolId, isActive: true };
        if (targetRole) userFilter.role = targetRole;

        const users = await User.find(userFilter).select('_id').lean();
        const userIds = users.map(u => u._id).filter(Boolean);
        if (userIds.length === 0) return;

        await notifyMultipleUsers(userIds, {
          schoolId,
          type:     'notice',
          title:    `New Notice — ${notice.title || 'Notice'}`,
          message:  notice.content
            ? `${String(notice.content).substring(0, 120)}${notice.content.length > 120 ? '...' : ''}`
            : 'A new notice has been published. Please check the notice board.',
          link:     '/student/notices',
          metadata: { noticeId: notice._id },
        });
      } catch (notifErr) {
        logger.warn('[Notif] Notice notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ────────────────────────────────────────────
  } catch (error) {
    console.log("error in creating notice : ", error);
  }
};

// GET All the notices — scoped to current school
const getNotice = async (req, res) => {
  try {
    const data = await NOTICE.find({ schoolId: req.schoolId });
    return res.status(200).json({
      data: data,
      message: "data Received",
    });
  } catch (error) {
    console.log("error in creation : ", error);
  }
};

// GET one particular notice
const getone = async (req, res) => {
  try {
    const id = req.params.id;
    // SECURITY: scope to current school to prevent cross-tenant access
    const data = await NOTICE.findOne({ _id: id, schoolId: req.schoolId });
    return res.status(200).json({
      data: data
    });
  } catch (error) {
    console.log("error in getone : ", error);
  }
};

const Delete = async (req, res) => {
  try {
    const id = req.params.id;
    // SECURITY: scope to current school to prevent cross-tenant deletion
    const data = await NOTICE.findOneAndDelete({ _id: id, schoolId: req.schoolId });
    return res.status(201).json({
      message: "Notice Deleted"
    });
  } catch (error) {
    console.log("error in deleting notice : ", error);
  }
};

const getphoto = async (req, res) => {
  const data = req.body;
  console.log(data);
  return res.json({
    message: "success"
  });
};

module.exports = {
  CreateNotice,
  getNotice,
  getone,
  Delete,
  getphoto,
};
