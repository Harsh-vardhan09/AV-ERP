/**
 * validateObjectId.js — Middleware to validate MongoDB ObjectId params.
 *
 * Prevents invalid ObjectId values from reaching DB queries
 * (which would throw CastError instead of returning a clean 400).
 *
 * USAGE in routes:
 *   const validateObjectId = require('../middlewares/validateObjectId');
 *
 *   // Single param
 *   router.get('/session/:id', validateObjectId('id'), admin.updateSession);
 *
 *   // Multiple params
 *   router.get('/marks/:examId/:studentId', validateObjectId('examId', 'studentId'), ...);
 */
const mongoose = require('mongoose');

const validateObjectId = (...paramNames) => (req, res, next) => {
  for (const name of paramNames) {
    const id = req.params[name];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format for parameter: '${name}'. Must be a valid MongoDB ObjectId.`
      });
    }
  }
  next();
};

module.exports = validateObjectId;
