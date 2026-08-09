// Tenancy owns the School/SchoolSettings/SuperAdmin models and the module registry
// that every other module's `key` is validated against (@av-erp/shared).
// No 'tenancy' key in that registry — multi-tenancy is not a toggleable feature.
module.exports = {
  key:            'tenancy',
  label:          'Tenancy & Platform',
  description:    'Schools, per-school module settings, super admin and platform onboarding',
  defaultEnabled: true,
  canDisable:     false,
  dependsOn:      ['core', 'identity'],
  basePath:       '/api/v1/school',
  order:          280,

  // Three mounts, three different auth models. superAdminAuth stays in core, so
  // these routers keep applying their own guards rather than inheriting one
  extraMounts: [
    {
      path:    '/api/super-admin',
      routes:  require('./routes/superAdminRoutes'),
      auth:    'superAdminToken',   // core/security/superAdminAuth, separate JWT secret
      limiter: 'api',
      order:   210,
    },
    {
      path:    '/api/platform',
      routes:  require('./routes/platformRoutes'),
      auth:    'platformSecret',    // X-Platform-Secret header, no JWT, no user
      limiter: null,                // deliberately unlimited before this move
      order:   220,
    },
  ],

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
