// Runs after authenticate on data-access routes; controllers spread req.schoolFilter
// into every query, so a missing schoolId must fail here rather than leak cross-tenant
exports.schoolIsolation = (req, res, next) => {
  if (!req.schoolId) {
    return res.status(403).json({
      success: false,
      message: 'No school context found. Please login again.'
    });
  }

  req.schoolFilter = { schoolId: req.schoolId };

  next();
};

// Platform-level routes (creating schools) authenticate by shared secret header,
// not by user account — there is no user yet when a school is created
exports.platformOwnerOnly = (req, res, next) => {
  const secret = req.headers['x-platform-secret'];
  if (!secret || secret !== process.env.PLATFORM_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Platform access denied.'
    });
  }
  next();
};
