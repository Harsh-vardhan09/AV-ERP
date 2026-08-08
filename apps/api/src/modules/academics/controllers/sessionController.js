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

exports.getAllSessions = async (req, res, next) => {
  try {
    const sessions = await sessionService.listSessions({ schoolId: req.schoolId });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    return next(error);
  }
};

exports.getActiveSession = async (req, res) => {
  try {
    const session = await sessionService.findActiveSession({ schoolId: req.schoolId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No session found for this school. Please create one first.',
      });
    }

    res.status(200).json({ success: true, data: session, isFallback: !session.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
