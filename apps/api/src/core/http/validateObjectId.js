// Stops bad ids reaching the DB, where they throw CastError instead of a clean 400
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
