const ClassModel = require('../models/ClassModel');
const SectionModel = require('../models/SectionModel');
const ClassSubjectMap = require('../models/ClassSubjectMap');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const ApiError = require('../../../core/http/ApiError');

const createClass = async ({ name, numericOrder, session, schoolId }) =>
  ClassModel.create({ name, numericOrder, session, schoolId });

const listClasses = async ({ schoolId, session }) => {
  const filter = { schoolId };
  if (session) filter.session = session;
  return ClassModel.find(filter).populate('session', 'name isActive').sort({ numericOrder: 1 });
};

// No session filter and returns every class for the school — the /all-classes
// dashboard click-through, distinct from listClasses
const listAllClasses = async ({ schoolId }) =>
  ClassModel.find({ schoolId }).populate('session', 'name isActive').sort({ numericOrder: 1 });

const updateClass = async ({ id, schoolId, update }) =>
  ClassModel.findOneAndUpdate({ _id: id, schoolId }, update, { new: true, runValidators: true });

const deleteClass = async ({ classId, schoolId }) => {
  // SECURITY: scope by schoolId
  const cls = await ClassModel.findOne({ _id: classId, schoolId });
  if (!cls) throw ApiError.notFound('Class not found');

  const [sectionCount, mappingCount, teacherAssignCount] = await Promise.all([
    SectionModel.countDocuments({ classId, schoolId }),
    ClassSubjectMap.countDocuments({ classId, schoolId }),
    TeacherSubjectAssignment.countDocuments({ classId, schoolId }),
  ]);

  const deps = [];
  if (sectionCount > 0) deps.push(`${sectionCount} section(s)`);
  if (mappingCount > 0) deps.push(`${mappingCount} subject mapping(s)`);
  if (teacherAssignCount > 0) deps.push(`${teacherAssignCount} teacher assignment(s)`);

  if (deps.length > 0) {
    throw ApiError.badRequest(
      `Cannot delete class. Dependencies: ${deps.join(', ')}. Remove them first.`
    );
  }

  await ClassModel.findOneAndDelete({ _id: classId, schoolId });
};

module.exports = { createClass, listClasses, listAllClasses, updateClass, deleteClass };
