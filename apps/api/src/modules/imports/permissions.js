const ADMIN_ADMISSION = ['admin', 'admission'];

const permissions = {
  'imports.file.preview':        ADMIN_ADMISSION,
  'imports.file.start':          ADMIN_ADMISSION,
  'imports.log.status':          ADMIN_ADMISSION,
  'imports.log.errors':          ADMIN_ADMISSION,
  'imports.log.errorReport':     ADMIN_ADMISSION,
  'imports.log.history':         ADMIN_ADMISSION,
  'imports.profiles.list':       ADMIN_ADMISSION,
  'imports.profiles.save':       ADMIN_ADMISSION,
};

module.exports = permissions;
module.exports.ADMIN_ADMISSION = ADMIN_ADMISSION;
