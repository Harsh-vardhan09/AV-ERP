module.exports = {
  key:            'communication',
  label:          'Communication',
  description:    'Chat, notices, complaints, knowledge centre and leave applications',
  defaultEnabled: true,
  canDisable:     true,
  dependsOn:      ['core', 'people'],

  // Reserved, nothing mounted there yet. All four routers below predate this module
  // and own their own top-level paths; see routes/index.js
  basePath:       '/api/v1/communication',

  extraMounts: [
    {
      path:    '/api/v1/knowledgecenter',
      routes:  require('./routes/knowledgecenter'),
      auth:    'jwt',
      limiter: 'api',
    },
    {
      path:    '/api/v1/chat',
      routes:  require('./routes/chatroutes'),
      auth:    'jwt',
      limiter: 'api',
    },
    // Mounts on the BARE /api/v1 with a router-level varifyToken, so it answers 401
    // for every unauthenticated /api/v1/* request before any later mount is reached.
    // Position in app.js is load-bearing — do not move it.
    {
      path:    '/api/v1',
      routes:  require('./routes/complainBoxRoute'),
      auth:    'jwt',
      limiter: 'api',
    },
    {
      path:    '/notice',
      routes:  require('./routes/noticeRoutes'),
      auth:    'jwt',
      limiter: 'api',
    },
  ],

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
