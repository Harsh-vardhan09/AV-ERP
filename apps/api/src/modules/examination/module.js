// 'examination' is not a key in @av-erp/shared — the module is structural, not toggleable.
// Its routes authorise by role (exam_controller), not by a module toggle.
module.exports = {
  key: 'examination',
  label: 'Examination',
  description: 'Exams, subject configs, marks, co-scholastic marks and the marks audit trail',
  defaultEnabled: true,
  canDisable: false,
  dependsOn: ['core', 'academics', 'people'],
  basePath: '/api/v1/exam-controller',

  // order 60 is load-bearing: this mounted ABOVE the bare /api/v1 complaint router
  // (order 130), which applies a router-level varifyToken to everything below it.
  order: 60,

  // 'router' means the loader adds no auth middleware — examControllerRoutes already
  // applies varifyToken + authorize('exam_controller') itself. Stacking authenticate
  // on top would re-run the user lookup on every request.
  auth: 'router',
  limiter: 'api',

  routes: require('./routes'),
  permissions: require('./permissions'),
  jobs: [],
  events: [],
};
