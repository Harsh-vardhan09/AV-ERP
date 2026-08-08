// Public API of the reportcards module.
//
// Getters, not eager requires: the controllers pull in tenancy and notifications,
// which reach back here for ReportTemplate. Deferring to first access keeps that
// from becoming a cycle — a consumer loads only what it names.
module.exports = {
  // ReportCard — consumers: modules/fees/services/calculationService,
  // people/controllers/teacherController, seeds and tools
  get ReportCard() {
    return require('./models/ReportCard');
  },

  // ReportCardMark — consumers: modules/fees/services/calculationService, seeds and tools
  get ReportCardMark() {
    return require('./models/ReportCardMark');
  },

  // ReportTemplate — consumers: modules/documents/globalTemplateController,
  // modules/tenancy/superAdminController, people's adminController and
  // teacherController, seeds and the global-template migration
  get ReportTemplate() {
    return require('./models/ReportTemplate');
  },

  // TemplateParserService — consumers: core/pdf/htmlToPdf,
  // modules/documents/globalTemplateController, admissions/controllers/admissionTemplateController
  get TemplateParserService() {
    return require('./services/templateParserService');
  },

  // TemplateFieldExtractor — consumers: modules/documents/globalTemplateController,
  // modules/tenancy/superAdminController, admissions' admissionTemplateController and
  // teacherController
  get TemplateFieldExtractor() {
    return require('./services/templateFieldExtractor');
  },

  // buildStudentData — consumer: modules/documents/documentController
  get templateEngine() {
    return require('./lib/templateEngine');
  },

  // schemas — consumer: seeds/seedReportTemplates
  get templateSchemas() {
    return require('./templates/schemas');
  },
};
