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
};
