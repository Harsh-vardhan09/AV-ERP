// Public API of the communication module.
//
// Getters, not eager requires: the controllers pull in identity and tenancy, which
// can reach back here. Deferring to first access keeps a consumer loading only the
// file it names.
module.exports = {
  // Leave — consumers: src-old admin/student/teacher controllers, seeds/seedMaster,
  // the multitenancy migration
  get Leave() { return require('./models/leave'); },

  // Notice — consumers: src-old/controller/studentController, seeds/seedMaster
  get Notice() { return require('./models/notice'); },

  // Knowledgecenter — consumers: src-old admin/student/teacher controllers,
  // the backfill-school-id migration
  get Knowledgecenter() { return require('./models/knowledgecenter'); },

  // ComplainBox — consumer: src-old/controller/studentController
  get ComplainBox() { return require('./models/ComplainBox'); },

  // leaveController — consumer: modules/admissions/routes/applicationRoutes
  // (the /application mount is leave applications, not admissions)
  get leaveController() { return require('./controllers/leave_controller'); },

  // studentRepo — consumer: src-old/controller/eventController, which stays behind
  // pending the events decision (docs/events-decision.md)
  get studentRepo() { return require('./repositories/student-repo'); },
};
