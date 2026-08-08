// Getters, not eager requires: an eager barrel pulls the whole dependency tree in
// at import time, which is how the tenancy/identity/notifications cycle formed.

module.exports = {
  // consumers: admissions, fees, imports, oases, people, reportcards, examination,
  // plus the three src-old god-controllers and the seed/tool scripts
  get AcademicSession() {
    return require('./models/AcademicSession');
  },

  // consumers: admissions, fees, imports, oases, people, reportcards
  get ClassModel() {
    return require('./models/ClassModel');
  },

  // consumers: admissions, imports, oases, people, reportcards
  get SectionModel() {
    return require('./models/SectionModel');
  },

  // consumers: imports, oases, reportcards, examination/marksReadinessService
  get SubjectMaster() {
    return require('./models/SubjectMaster');
  },

  // consumers: oases, reportcards, examination/marksReadinessService, src-old controllers
  get ClassSubjectMap() {
    return require('./models/ClassSubjectMap');
  },

  // consumers: people/teacherManagementController, src-old admin/teacher controllers
  get TeacherSubjectAssignment() {
    return require('./models/TeacherSubjectAssignment');
  },

  // consumers: people, reportcards, src-old admin/teacher/student controllers
  get ClassTeacherAssignment() {
    return require('./models/ClassTeacherAssignment');
  },

  // consumers: src-old admin/teacher/student controllers
  get Assignment() {
    return require('./models/assignment');
  },

  // consumers: src-old teacher/student controllers
  get Assignmentupload() {
    return require('./models/uploadassignment');
  },

  // sessionController — consumer: modules/people/routes/adminRoutes, which keeps
  // serving /api/v1/admin/session while the handlers move here
  get sessionController() {
    return require('./controllers/sessionController');
  },

  // classController — consumers: modules/people/routes/adminRoutes,
  // modules/examination/routes/examControllerRoutes
  get classController() {
    return require('./controllers/classController');
  },
};
