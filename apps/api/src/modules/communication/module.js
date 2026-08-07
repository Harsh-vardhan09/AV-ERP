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
  order:          100,

  extraMounts: [
    {
      path:    '/api/v1/knowledgecenter',
      routes:  require('./routes/knowledgecenter'),
      auth:    'router',
      limiter: 'api',
      order:   110,
    },
    {
      path:    '/api/v1/chat',
      routes:  require('./routes/chatroutes'),
      auth:    'router',
      limiter: 'api',
      order:   120,
    },
    // Mounts on the BARE /api/v1 with a router-level varifyToken, so it answers 401
    // for every unauthenticated /api/v1/* request before any later mount is reached.
    // Position in app.js is load-bearing — do not move it.
    {
      path:    '/api/v1',
      routes:  require('./routes/complainBoxRoute'),
      auth:    'router',
      limiter: 'api',
      order:   130,
    },
    {
      path:    '/notice',
      routes:  require('./routes/noticeRoutes'),
      auth:    'router',
      limiter: 'api',
      order:   140,
    },
  ],

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
