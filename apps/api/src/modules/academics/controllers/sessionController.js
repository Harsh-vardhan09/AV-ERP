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

exports.updateSession = async (req, res, next) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;

    // Whitelist allowed fields — do not pass raw req.body
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (startDate !== undefined) updateFields.startDate = startDate;
    if (endDate !== undefined) updateFields.endDate = endDate;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const session = await sessionService.updateSession({
      id: req.params.id,
      schoolId: req.schoolId,
      updateFields,
    });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Session updated successfully',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

exports.copyClassesToSession = async (req, res, next) => {
  try {
    const { targetSession, classesCreated, classesSkipped, sectionsCreated } =
      await sessionService.copyClassesToSession({
        targetSessionId: req.params.id,
        fromSessionId: req.body.fromSessionId,
        schoolId: req.schoolId,
        copiedBy: req.user._id,
      });

    return res.status(200).json({
      success: true,
      message:
        `Copied ${classesCreated} class(es) and ${sectionsCreated} section(s) to session "${targetSession.name}". ${classesSkipped > 0 ? `${classesSkipped} class(es) already existed and were skipped.` : ''}`.trim(),
      data: { classesCreated, classesSkipped, sectionsCreated },
    });
  } catch (error) {
    next(error);
  }
};
