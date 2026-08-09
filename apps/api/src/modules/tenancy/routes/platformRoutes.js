const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const School = require('../models/School');
const { User } = require('../../identity');
const SchoolSettings = require('../models/SchoolSettings');
const { platformOwnerOnly } = require('../../../core/security/tenantScope');
const logger = require('../../../core/logging/logger');

// All routes protected by platform secret
router.use(platformOwnerOnly);

// CREATE SCHOOL
// POST /api/platform/schools
// Body: { name, code, adminFirstName, adminLastName, adminEmail, adminPassword, address?, phone?, email? }
router.post('/schools', async (req, res) => {
  try {
    const { name, code, adminFirstName, adminLastName, adminEmail, adminPassword, address, phone, email } = req.body;

    if (!name || !code || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'name, code, adminFirstName, adminLastName, adminEmail, adminPassword are all required' });
    }

    // Create the school first to get its _id
    const school = await School.create({ name, code, address, phone, email });

    // Hash admin password
    const hashed = await bcrypt.hash(adminPassword, 12);

    // Create admin user scoped to this school
    const adminUser = await User.create({
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: hashed,
      role: 'admin',
      schoolId: school._id,
      isActive: true,
      isVerified: true,
      mustChangePassword: true  // force password change on first login
    });

    // Update school with admin reference
    school.adminUserId = adminUser._id;
    await school.save();

    // Create default SchoolSettings for this school
    await SchoolSettings.create({ schoolId: school._id });

    // Send admin credentials via email (non-blocking — school creation never fails due to email)
    try {
      const { sendAdminCredentials } = require('../../notifications').emailService;
      await sendAdminCredentials({
        to:           adminEmail,
        adminName:    `${adminFirstName} ${adminLastName}`,
        schoolName:   name,
        schoolCode:   code.toUpperCase().trim(),
        tempPassword: adminPassword,  // plain text — only time it is used
        loginUrl:     process.env.CLIENT_URL || 'https://campus.unifiedcampus.com'
      });
    } catch (emailErr) {
      logger.error('Admin credential email failed (platform route):', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `School "${name}" created successfully`,
      data: {
        school: { _id: school._id, name: school.name, code: school.code },
        admin: { _id: adminUser._id, email: adminUser.email, role: 'admin' },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({ success: false, message: `A school with this ${field || 'value'} already exists` });
    }
    logger.error('createSchool error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// LIST ALL SCHOOLS
router.get('/schools', async (req, res) => {
  try {
    const schools = await School.find()
      .populate('adminUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: schools });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// TOGGLE SCHOOL ACTIVE STATUS
router.patch('/schools/:id/status', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    school.isActive = !school.isActive;
    await school.save();

    return res.status(200).json({
      success: true,
      message: `School "${school.name}" is now ${school.isActive ? 'active' : 'inactive'}`,
      data: { isActive: school.isActive },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
