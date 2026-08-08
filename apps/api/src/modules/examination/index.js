// Getters, not eager requires: an eager barrel pulls the whole dependency tree in
// at import time, which is how the tenancy/identity/notifications cycle formed.

module.exports = {
  // consumers: oases, reportcards, tenancy/superAdminController, fees/calculationService,
  // plus the three src-old god-controllers and the seed/tool scripts
  get Exam() {
    return require('./models/Exam');
  },

  // consumers: oases, reportcards, src-old admin/teacher/student controllers
  get ExamSubjectConfig() {
    return require('./models/ExamSubjectConfig');
  },

  // consumers: oases, reportcards, src-old admin/teacher/student controllers
  get MarksModel() {
    return require('./models/MarksModel');
  },

  // consumers: src-old admin/teacher controllers. Write logic is the only real
  // audit trail in this system — read it, never rewrite it
  get MarksAuditLog() {
    return require('./models/MarksAuditLog');
  },

  // consumers: reportcards, src-old teacherController
  get CoScholasticMark() {
    return require('./models/CoScholasticMark');
  },

  // consumers: reportcards/{reportCardController,dynamicReportController},
  // src-old teacherController
  get marksReadinessService() {
    return require('./services/marksReadinessService');
  },

  // consumers: reportcards/services/dataAggregatorService
  get marksSourceService() {
    return require('./services/marksSourceService');
  },

  // consumers: reportcards/controllers/reportCardController
  get marksValidation() {
    return require('./lib/marksValidation');
  },
};
