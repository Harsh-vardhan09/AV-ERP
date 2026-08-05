const jwt = require("jsonwebtoken");
const SuperAdmin = require("../../../src-old/models/SuperAdmin");

/**
 * verifySuperAdmin middleware
 *
 * Reads "superAdminToken" cookie (NOT "token" — that belongs to school users).
 * Verifies against SUPER_ADMIN_JWT_SECRET (NOT JWT_SECRET).
 * Attaches req.superAdmin — does NOT set req.user, req.schoolId, req.schoolFilter.
 *
 * Usage:
 *   router.get('/schools', verifySuperAdmin, ctrl.getAllSchools)
 */
exports.verifySuperAdmin = async (req, res, next) => {
  try {
    // Read from superAdminToken cookie OR Authorization Bearer header
    // DO NOT read req.cookies.token — that is exclusively for school users
    const token =
      req.cookies.superAdminToken ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    console.log("Origin:", req.headers.origin);
    console.log("Cookie header:", req.headers.cookie);
    console.log("Cookies:", req.cookies);
    console.log("Host:", req.headers.host);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Super admin access required. Please login.",
      });
    }

    // Verify with the super admin-specific secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired super admin session",
      });
    }

    // Fetch super admin from DB — exclude password
    const superAdmin = await SuperAdmin.findById(decoded.id).select(
      "-password",
    );

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: "Super admin account not found",
      });
    }

    if (!superAdmin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Super admin account has been deactivated",
      });
    }

    // Attach to request — explicitly NOT touching req.user / req.schoolId / req.schoolFilter
    req.superAdmin = superAdmin;

    next();
  } catch (error) {
    console.error("[superAdminAuth] Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
