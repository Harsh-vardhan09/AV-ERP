module.exports = {
  key:            'report_cards',
  label:          'Report Cards',
  description:    'Report card generation, template-driven dynamic reports and PDF export',
  defaultEnabled: true,
  canDisable:     true,
  // admissions is not in the brief's list but the code needs it: templateParserService
  // and templateFieldExtractor read fieldMappingService / admissionFieldRegistry
  dependsOn:      ['core', 'examination', 'academics', 'admissions'],
  basePath:       '/api/v1/report-card',

  // Two sibling surfaces on their own top-level paths: the template engine that
  // supersedes the legacy generator, and the read-only template gallery
  extraMounts: [
    {
      path:    '/api/v1/dynamic-reports',
      routes:  require('./routes/dynamicReportRoutes'),
      auth:    'jwt',
      limiter: 'api',
    },
    {
      path:    '/api/v1/report-templates',
      routes:  require('./routes/reportTemplateRoutes'),
      auth:    'jwt',
      limiter: 'api',
    },
  ],

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
