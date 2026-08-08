const sectionService = require('../services/sectionService');

exports.createSection = async (req, res) => {
  try {
    const { name, classId, session } = req.body;
    const section = await sectionService.createSection({
      name,
      classId,
      session,
      schoolId: req.schoolId,
    });
    res.status(201).json({ success: true, message: 'Section created', data: section });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: 'This section already exists in this class' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBulkSections = async (req, res) => {
  try {
    const { names, classId, session } = req.body;
    const { created, errors } = await sectionService.createBulkSections({
      names,
      classId,
      session,
      schoolId: req.schoolId,
    });

    const message =
      created.length > 0
        ? `${created.length} section(s) created${errors.length > 0 ? `. Skipped: ${errors.join(', ')}` : ''}`
        : `No sections created. ${errors.join(', ')}`;

    res.status(created.length > 0 ? 201 : 400).json({
      success: created.length > 0,
      message,
      data: created,
    });
  } catch (error) {
    // The empty-name-list guard throws ApiError(400); everything else keeps the
    // original blanket 500
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSections = async (req, res) => {
  try {
    const sections = await sectionService.listSections({
      schoolId: req.schoolId,
      classId: req.query.classId,
      session: req.query.session,
    });
    res.status(200).json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const section = await sectionService.updateSection({
      id: req.params.id,
      schoolId: req.schoolId,
      update: req.body,
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.status(200).json({ success: true, message: 'Section updated', data: section });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    await sectionService.deleteSection({ sectionId: req.params.id, schoolId: req.schoolId });
    res.status(200).json({ success: true, message: 'Section deleted' });
  } catch (error) {
    return next(error);
  }
};
