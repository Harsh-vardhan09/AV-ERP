/**
 * Migration: map legacy OASES exam references to Exam._id.
 *
 * Strategy:
 * 1) Build mapping old OasesExamConfig -> Exam by (examName/name + schoolId + class + session/year hint)
 * 2) Update all OASES collections that store examConfigId to mapped Exam._id
 * 3) Keep old docs for backward compatibility (no destructive deletes here)
 *
 * Run:
 *   node src/scripts/migrateOasesExamRefsToExam.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const connect = require('../config/database');
const Exam = require('../models/Exam');
const ExamConfig = require('../models/oases/ExamConfig');
const AnswerSheet = require('../models/oases/AnswerSheet');
const EvaluatorAssignment = require('../models/oases/EvaluatorAssignment');
const EvaluationMark = require('../models/oases/EvaluationMark');
const QuestionScheme = require('../models/oases/QuestionScheme');
const ResultSheet = require('../models/oases/ResultSheet');
const AcademicSession = require('../models/AcademicSession');
const ClassModel = require('../models/ClassModel');

const normalize = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

const pickSessionIdFromYear = async (schoolId, academicYear) => {
  if (!academicYear) return null;
  const candidate = await AcademicSession.findOne({
    schoolId,
    name: { $regex: String(academicYear).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
  }).select('_id').lean();
  return candidate?._id || null;
};

const pickClassIdFromLevel = async (schoolId, classLevel, sessionId) => {
  if (!classLevel) return null;
  const classNo = String(classLevel).match(/\d+/)?.[0];
  if (!classNo) return null;
  const query = { schoolId, name: { $regex: `\\b${classNo}\\b` } };
  if (sessionId) query.session = sessionId;
  const cls = await ClassModel.findOne(query).select('_id').lean();
  return cls?._id || null;
};

const updateCollection = async (Model, map) => {
  let modified = 0;
  const docs = await Model.find({ examConfigId: { $in: [...map.keys()] } }).select('_id examConfigId');
  for (const d of docs) {
    const nextId = map.get(String(d.examConfigId));
    if (!nextId) continue;
    const res = await Model.updateOne({ _id: d._id }, { $set: { examConfigId: nextId, examId: nextId } });
    modified += res.modifiedCount || 0;
  }
  return modified;
};

const run = async () => {
  await connect();

  const legacyConfigs = await ExamConfig.find({}).lean();
  const examMap = new Map(); // legacyId -> examId
  let matched = 0;
  let unmatched = 0;

  for (const cfg of legacyConfigs) {
    const sessionId = await pickSessionIdFromYear(cfg.schoolId, cfg.academicYear);
    const classId = await pickClassIdFromLevel(cfg.schoolId, cfg.classLevel, sessionId);
    const nameNorm = normalize(cfg.examName);

    const q = {
      schoolId: cfg.schoolId,
      name: { $regex: `^${nameNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    };
    if (sessionId) q.session = sessionId;
    if (classId) q.classIds = classId;

    const exam = await Exam.findOne(q).select('_id').lean();
    if (!exam) {
      unmatched += 1;
      continue;
    }

    examMap.set(String(cfg._id), exam._id);
    matched += 1;
  }

  const [a, b, c, d, e] = await Promise.all([
    updateCollection(AnswerSheet, examMap),
    updateCollection(EvaluatorAssignment, examMap),
    updateCollection(EvaluationMark, examMap),
    updateCollection(QuestionScheme, examMap),
    updateCollection(ResultSheet, examMap),
  ]);

  console.log(JSON.stringify({
    legacyConfigs: legacyConfigs.length,
    matched,
    unmatched,
    updated: {
      answerSheets: a,
      evaluatorAssignments: b,
      evaluationMarks: c,
      questionSchemes: d,
      resultSheets: e,
    },
  }, null, 2));

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error('Migration failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});

