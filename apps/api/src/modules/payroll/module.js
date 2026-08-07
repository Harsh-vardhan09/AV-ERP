module.exports = {
  key:            'payroll',
  label:          'Payroll',
  description:    'Salary structures, payroll runs, payslips, tax config and bank files',
  defaultEnabled: true,
  canDisable:     true,
  dependsOn:      ['core', 'people'],
  basePath:       '/api/v1/payroll',

  // Unlike every other module, auth sits OUTSIDE the router: app.js applies
  // varifyToken before mounting these routes, and payrollRoutes deliberately adds
  // none. Moving it inside would double-verify; removing it from app.js would
  // expose the whole module.
  auth:           'jwt-at-mount',

  routes:      require('./routes'),
  permissions: require('./permissions'),

  jobs: [
    require.resolve('./jobs/payrollWorker'),
    require.resolve('./jobs/pdfWorker'),
  ],

  events: [],
};
