const TeacherAttendance = require('../../../../src-old/models/TeacherAttendance');
const logger = require('../../../core/logging/logger.js');

/**
 * @param {string} schoolId
 * @param {Object} filters - date, teacherId, status
 * @param {number} page
 * @param {number} limit
 * @returns {Object} { docs, totalDocs, page, totalPages }
 */
const list = async (schoolId, filters = {}, page = 1, limit = 20) => {
  const query = { schoolId };
  if (filters.teacherId && filters.teacherId !== 'null') query.teacherId = filters.teacherId;
  if (filters.date) query.date = new Date(filters.date);
  if (filters.status) query.status = filters.status;
  if (filters.startDate && filters.endDate) {
    query.date = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
  }
  const skip = (page - 1) * limit;
  const [docs, totalDocs] = await Promise.all([
    TeacherAttendance.find(query)
      .populate('teacherId', 'firstName lastName employeeId department')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1 }).skip(skip).limit(limit).lean(),
    TeacherAttendance.countDocuments(query),
  ]);
  return { docs, totalDocs, page, totalPages: Math.ceil(totalDocs / limit) };
};

/**
 * @param {string} schoolId
 * @param {Object} data - teacherId, userId, date, status, leaveId, remarks
 * @param {string} markedByUserId
 * @returns {Object} Created attendance record
 */
const markSingle = async (schoolId, data, markedByUserId) => {
  if (!data.teacherId || !data.date || !data.status) {
    const error = new Error('teacherId, date, and status are required');
    error.statusCode = 400; throw error;
  }
  const existing = await TeacherAttendance.findOne({
    schoolId, teacherId: data.teacherId, date: new Date(data.date),
  }).lean();
  if (existing) {
    const error = new Error('Attendance already marked for this teacher on this date');
    error.statusCode = 400; throw error;
  }
  const record = await TeacherAttendance.create({
    schoolId, teacherId: data.teacherId, userId: data.userId,
    date: new Date(data.date), status: data.status,
    leaveId: data.leaveId || undefined, markedBy: markedByUserId,
    remarks: data.remarks || undefined,
  });
  return record;
};

/**
 * @param {string} schoolId
 * @param {Object} data - { date, records: [{ teacherId, userId, status, leaveId, remarks }] }
 * @param {string} markedByUserId
 * @returns {Object} { inserted, skipped }
 */
const markBulk = async (schoolId, data, markedByUserId) => {
  if (!data.date || !data.records || !Array.isArray(data.records)) {
    const error = new Error('date and records array are required');
    error.statusCode = 400; throw error;
  }
  const date = new Date(data.date);
  const existingRecords = await TeacherAttendance.find({
    schoolId, date,
    teacherId: { $in: data.records.map((r) => r.teacherId) },
  }).lean();
  const existingTeacherIds = new Set(existingRecords.map((r) => r.teacherId.toString()));

  const toInsert = [];
  const skipped = [];
  for (const record of data.records) {
    if (existingTeacherIds.has(record.teacherId.toString())) {
      skipped.push(record.teacherId);
      continue;
    }
    toInsert.push({
      schoolId, teacherId: record.teacherId, userId: record.userId,
      date, status: record.status, leaveId: record.leaveId || undefined,
      markedBy: markedByUserId, remarks: record.remarks || undefined,
    });
  }
  let inserted = [];
  if (toInsert.length > 0) {
    inserted = await TeacherAttendance.insertMany(toInsert);
  }
  return { inserted: inserted.length, skipped: skipped.length };
};

/**
 * @param {string} schoolId
 * @param {string} recordId
 * @param {Object} data - status, remarks
 * @param {string} markedByUserId
 * @returns {Object} Updated attendance record
 */
const edit = async (schoolId, recordId, data, markedByUserId) => {
  delete data.schoolId;
  delete data.teacherId;
  delete data.date;
  if (data.status) data.markedBy = markedByUserId;

  const record = await TeacherAttendance.findOneAndUpdate(
    { _id: recordId, schoolId },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!record) {
    const error = new Error('Attendance record not found');
    error.statusCode = 404; throw error;
  }
  return record;
};

/**
 * @param {string} schoolId
 * @param {Object} query - month (1-12), year
 * @returns {Array} Monthly summary per teacher
 */
const getMonthlySummary = async (schoolId, query = {}) => {
  const month = parseInt(query.month);
  const year = parseInt(query.year);
  if (!month || !year) {
    const error = new Error('month and year query params are required');
    error.statusCode = 400; throw error;
  }
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const summary = await TeacherAttendance.aggregate([
    { $match: { schoolId: new (require('mongoose').Types.ObjectId)(schoolId), date: { $gte: startDate, $lte: endDate } } },
    { $group: {
      _id: '$teacherId',
      present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
      absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
      halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
      onLeave: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } },
      holiday: { $sum: { $cond: [{ $eq: ['$status', 'holiday'] }, 1, 0] } },
      weeklyOff: { $sum: { $cond: [{ $eq: ['$status', 'weekly_off'] }, 1, 0] } },
      totalRecords: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);

  return summary;
};

/**
 * @param {string} schoolId
 * @param {string} userId
 * @param {Object} query - month, year
 * @returns {Object} Own monthly summary
 */
const getMyMonthlySummary = async (schoolId, userId, query = {}) => {
  const month = parseInt(query.month);
  const year = parseInt(query.year);
  if (!month || !year) {
    const error = new Error('month and year query params are required');
    error.statusCode = 400; throw error;
  }
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const records = await TeacherAttendance.find({
    schoolId, userId, date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 }).lean();

  const summary = {
    present: 0, absent: 0, halfDay: 0, onLeave: 0, holiday: 0, weeklyOff: 0, total: records.length,
  };
  for (const r of records) {
    if (r.status === 'present') summary.present++;
    else if (r.status === 'absent') summary.absent++;
    else if (r.status === 'half_day') summary.halfDay++;
    else if (r.status === 'on_leave') summary.onLeave++;
    else if (r.status === 'holiday') summary.holiday++;
    else if (r.status === 'weekly_off') summary.weeklyOff++;
  }
  return { summary, records };
};

/**
 * Auto-mark all active teachers as present for an entire month (excluding weekends)
 * @param {string} schoolId
 * @param {Object} data - month, year
 * @param {string} markedByUserId
 */
const autoMarkMonthly = async (schoolId, data, markedByUserId) => {
  const month = parseInt(data.month);
  const year = parseInt(data.year);
  if (!month || !year) {
    const error = new Error('month and year are required');
    error.statusCode = 400; throw error;
  }

  const TeacherProfile = require('../../../../src-old/models/TeacherProfile');
  const activeTeachers = await TeacherProfile.find({ schoolId, status: 'active' }).lean();
  
  if (activeTeachers.length === 0) return { inserted: 0, message: 'No active teachers found' };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const toInsert = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    // Skip Sundays (0)
    if (day === 0) continue;

    const dateStr = d.toISOString().split('T')[0];
    const dateObj = new Date(dateStr);

    for (const teacher of activeTeachers) {
      toInsert.push({
        schoolId,
        teacherId: teacher._id,
        userId: teacher.userId,
        date: dateObj,
        status: 'present',
        markedBy: markedByUserId,
        remarks: 'Auto-marked by system during payroll initiation'
      });
    }
  }

  // Use insertMany with ordered: false to skip duplicates
  const result = await TeacherAttendance.insertMany(toInsert, { ordered: false }).catch(err => {
    // If it's a bulkWriteError (likely due to duplicates), we ignore it
    return { insertedCount: err.result?.nInserted || 0 };
  });

  return { 
    inserted: result.insertedCount || result.length, 
    message: 'Auto-marking complete. Sunday(s) were skipped.' 
  };
};

module.exports = { list, markSingle, markBulk, edit, getMonthlySummary, getMyMonthlySummary, autoMarkMonthly };
