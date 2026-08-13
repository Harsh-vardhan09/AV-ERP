const Leave = require('../models/leave');
const ComplainBox = require('../models/ComplainBox');

// A student reading their own leave applications.
// schoolId is part of the filter, not a post-check — same reason as below
const listLeavesForUser = async (userId, schoolId) =>
  Leave.find({ appliedBy: userId, role: 'student', schoolId })
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

// schoolId is part of the filter, not a post-check — a complaint from another
// tenant must not be reachable by id
const listComplaintsForUser = async (userId, schoolId) =>
  ComplainBox.find({ complainBy: userId, schoolId }).sort({ createdAt: -1 });

module.exports = { listLeavesForUser, listComplaintsForUser };
