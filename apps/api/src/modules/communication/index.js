// Public API of the communication module.
//
// Getters, not eager requires: the controllers pull in identity and tenancy, which
// can reach back here. Deferring to first access keeps a consumer loading only the
// file it names.
module.exports = {
  // Leave — consumers: people's legacy admin/student/teacher controllers, seeds/seedMaster,
  // the multitenancy migration
  get Leave() {
    return require('./models/leave');
  },

  // Notice — consumers: people/controllers/studentController, seeds/seedMaster
  get Notice() {
    return require('./models/notice');
  },

  // Knowledgecenter — consumers: people's legacy admin/student/teacher controllers,
  // the backfill-school-id migration
  get Knowledgecenter() {
    return require('./models/knowledgecenter');
  },

  // ComplainBox — consumer: people/controllers/studentController
  get ComplainBox() {
    return require('./models/ComplainBox');
  },

  // leaveController — consumer: modules/admissions/routes/applicationRoutes
  // (the /application mount is leave applications, not admissions)
  get leaveController() {
    return require('./controllers/leave_controller');
  },

  // studentSelfServiceService — consumer: people/controllers/studentController
  // (getMyLeaves, getMyComplaints). It was imported there but never exported
  // here, so both handlers threw on undefined and answered 500.
  get studentSelfServiceService() {
    return require('./services/studentSelfServiceService');
  },
};
