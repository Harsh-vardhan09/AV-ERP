/**
 * schoolIsolation middleware
 *
 * Applied AFTER varifyToken on all data-access routes.
 * Ensures req.schoolId is present and sets req.schoolFilter — a pre-built
 * Mongoose filter object that all controllers spread into their queries.
 *
 * Usage in controllers:
 *   Model.find({ ...req.schoolFilter, otherField: value })
 *   Model.create({ ...req.schoolFilter, ...fields })
 */
exports.schoolIsolation = (req, res, next) => {
  if (!req.schoolId) {
    return res.status(403).json({
      success: false,
      message: 'No school context found. Please login again.'
    });
  }

  // Pre-build the filter so controllers only have to spread it
  req.schoolFilter = { schoolId: req.schoolId };

  next();
};

/**
 * platformOwnerOnly middleware
 *
 * Protects platform-level routes (creating schools, etc.).
 * Checks for the PLATFORM_SECRET header — no user account needed.
 * Only the platform owner knows this secret.
 *
 * Usage: router.post('/schools', platformOwnerOnly, createSchool)
 */
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
