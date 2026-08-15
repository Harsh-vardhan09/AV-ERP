// Transcribed from routes/index.js. The route file still does the enforcing;
// this map documents the surface for the module registry.
//
// Note the split: role decides who may REACH the marking endpoints, but who may
// mark a GIVEN section is a data question (ClassTeacherAssignment) answered in
// attendanceService.assertCanMark. A subject teacher passes the role guard and
// is then refused with a message naming the actual class teacher.
const MARKERS = ['teacher', 'admin', 'admission'];
const STAFF = ['teacher', 'admin', 'admission', 'exam_controller'];
const ADMIN_ONLY = ['admin', 'admission'];

const permissions = {
  'attendance.day.view': MARKERS,
  'attendance.day.mark': MARKERS,

  'attendance.sections.unassigned': ADMIN_ONLY,

  // Token-scoped: resolves to the caller's own profile, never a supplied id
  'attendance.me.view': ['student'],

  'attendance.student.view': STAFF,
};

module.exports = permissions;
module.exports.MARKERS = MARKERS;
module.exports.STAFF = STAFF;
