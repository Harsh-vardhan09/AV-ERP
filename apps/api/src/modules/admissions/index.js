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

  // AdmissionFormSettings — consumers: modules/tenancy/superAdminController,
  // seeds/seedHMHSS00022FormConfig
  get AdmissionFormSettings() {
    return require('./models/AdmissionFormSettings');
  },

  // admissionFieldRegistry — consumer: modules/reportcards/templateFieldExtractor
  get admissionFieldRegistry() {
    return require('./services/admissionFieldRegistry');
  },

  // fieldMappingService — consumer: modules/reportcards/templateParserService
  get fieldMappingService() {
    return require('./services/fieldMappingService');
  },

  // admissionController — consumer: people/routes/studentManagementRoutes
  get admissionController() {
    return require('./controllers/admissionController');
  },
};
