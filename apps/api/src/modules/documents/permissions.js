// Roles are transcribed from the route files as-is. Nothing reads this map yet —
// documentRoutes still uses its own inline requireAdmin guard
const ADMIN_ONLY = ['admin'];

// The global-template actions live on /api/super-admin/templates/*, guarded by
// verifySuperAdmin — a separate token, not a role on req.user
const SUPER_ADMIN = ['superadmin'];

const permissions = {
  'documents.templateConfig.library': ADMIN_ONLY,
  'documents.templateConfig.view':    ADMIN_ONLY,
  'documents.templateConfig.save':    ADMIN_ONLY,

  'documents.new.context':            ADMIN_ONLY,
  'documents.generated.create':       ADMIN_ONLY,
  'documents.generated.view':         ADMIN_ONLY,

  'documents.template.view':          ADMIN_ONLY,
  'documents.template.uploadImage':   ADMIN_ONLY,
  'documents.template.saveFields':    ADMIN_ONLY,
  'documents.template.saveLayout':    ADMIN_ONLY,
  'documents.template.delete':        ADMIN_ONLY,

  'documents.generate.fromTemplate':  ADMIN_ONLY,
  'documents.generate.bulk':          ADMIN_ONLY,
  'documents.certificate.downloadPdf': ADMIN_ONLY,

  'documents.document.view':          ADMIN_ONLY,
  'documents.document.create':        ADMIN_ONLY,
  'documents.document.update':        ADMIN_ONLY,
  'documents.document.lock':          ADMIN_ONLY,
  'documents.document.unlock':        ADMIN_ONLY,

  'documents.globalTemplate.extractFields': SUPER_ADMIN,
  'documents.globalTemplate.preview':       SUPER_ADMIN,
  'documents.globalTemplate.list':          SUPER_ADMIN,
  'documents.globalTemplate.create':        SUPER_ADMIN,
  'documents.globalTemplate.view':          SUPER_ADMIN,
  'documents.globalTemplate.update':        SUPER_ADMIN,
  'documents.globalTemplate.delete':        SUPER_ADMIN,
};

module.exports = permissions;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
module.exports.SUPER_ADMIN = SUPER_ADMIN;
