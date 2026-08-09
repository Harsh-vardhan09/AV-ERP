/**
 * DuplicateChecker - Detects and handles duplicates based on unique keys
 * Provides flexible duplicate handling: skip, update, or stop on duplicate
 */

const logger = require('../../../core/logging/logger.js');

class DuplicateChecker {
  /**
   * Check for duplicates against database
   * @param {Object} data - Row data
   * @param {Array} uniqueKeys - Keys to check for uniqueness
   * @param {Function} findExisting - Async function to find existing record
   * @param {string} mode - 'skip', 'update', or 'stop'
   * @returns {Object} {isDuplicate, existing, mode, action}
   */
  static async check(data, uniqueKeys = [], findExisting, mode = 'skip') {
    const result = {
      isDuplicate: false,
      existing: null,
      duplicateKeys: [],
      mode,
      action: 'proceed',
    };

    for (const key of uniqueKeys) {
      if (data[key]) {
        try {
          const existing = await findExisting({ [key]: data[key] });

          if (existing) {
            result.isDuplicate = true;
            result.duplicateKeys.push(key);
            result.existing = existing;

            // Determine action based on mode
            switch (mode) {
              case 'skip':
                result.action = 'skip';
                result.reason = `Duplicate found on key '${key}'`;
                break;

              case 'update':
                result.action = 'update';
                result.reason = `Will update existing record`;
                result.existingId = existing._id;
                break;

              case 'stop':
                result.action = 'stop';
                result.reason = `Import stopped on duplicate key '${key}'`;
                throw new Error(`Duplicate detected on ${key}: ${data[key]}`);

              default:
                result.action = 'proceed';
            }

            // Found first duplicate, stop checking
            break;
          }
        } catch (error) {
          if (error.message.includes('Duplicate detected')) {
            throw error;
          }
          logger.warn(`Error checking duplicate for key ${key}:`, error);
        }
      }
    }

    return result;
  }

  /**
   * Check for partial duplicates (similar records)
   */
  static async checkPartial(data, similarFields = [], findSimilar, threshold = 0.8) {
    const similar = [];

    for (const field of similarFields) {
      if (data[field]) {
        const matches = await findSimilar(field, data[field], threshold);
        if (matches.length > 0) {
          similar.push({
            field,
            value: data[field],
            matches,
          });
        }
      }
    }

    return {
      hasSimilar: similar.length > 0,
      similar,
    };
  }

  /**
   * Check for duplicates in a batch
   */
  static checkBatchDuplicates(rows, uniqueKeys = []) {
    const result = {
      duplicates: [],
      groups: {},
    };

    const seen = {};

    rows.forEach((row, index) => {
      for (const key of uniqueKeys) {
        const value = row[key];

        if (value) {
          const keyStr = `${key}:${value}`;

          if (seen[keyStr]) {
            // Found duplicate in batch
            result.duplicates.push({
              key,
              value,
              rows: [seen[keyStr], index],
            });

            // Group duplicates
            if (!result.groups[keyStr]) {
              result.groups[keyStr] = [];
            }
            result.groups[keyStr].push(index);
          } else {
            seen[keyStr] = index;
            if (!result.groups[keyStr]) {
              result.groups[keyStr] = [index];
            }
          }
        }
      }
    });

    return result;
  }

  /**
   * Create duplicate report
   */
  static generateReport(duplicates) {
    return {
      totalDuplicates: duplicates.length,
      byKey: this.groupByKey(duplicates),
      byValue: this.groupByValue(duplicates),
    };
  }

  /**
   * Group duplicates by key
   */
  static groupByKey(duplicates) {
    return duplicates.reduce((acc, dup) => {
      if (!acc[dup.key]) {
        acc[dup.key] = [];
      }
      acc[dup.key].push(dup.value);
      return acc;
    }, {});
  }

  /**
   * Group duplicates by value
   */
  static groupByValue(duplicates) {
    return duplicates.reduce((acc, dup) => {
      const key = `${dup.value}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(dup.key);
      return acc;
    }, {});
  }

  /**
   * Resolve batch duplicates based on mode
   */
  static resolveBatchDuplicates(rows, duplicates, mode = 'skip') {
    const result = {
      kept: [],
      skipped: [],
      conflicts: [],
    };

    const skipIndices = new Set();

    duplicates.forEach((dup) => {
      switch (mode) {
        case 'skip':
          // Keep first, skip others
          skipIndices.add(dup.rows[1]);
          result.skipped.push({
            row: dup.rows[1],
            reason: `Duplicate of row ${dup.rows[0]}`,
          });
          break;

        case 'keep_latest':
          // Keep later occurrence
          skipIndices.add(dup.rows[0]);
          result.skipped.push({
            row: dup.rows[0],
            reason: `Older duplicate of row ${dup.rows[1]}`,
          });
          break;

        case 'keep_best':
          // Mark as conflict for manual review
          result.conflicts.push({
            rows: dup.rows,
            key: dup.key,
            value: dup.value,
          });
          break;

        case 'merge':
          // Mark for merging
          result.conflicts.push({
            rows: dup.rows,
            action: 'merge',
            key: dup.key,
          });
          break;
      }
    });

    // Filter rows
    result.kept = rows.filter((_, index) => !skipIndices.has(index));

    return result;
  }
}

module.exports = DuplicateChecker;
