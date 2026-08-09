const complainBox = require('../models/ComplainBox');
const { User } = require('../../identity');
// Property access, not destructuring — people/index.js defers StudentProfile behind
// a getter to avoid pulling academics models in at boot
const people = require('../../people');
const logger = require('../../../core/logging/logger.js');

// getcomplains.js bound the same model to `complains`. Aliased rather than renamed
// so getAllComplains' body stays byte-identical to the file it came from.
const complains = complainBox;

// The submitter is taken from the JWT, never from the URL param — the param used to
// carry a hardcoded ObjectId, so every complaint was filed against the same student
async function submitterFields(req) {
  const profile = await people.StudentProfile.findOne({
    userId: req.user._id,
    schoolId: req.schoolId,
  })
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .lean();

  const name =
    [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.name || '';

  return {
    complainBy: String(req.user._id),
    userId: req.user._id,
    studentId: profile?._id,
    classId: profile?.classId?._id,
    sectionId: profile?.sectionId?._id,
    studentName: name,
    rollNo: profile?.rollNo,
    admissionNumber: profile?.admissionNumber,
    schoolId: req.schoolId,
  };
}

async function soloComplain(req, res) {
  if (!req.body) {
    return res.status(400).send('please provide data ');
  }
  const { category, description, status, suggestion } = req.body;

  const complain = await complainBox.create({
    ...(await submitterFields(req)),
    category,
    description,
    suggestion,
    status,
  });

  res.status(200).json(complain);
}

async function multiAllComplain(req, res) {
  const { info } = req.query;
  const result = JSON.parse(info);
  const { category, description, status, suggestion } = req.body;
  const students = await User.find({
    semester: result.semester,
    section: result.section,
    schoolId: req.schoolId,
  });
  const sentto = students.map((e) => {
    return { scholar_no: e.scholar_no, comments: '', status: 'pending' };
  });
  const complain = await complainBox.create({
    ...(await submitterFields(req)),
    category,
    description,
    suggestion,
    status,
    acceptedby: sentto,
  });
  return res.json({
    message: complain,
  });
}

async function multiSelectedComplain(req, res) {
  const { info } = req.query;
  const result = JSON.parse(info);
  const { category, description, status, suggestion, selectedStudents } = req.body;
  const students = [];
  for (let i in selectedStudents) {
    let values = await User.findOne({ scholar_no: selectedStudents[i], schoolId: req.schoolId });
    if (values) {
      students.push(values);
    }
  }

  const validateStudents = students.every((e) => {
    return e.semester == result.semester && e.section == result.section;
  });

  if (students.length === 0 || !validateStudents) {
    return res.status(404).json({ message: 'Please enter valid students' });
  }

  const sentto = selectedStudents.map((e) => {
    return { scholar_no: e, comments: '', status: 'pending' };
  });
  const complain = await complainBox.create({
    ...(await submitterFields(req)),
    category,
    description,
    suggestion,
    status,
    acceptedby: sentto,
  });

  return res.status(200).json(complain);
}

// Own complaints: scoped to the caller, so the :id param can no longer be swapped
// for another student's id to read their grievances
async function complainByMe(req, res) {
  try {
    const complaints = await complainBox
      .find({
        complainBy: String(req.user._id),
        ...req.schoolFilter,
      })
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ createdAt: -1 });
    res.status(201).send(complaints);
  } catch (error) {
    logger.error('Error retrieving complaints for student:', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
}

async function getAllComplains(req, res) {
  const allComplains = await complains
    .find({ ...req.schoolFilter })
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .sort({ createdAt: -1 });
  if (!allComplains) res.status(200).json({ message: 'no complains' });

  res.status(200).send(allComplains);
}

async function acceptedComplain(req, res) {
  const { id: scholarNo } = req.params;
  try {
    const complaints = await complainBox.find({
      acceptedby: { $elemMatch: { scholar_no: scholarNo, status: 'accepted' } },
      ...req.schoolFilter,
    });
    res.status(201).send(complaints);
  } catch (error) {
    logger.error('Error retrieving complaints for student:', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
}

async function complainForYou(req, res) {
  try {
    const { id: scholarNo } = req.params;
    const complaints = await complainBox.find({
      acceptedby: { $elemMatch: { scholar_no: scholarNo, status: 'pending' } },
      ...req.schoolFilter,
    });
    res.status(201).send(complaints);
  } catch (error) {
    logger.error('Error retrieving complaints for student:', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
}

async function updateStatus(req, res) {
  const { id, status } = req.body;
  try {
    const update = await complainBox.findOneAndUpdate(
      { _id: id, ...req.schoolFilter },
      { status: status },
      { new: true }
    );
    if (!update) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.status(200).send(update);
  } catch (error) {
    logger.error('Error updating complaint status:', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
}

async function addSuggestion(req, res) {
  const { id, suggestion, scholar_no, status } = req.body;
  try {
    if (status === false || status === 'false') {
      const complain = await complainBox.findOneAndUpdate(
        { _id: id, 'acceptedby.scholar_no': scholar_no, ...req.schoolFilter },
        { 'acceptedby.$.status': 'rejected' }
      );
      res.send(complain);
    } else {
      const complain = await complainBox.findOneAndUpdate(
        { _id: id, 'acceptedby.scholar_no': scholar_no, ...req.schoolFilter },
        { 'acceptedby.$.status': 'accepted', 'acceptedby.$.comments': suggestion }
      );
      res.send(complain);
    }
  } catch (error) {
    logger.error('Error adding suggestion:', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to add suggestion' });
  }
}

module.exports = {
  soloComplain,
  multiAllComplain,
  multiSelectedComplain,
  complainByMe,
  getAllComplains,
  acceptedComplain,
  complainForYou,
  updateStatus,
  addSuggestion,
};
