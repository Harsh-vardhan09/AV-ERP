const SectionModel = require('../models/SectionModel');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const ApiError = require('../../../core/http/ApiError');

const createSection = async ({ name, classId, session, schoolId }) =>
  SectionModel.create({ name, classId, session, schoolId });

// Creates one at a time on purpose: a duplicate name must skip that section and
// carry on, which insertMany cannot report per-name
const createBulkSections = async ({ names, classId, session, schoolId }) => {
  const nameList = names
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (nameList.length === 0) {
    throw ApiError.badRequest('At least one section name is required');
  }

  const created = [];
  const errors = [];

  for (const name of nameList) {
    try {
      created.push(await SectionModel.create({ name, classId, session, schoolId }));
    } catch (err) {
      if (err.code === 11000) {
        errors.push(`"${name}" already exists`);
      } else {
        errors.push(`"${name}": ${err.message}`);
      }
    }
  }

  return { created, errors };
};

const listSections = async ({ schoolId, classId, session }) => {
  const filter = { schoolId };
  if (classId) filter.classId = classId;
  if (session) filter.session = session;
  return SectionModel.find(filter)
    .populate('classId', 'name numericOrder')
    .populate('session', 'name');
};

const updateSection = async ({ id, schoolId, update }) =>
  SectionModel.findOneAndUpdate({ _id: id, schoolId }, update, { new: true, runValidators: true });

const deleteSection = async ({ sectionId, schoolId }) => {
  // SECURITY: scope by schoolId
  const section = await SectionModel.findOne({ _id: sectionId, schoolId });
  if (!section) throw ApiError.notFound('Section not found');

  const { StudentProfile } = require('../../people');
  const [studentCount, teacherAssignCount, classTeacherCount] = await Promise.all([
    StudentProfile.countDocuments({ sectionId, schoolId }),
    TeacherSubjectAssignment.countDocuments({ sectionId, schoolId }),
    ClassTeacherAssignment.countDocuments({ sectionId, schoolId }),
  ]);

  const deps = [];
  if (studentCount > 0) deps.push(`${studentCount} student(s)`);
  if (teacherAssignCount > 0) deps.push(`${teacherAssignCount} teacher-subject assignment(s)`);
  if (classTeacherCount > 0) deps.push(`${classTeacherCount} class teacher assignment(s)`);

  if (deps.length > 0) {
    throw ApiError.badRequest(
      `Cannot delete section. Dependencies: ${deps.join(', ')}. Remove them first.`
    );
  }

  await SectionModel.findOneAndDelete({ _id: sectionId, schoolId });
};

module.exports = {
  createSection,
  createBulkSections,
  listSections,
  updateSection,
  deleteSection,
};
