module.exports = {
  key:            'admissions',
  label:          'Admissions',
  description:    'Admission forms, templates, applicant registration and custom enquiry forms',
  defaultEnabled: true,
  canDisable:     true,
  // fee: registering a student fires assignFeeToStudent.
  // communication: the /application mount below is leave applications, and its
  // controller now lives in modules/communication
  dependsOn:      ['core', 'people', 'academics', 'fee', 'communication'],
  basePath:       '/api/v1/admission',

  extraMounts: [
    // Leave applications, not admissions — the router only serves /leaves and is
    // backed by the legacy leave_controller. It rode along with this migration;
    // it belongs to a future leave/HR module, not here.
    {
      path:    '/application',
      routes:  require('./routes/applicationRoutes'),
      auth:    'jwt',
      limiter: 'api',
    },
    // Mounted after complainBoxRoute (bare /api/v1) both before and after this
    // move, which is what keeps the public POST /:token/submit returning 401.
    // See the report — pre-existing, deliberately not fixed here.
    {
      path:    '/api/v1/custom-forms',
      routes:  require('./routes/customFormRoutes'),
      auth:    'jwt',
      limiter: 'api',
    },
    {
      path:    '/api/v1/admission-templates',
      routes:  require('./routes/admissionTemplateRoutes'),
      auth:    'jwt',
      limiter: 'api',
    },
  ],

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
