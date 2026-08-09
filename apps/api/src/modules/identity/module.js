// No 'identity' key in @av-erp/shared: authentication is not a toggleable
// feature, so these routes are not gated by checkModuleAccess
module.exports = {
  key:            'identity',
  label:          'Identity & Access',
  description:    'Login, signup, password reset, email verification, user activation',
  defaultEnabled: true,
  canDisable:     false,
  dependsOn:      ['core'],
  basePath:       '/api/v1/user',
  order:          10,

  // Login cannot require a token, so no router-wide authenticate — the few
  // protected routes apply varifyToken individually
  auth:    false,
  // Mounted with authLimiter (50/15min), not apiLimiter: these are the
  // credential-stuffing surface
  limiter: 'auth',

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
