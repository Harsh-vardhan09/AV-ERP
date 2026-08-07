module.exports = {
  key:            'oases',
  label:          'OASES Evaluation',
  description:    'Answer sheet scanning, evaluator assignment, marking and result sheets',
  defaultEnabled: false,
  canDisable:     true,
  dependsOn:      ['core', 'examination'],
  basePath:       '/api/v1/oases',

  // OASES does not use the ERP role middleware. It has its own token check
  // (middlewares/auth.js) and its own role set (middlewares/role.js) — EVALUATOR,
  // HEAD_EVALUATOR, MODERATOR — stored on user.oasesRole, not user.role.
  auth:           'custom',

  routes:      require('./routes'),
  permissions: require('./permissions'),

  // pdfQueue is created by services/pdfQueue.js on demand, not registered here
  jobs:        [],
  events:      [],
};
