/**
 * ColumnMapper - Maps file columns to entity fields
 * Handles header matching, fuzzy matching, and profile-based mapping
 */

const { COLUMN_ALIASES } = require('../constants/importConstants');
const logger = require('../../../src/core/logging/logger.js');

class ColumnMapper {
  /**
   * Map file headers to entity fields
   */
  static mapHeaders(fileHeaders, entityConfig, options = {}) {
    const {
      allowFuzzyMatch = true,
      allowAliases = true,
      caseSensitive = false,
      mapping = {}, // Pre-defined mapping
      strict = false, // If true, throw error on unmapped columns
    } = options;

    const result = {
      mapped: {}, // {fileColumn: entityField}
      unmapped: [], // File columns that couldn't be mapped
      warnings: [],
      confidence: 1.0,
      details: [],
    };

    // Get entity's expected fields
    const expectedFields = entityConfig.requiredFields || [];
    const optionalFields = entityConfig.optionalFields || [];

    // ── Also include all keys from entity-specific columnAliases ──────────
    const entityColumnAliases = entityConfig.columnAliases || {};
    const aliasFieldKeys = Object.keys(entityColumnAliases);

    // allFields = union of required, optional, and alias-defined fields
    const allFieldsSet = new Set([...expectedFields, ...optionalFields, ...aliasFieldKeys]);
    const allFields = [...allFieldsSet];

    // Normalize headers (remove extra spaces, lowercase for comparison)
    const normalizedHeaders = fileHeaders.map((h) => ({
      original: h,
      normalized: caseSensitive ? h.trim() : h.toLowerCase().trim(),
    }));

    // Try to map each file header
    for (const header of normalizedHeaders) {
      let mapped = null;
      let matchConfidence = 0;
      let matchMethod = null;

      // 1. Check pre-defined mapping first
      if (mapping[header.original]) {
        mapped = mapping[header.original];
        matchConfidence = 1.0;
        matchMethod = 'predefined_mapping';
      }

      // 2. Try exact match (case-insensitive) against all known fields
      if (!mapped) {
        const exactMatch = allFields.find((field) =>
          caseSensitive ? field === header.original : field.toLowerCase() === header.normalized
        );

        if (exactMatch) {
          mapped = exactMatch;
          matchConfidence = 1.0;
          matchMethod = 'exact_match';
        }
      }

      // 3a. Try entity-specific column aliases FIRST (higher priority, more specific)
      if (!mapped && allowAliases && Object.keys(entityColumnAliases).length > 0) {
        for (const [field, aliases] of Object.entries(entityColumnAliases)) {
          const aliasMatch = aliases.find((alias) =>
            caseSensitive
              ? alias === header.original
              : alias.toLowerCase() === header.normalized
          );

          if (aliasMatch) {
            mapped = field;
            matchConfidence = 1.0;  // entity-specific = exact match confidence
            matchMethod = 'entity_alias_match';
            break;
          }
        }
      }

      // 3b. Try global COLUMN_ALIASES as fallback
      if (!mapped && allowAliases) {
        for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
          const aliasMatch = aliases.find((alias) =>
            caseSensitive ? alias === header.original : alias.toLowerCase() === header.normalized
          );

          if (aliasMatch) {
            // Check if field is in allowed fields
            if (allFields.some((f) => f === field || f.toLowerCase() === field.toLowerCase())) {
              mapped = field;
              matchConfidence = 0.95;
              matchMethod = 'alias_match';
              break;
            }
          }
        }
      }

      // 4. Try fuzzy match
      if (!mapped && allowFuzzyMatch) {
        const fuzzyMatch = this.fuzzyMatch(header.normalized, allFields, caseSensitive);
        if (fuzzyMatch && fuzzyMatch.score > 0.7) {
          mapped = fuzzyMatch.field;
          matchConfidence = fuzzyMatch.score;
          matchMethod = 'fuzzy_match';
        }
      }

      // Record result
      if (mapped) {
        result.mapped[header.original] = mapped;
        result.details.push({
          fileColumn: header.original,
          entityField: mapped,
          method: matchMethod,
          confidence: matchConfidence,
        });

        if (matchConfidence < 1.0) {
          result.warnings.push(
            `Column "${header.original}" matched to "${mapped}" with ${(matchConfidence * 100).toFixed(0)}% confidence`
          );
        }

        result.confidence = Math.min(result.confidence, matchConfidence);
      } else {
        result.unmapped.push(header.original);

        result.warnings.push(`Could not map column "${header.original}". It will be ignored.`);
      }
    }

    // Check if all required fields are mapped
    const mappedFields = Object.values(result.mapped);
    const missingRequired = expectedFields.filter((field) => !mappedFields.includes(field));

    if (missingRequired.length > 0) {
      result.warnings.push(`Missing required fields: ${missingRequired.join(', ')}`);

      if (strict) {
        throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Fuzzy match column header to field name
   */
  static fuzzyMatch(header, fields, caseSensitive = false) {
    let bestMatch = null;
    let bestScore = 0;

    for (const field of fields) {
      const fieldToCompare = caseSensitive ? field : field.toLowerCase();
      const score = this.calculateSimilarity(header, fieldToCompare);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = field;
      }
    }

    return bestScore > 0 ? { field: bestMatch, score: bestScore } : null;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  static calculateSimilarity(str1, str2) {
    // Normalize strings
    const s1 = str1.toLowerCase().replace(/[\s_-]/g, '');
    const s2 = str2.toLowerCase().replace(/[\s_-]/g, '');

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(s1, s2) {
    const costs = [];

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }

    return costs[s2.length];
  }

  /**
   * Apply mapping to row data
   */
  static applyMapping(rowData, mapping) {
    const mapped = {};

    for (const [fileColumn, entityField] of Object.entries(mapping)) {
      if (rowData.hasOwnProperty(fileColumn)) {
        mapped[entityField] = rowData[fileColumn];
      }
    }

    return mapped;
  }

  /**
   * Reverse mapping (entity field to file column)
   */
  static reverseMapping(mapping) {
    return Object.entries(mapping).reduce((acc, [fileColumn, entityField]) => {
      acc[entityField] = fileColumn;
      return acc;
    }, {});
  }

  /**
   * Validate mapping completeness
   */
  static validateMapping(mapping, requiredFields = []) {
    const mappedFields = Object.values(mapping);
    const missingFields = requiredFields.filter((field) => !mappedFields.includes(field));

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Save mapping as profile
   */
  static createMappingProfile(mapping, config = {}) {
    return {
      name: config.name || `Profile-${Date.now()}`,
      description: config.description,
      entity: config.entity,
      columnMapping: mapping,
      createdAt: new Date(),
      confidence: config.confidence || 1.0,
    };
  }

  /**
   * Suggest column mapping based on sample data
   */
  static suggestMapping(headers, sampleRows = [], entityConfig = {}) {
    const suggested = {};

    for (const header of headers) {
      // Check if header itself matches any field
      for (const field of [...(entityConfig.requiredFields || []), ...(entityConfig.optionalFields || [])]) {
        if (header.toLowerCase().includes(field.toLowerCase()) || field.toLowerCase().includes(header.toLowerCase())) {
          suggested[header] = field;
          break;
        }
      }

      // If not found, try content-based detection
      if (!suggested[header] && sampleRows.length > 0) {
        const firstValue = sampleRows[0][header];
        const detectedField = this.detectFieldByContent(firstValue, entityConfig);
        if (detectedField) {
          suggested[header] = detectedField;
        }
      }
    }

    return suggested;
  }

  /**
   * Detect field type from sample value
   */
  static detectFieldByContent(value, entityConfig = {}) {
    if (!value) return null;

    const str = String(value).toLowerCase();

    // Email detection
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      return 'email';
    }

    // Phone detection
    if (/^[\d\+\-\s\(\)]{10,}$/.test(str)) {
      return 'phone';
    }

    // Date detection
    if (/^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(str) || /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(str)) {
      return 'dateOfBirth';
    }

    // Boolean detection
    if (['yes', 'no', 'true', 'false', '1', '0'].includes(str)) {
      return 'isActive';
    }

    return null;
  }
}

module.exports = ColumnMapper;
