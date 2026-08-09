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

exports.deleteSession = async (req, res, next) => {
  try {
    await sessionService.deleteSession({ sessionId: req.params.id, schoolId: req.schoolId });
    res.status(200).json({ success: true, message: 'Session deleted' });
  } catch (error) {
    return next(error);
  }
};

exports.syncStudentSessions = async (req, res, next) => {
  try {
    const { targetSession, fixedCount, nothingToFix } = await sessionService.syncStudentSessions({
      targetSessionId: req.params.id,
      schoolId: req.schoolId,
      syncedBy: req.user._id,
    });

    if (nothingToFix) {
      return res.status(200).json({
        success: true,
        message: 'All students already have the correct session. Nothing to fix.',
        data: { fixedCount: 0 },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} student(s) — their session has been updated to "${targetSession.name}".`,
      data: { fixedCount },
    });
  } catch (error) {
    next(error);
  }
};

exports.copySubjectMapsToSession = async (req, res, next) => {
  try {
    const { copied, skipped, total, empty } = await sessionService.copySubjectMapsToSession({
      targetSessionId: req.params.id,
      fromSessionId: req.body.fromSessionId,
      schoolId: req.schoolId,
    });

    if (empty) {
      return res.status(200).json({
        success: true,
        message: 'No subject mappings found in previous session.',
        data: { copied: 0, skipped: 0, total: 0 },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Subject mappings: ${copied} copied, ${skipped} already existed or skipped.`,
      data: { copied, skipped, total },
    });
  } catch (error) {
    next(error);
  }
};

exports.copyTeacherAssignmentsToSession = async (req, res, next) => {
  try {
    const { teacherSubjectCopied, teacherSubjectSkipped, classTeacherCopied, classTeacherSkipped } =
      await sessionService.copyTeacherAssignmentsToSession({
        targetSessionId: req.params.id,
        fromSessionId: req.body.fromSessionId,
        schoolId: req.schoolId,
      });

    return res.status(200).json({
      success: true,
      message: `Teacher assignments copied. Subject assignments: ${teacherSubjectCopied} copied. Class teachers: ${classTeacherCopied} copied.`,
      data: {
        teacherSubjectAssignments: {
          copied: teacherSubjectCopied,
          skipped: teacherSubjectSkipped,
        },
        classTeacherAssignments: { copied: classTeacherCopied, skipped: classTeacherSkipped },
      },
    });
  } catch (error) {
    next(error);
  }
};
