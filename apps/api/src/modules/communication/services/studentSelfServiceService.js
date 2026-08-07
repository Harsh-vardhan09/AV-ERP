const Leave = require('../models/leave');
const ComplainBox = require('../models/ComplainBox');

// A student reading their own leave applications
const listLeavesForUser = async (userId) =>
  Leave.find({ appliedBy: userId, role: 'student' })
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

// schoolId is part of the filter, not a post-check — a complaint from another
// tenant must not be reachable by id
const listComplaintsForUser = async (userId, schoolId) =>
  ComplainBox.find({ complainBy: userId, schoolId }).sort({ createdAt: -1 });

module.exports = { listLeavesForUser, listComplaintsForUser };
