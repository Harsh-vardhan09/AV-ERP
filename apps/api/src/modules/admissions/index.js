// Public API of the admissions module.
//
// Getters, not eager requires: admissionController pulls in identity, tenancy and
// notifications, each of which can reach back here. Deferring to first access keeps
// a consumer loading only the file it names.
module.exports = {
  // AdmissionTemplate — consumer: modules/tenancy/superAdminController (authoring side)
  get AdmissionTemplate() {
    return require('./models/AdmissionTemplate');
  },

  get AdmissionFormSettings() {
    return require('./models/AdmissionFormSettings');
  },

  get admissionFieldRegistry() {
    return require('./services/admissionFieldRegistry');
  },

  get fieldMappingService() {
    return require('./services/fieldMappingService');
  },

  get admissionController() {
    return require('./controllers/admissionController');
  },
};
