const classService = require('../services/classService');

exports.createClass = async (req, res) => {
  try {
    const { name, numericOrder, session } = req.body;
    const cls = await classService.createClass({
      name,
      numericOrder,
      session,
      schoolId: req.schoolId,
    });
    res.status(201).json({ success: true, message: 'Class created', data: cls });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: 'This class already exists in this session' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await classService.listClasses({
      schoolId: req.schoolId,
      session: req.query.session,
    });
    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const cls = await classService.updateClass({
      id: req.params.id,
      schoolId: req.schoolId,
      update: req.body,
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, message: 'Class updated', data: cls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteClass = async (req, res, next) => {
  try {
    await classService.deleteClass({ classId: req.params.id, schoolId: req.schoolId });
    res.status(200).json({ success: true, message: 'Class deleted' });
  } catch (error) {
    return next(error);
  }
};

exports.getAllClassesAdmin = async (req, res) => {
  try {
    const classes = await classService.listAllClasses({ schoolId: req.schoolId });
    res.status(200).json({ success: true, data: classes, total: classes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
