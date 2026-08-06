const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../../core/security/authenticate');
const School = require('../models/School');
const logger = require('../../../core/logging/logger');

/**
 * GET /api/v1/school/me
 * Returns the school info for the currently logged-in user's school.
 * Protected — requires a valid user JWT (any role).
 */
router.get('/me', varifyToken, async (req, res) => {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated with this account.' });
    }

    const school = await School.findById(schoolId).select('name logoUrl code address phone email').lean();
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    res.json({ success: true, school });
  } catch (err) {
    logger.error('[GET /school/me]', err);
    res.status(500).json({ success: false, message: 'Server error fetching school info.' });
  }
});

module.exports = router;
