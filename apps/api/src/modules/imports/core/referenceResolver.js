/**
 * ReferenceResolver — Batch resolves name strings → MongoDB ObjectIds
 *
 * Uses real Mongoose models directly (no abstract service dependency).
 * All lookups are batched + cached to prevent N+1 DB queries.
 *
 * Resolution order (important — each depends on the previous):
 *   1. session   : AcademicSession.findOne({ name, schoolId })
 *   2. classId   : ClassModel.findOne({ name, session: sessionId, schoolId })
 *   3. sectionId : SectionModel.findOne({ name, classId, session: sessionId, schoolId })
 */

const logger = require('../../../core/logging/logger.js');

// Lazy-require real models (avoid circular deps at module load time)
const getModels = () => ({
  ClassModel:       require('../../../../src-old/models/ClassModel'),  // TEMP: moves to modules/academics
  SectionModel:     require('../../../../src-old/models/SectionModel'),  // TEMP: moves to modules/academics
  AcademicSession:  require('../../../../src-old/models/AcademicSession'),  // TEMP: moves to modules/academics
});

class ReferenceResolver {
  constructor(services = {}, config = {}) {
    // services kept for backward compat but we use models directly
    this.services     = services;
    this.config       = config;
    this.cache        = {};
    this.cacheEnabled = config.cacheEnabled !== false;
  }

  // PUBLIC: Resolve all references for a batch of rows

  /**
   * Main entry point — resolves all reference fields for all rows.
   * Returns { resolved: { refName: { rawValue: doc } }, missing: { refName: [values] } }
   */
  async resolveBatch(rows, referenceConfigs, schoolId) {
    const result = { resolved: {}, missing: {}, cacheHits: 0, cacheMisses: 0 };

    for (const [refName, refConfig] of Object.entries(referenceConfigs)) {
      const values = [...new Set(rows.map(r => r[refConfig.sourceField]).filter(Boolean))];
      if (values.length === 0) { result.resolved[refName] = {}; continue; }

      const resolved = await this.batchResolveReferences(refName, values, refConfig, schoolId);
      result.resolved[refName] = resolved;
      result.missing[refName]  = values.filter(v => !resolved[v]);
    }

    return result;
  }

  /**
   * Batch resolve a single reference type.
   * Checks cache first, fetches only uncached values.
   */
  async batchResolveReferences(refName, values, refConfig, schoolId) {
    const cacheKey = `${refName}:${schoolId}`;
    const result   = {};
    const toFetch  = [];

    if (this.cacheEnabled && this.cache[cacheKey]) {
      for (const v of values) {
        if (this.cache[cacheKey][v]) result[v] = this.cache[cacheKey][v];
        else toFetch.push(v);
      }
    } else {
      toFetch.push(...values);
    }

    if (toFetch.length > 0) {
      const fetched = await this.resolveReference(refName, toFetch, refConfig, schoolId);
      Object.assign(result, fetched);
      if (this.cacheEnabled) {
        if (!this.cache[cacheKey]) this.cache[cacheKey] = {};
        Object.assign(this.cache[cacheKey], fetched);
      }
    }

    return result;
  }

  /**
   * Route to the correct resolver based on refName.
   */
  async resolveReference(refName, values, refConfig, schoolId) {
    const result = {};
    try {
      switch (refName) {
        case 'sessionId':
        case 'session': {
          const docs = await this.resolveSessions(values, schoolId, refConfig);
          for (const doc of docs) result[doc.name] = doc;
          break;
        }
        case 'classId': {
          const docs = await this.resolveClasses(values, schoolId, refConfig);
          for (const doc of docs) result[doc.name] = doc;
          break;
        }
        case 'sectionId': {
          const docs = await this.resolveSections(values, schoolId, refConfig);
          // Key by "className__sectionName" so we can disambiguate across classes
          for (const doc of docs) {
            result[doc.name] = doc;
            if (doc._className) result[`${doc._className}__${doc.name}`] = doc;
          }
          break;
        }
        default:
          logger.warn(`[ReferenceResolver] Unknown ref type: ${refName}`);
      }
    } catch (err) {
      logger.error(`[ReferenceResolver] Error resolving ${refName}:`, err.message);
    }
    return result;
  }

  // REAL MODEL RESOLVERS

  /**
   * Resolve AcademicSession by name.
   * Matches "2025-26", "2024-25", etc. (case-insensitive, trimmed).
   */
  async resolveSessions(names, schoolId, config = {}) {
    const { AcademicSession } = getModels();
    try {
      // Case-insensitive match — schools sometimes write "2025-26" vs "2025 - 26"
      const normalized = names.map(n => n.trim());
      const docs = await AcademicSession.find({
        schoolId,
        name: { $in: normalized },
      }).lean();
      return docs;
    } catch (err) {
      logger.error('[ReferenceResolver] resolveSessions error:', err.message);
      return [];
    }
  }

  /**
   * Resolve ClassModel by name (optionally scoped to a session).
   * Config can have sessionId to narrow results.
   */
  async resolveClasses(names, schoolId, config = {}) {
    const { ClassModel } = getModels();
    try {
      const query = {
        schoolId,
        name: { $in: names.map(n => n.trim()) },
      };
      // If a specific sessionId is provided in config (from engine context), scope it
      if (config.sessionId) query.session = config.sessionId;

      const docs = await ClassModel.find(query).lean();
      return docs;
    } catch (err) {
      logger.error('[ReferenceResolver] resolveClasses error:', err.message);
      return [];
    }
  }

  /**
   * Resolve SectionModel by name (optionally scoped to classId + session).
   */
  async resolveSections(names, schoolId, config = {}) {
    const { SectionModel } = getModels();
    try {
      const query = {
        schoolId,
        name: { $in: names.map(n => n.trim()) },
      };
      if (config.classId)   query.classId = config.classId;
      if (config.sessionId) query.session  = config.sessionId;

      const docs = await SectionModel.find(query)
        .populate('classId', 'name')
        .lean();

      // Attach _className for composite-key lookups
      return docs.map(d => ({ ...d, _className: d.classId?.name || null }));
    } catch (err) {
      logger.error('[ReferenceResolver] resolveSections error:', err.message);
      return [];
    }
  }

  // CONVENIENCE: Resolve a single name → ObjectId  (used by StudentAdapter)

  /**
   * Resolve session name → AcademicSession document
   */
  async resolveSessionByName(name, schoolId) {
    const { AcademicSession } = getModels();
    const cacheKey = `session_doc:${schoolId}:${name}`;
    if (this.cacheEnabled && this.cache[cacheKey]) return this.cache[cacheKey];

    const doc = await AcademicSession.findOne({ name: name.trim(), schoolId }).lean();
    if (this.cacheEnabled && doc) this.cache[cacheKey] = doc;
    return doc;
  }

  /**
   * Resolve class name + sessionId → ClassModel document
   */
  async resolveClassByName(name, sessionId, schoolId) {
    const { ClassModel } = getModels();
    const cacheKey = `class_doc:${schoolId}:${sessionId}:${name}`;
    if (this.cacheEnabled && this.cache[cacheKey]) return this.cache[cacheKey];

    const doc = await ClassModel.findOne({
      name: name.trim(),
      session: sessionId,
      schoolId,
    }).lean();
    if (this.cacheEnabled && doc) this.cache[cacheKey] = doc;
    return doc;
  }

  /**
   * Resolve section name + classId + sessionId → SectionModel document
   */
  async resolveSectionByName(name, classId, sessionId, schoolId) {
    const { SectionModel } = getModels();
    const cacheKey = `section_doc:${schoolId}:${sessionId}:${classId}:${name}`;
    if (this.cacheEnabled && this.cache[cacheKey]) return this.cache[cacheKey];

    const doc = await SectionModel.findOne({
      name:    name.trim(),
      classId,
      session: sessionId,
      schoolId,
    }).lean();
    if (this.cacheEnabled && doc) this.cache[cacheKey] = doc;
    return doc;
  }

  // UTILITY

  mapReferencesToRows(rows, resolvedReferences, mapping = {}) {
    for (const row of rows) {
      for (const [refName, resolvedMap] of Object.entries(resolvedReferences)) {
        if (mapping[refName]) {
          const { sourceField, targetField } = mapping[refName];
          if (row[sourceField]) {
            row[targetField] = resolvedMap[row[sourceField]]?._id || null;
          }
        }
      }
    }
    return rows;
  }

  async checkReference(refName, value, refConfig, schoolId) {
    try {
      const resolved = await this.resolveReference(refName, [value], refConfig, schoolId);
      return !!resolved[value];
    } catch (err) {
      return false;
    }
  }

  clearCache(pattern) {
    if (pattern) {
      Object.keys(this.cache).filter(k => k.includes(pattern)).forEach(k => delete this.cache[k]);
    } else {
      this.cache = {};
    }
  }

  getCacheStats() {
    return {
      totalEntries: Object.keys(this.cache).length,
      memory:       JSON.stringify(this.cache).length,
      cacheEnabled: this.cacheEnabled,
    };
  }

  async warmCache(references, schoolId) {
    for (const [refName, values] of Object.entries(references)) {
      await this.batchResolveReferences(refName, values, {}, schoolId);
    }
  }
}

module.exports = ReferenceResolver;
