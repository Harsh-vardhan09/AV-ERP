// Transcribed from routes/assignmentRoutes.js as-is. That router applies varifyToken,
// schoolIsolation and checkModuleAccess('assignments') but NO role check, so every
// key is any-authenticated. Nothing reads this map yet.
const ANY_AUTHENTICATED = [];

const permissions = {
  'academics.assignments.create': ANY_AUTHENTICATED,
  'academics.assignments.listByTeacher': ANY_AUTHENTICATED,
  'academics.assignments.view': ANY_AUTHENTICATED,
  'academics.assignments.listExpired': ANY_AUTHENTICATED,
  'academics.assignments.listNotExpired': ANY_AUTHENTICATED,
  'academics.assignments.listBySubject': ANY_AUTHENTICATED,
  'academics.assignments.listSubjects': ANY_AUTHENTICATED,

  'academics.submissions.upload': ANY_AUTHENTICATED,
  'academics.submissions.listByAssignment': ANY_AUTHENTICATED,
  'academics.submissions.viewByStudent': ANY_AUTHENTICATED,
  'academics.submissions.countByStudent': ANY_AUTHENTICATED,
};

module.exports = permissions;
module.exports.ANY_AUTHENTICATED = ANY_AUTHENTICATED;
