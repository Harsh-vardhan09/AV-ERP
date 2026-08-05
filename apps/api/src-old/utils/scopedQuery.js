/**
 * scopedQuery.js — Reusable schoolId-scoped Mongoose query helpers.
 *
 * WHY:  Prevent cross-tenant data access by ensuring every document
 *       lookup also filters on schoolId. Direct `findById` calls can
 *       return documents belonging to another school.
 *
 * USAGE in controllers:
 *   const { scopedFindById, scopedFindByIdAndUpdate, scopedFindByIdAndDelete } = require('../utils/scopedQuery');
 *
 *   // Instead of: Model.findById(id)
 *   const doc = await scopedFindById(Model, id, req.schoolId);
 *
 *   // Instead of: Model.findByIdAndUpdate(id, data, opts)
 *   const doc = await scopedFindByIdAndUpdate(Model, id, req.schoolId, data, opts);
 *
 *   // Instead of: Model.findByIdAndDelete(id)
 *   const doc = await scopedFindByIdAndDelete(Model, id, req.schoolId);
 */

const mongoose = require('mongoose');

/**
 * Validate and cast id to ObjectId. Returns null if invalid.
 * Use this before any query to fail fast.
 */
const toObjectId = (id) => {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
};

/**
 * findOne scoped by schoolId (replaces findById for data-isolation-sensitive lookups).
 * @param {Model}  Model    - Mongoose model
 * @param {string} id       - Document _id
 * @param {string} schoolId - req.schoolId
 * @param {object} [projection]
 * @param {object} [options]
 */
const scopedFindById = (Model, id, schoolId, projection = null, options = {}) => {
  return Model.findOne({ _id: id, schoolId }, projection, options);
};

/**
 * findOneAndUpdate scoped by schoolId (replaces findByIdAndUpdate).
 * @param {Model}  Model    - Mongoose model
 * @param {string} id       - Document _id
 * @param {string} schoolId - req.schoolId
 * @param {object} update   - Update payload
 * @param {object} [options]
 */
const scopedFindByIdAndUpdate = (Model, id, schoolId, update, options = { new: true }) => {
  return Model.findOneAndUpdate({ _id: id, schoolId }, update, options);
};

/**
 * findOneAndDelete scoped by schoolId (replaces findByIdAndDelete).
 * @param {Model}  Model    - Mongoose model
 * @param {string} id       - Document _id
 * @param {string} schoolId - req.schoolId
 */
const scopedFindByIdAndDelete = (Model, id, schoolId) => {
  return Model.findOneAndDelete({ _id: id, schoolId });
};

module.exports = {
  toObjectId,
  scopedFindById,
  scopedFindByIdAndUpdate,
  scopedFindByIdAndDelete,
};
