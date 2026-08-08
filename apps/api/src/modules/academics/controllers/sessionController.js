const sessionService = require('../services/sessionService');

exports.createSession = async (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;
    const session = await sessionService.createSession({
      name,
      startDate,
      endDate,
      isActive,
      schoolId: req.schoolId,
    });
    res.status(201).json({ success: true, message: 'Session created', data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
