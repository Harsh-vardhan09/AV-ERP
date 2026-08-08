// Public API of the people module.
//
// Getters, not eager requires: StudentProfile pulls in academics models that reach
// back through other modules. Deferring to first access keeps a consumer loading
// only what it names.
module.exports = {
  // StudentProfile — consumers: modules/admissions, documents, fees, identity,
  // imports, library, oases, reportcards, and the src-old god-controllers
  get StudentProfile() {
    return require('./models/StudentProfile');
  },

  // TeacherProfile — consumers: modules/admissions, imports, payroll
  get TeacherProfile() {
    return require('./models/TeacherProfile');
  },

  // The two legacy god-controllers, consumed by
  // modules/examination/routes/examControllerRoutes. These exports disappear as
  // their functions are extracted — see docs/GOD-CONTROLLER-PLAN.md
  get adminController() {
    return require('./controllers/adminController');
  },
  get teacherController() {
    return require('./controllers/teacherController');
  },
};
