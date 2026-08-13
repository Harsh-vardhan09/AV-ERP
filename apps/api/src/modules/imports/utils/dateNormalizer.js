/**
 * DateNormalizer - Utility for normalizing dates from various formats
 * Handles international date formats and converts to standard ISO format
 */

const moment = require('moment');
const { DATE_FORMATS } = require('../constants/importConstants');
const logger = require('../../../core/logging/logger.js');

class DateNormalizer {
  /**
   * Normalize date from various formats to ISO 8601
   */
  static normalize(dateString, options = {}) {
    if (!dateString) {
      return null;
    }

    // If already a Date object
    if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }

    // Convert to string
    const dateStr = String(dateString).trim();

    // If already in ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }

    // Excel serial date. A cell formatted as a date and saved to CSV often comes
    // through as the raw serial (45672 = 2025-01-15). This has to be handled
    // BEFORE moment's loose fallback, which read 45672 as the year 45672 and
    // silently produced "45672-01-01" instead of failing.
    // Excel's epoch is 1899-12-30 (its 1900 leap-year bug is baked into the offset).
    // Range 1..2958465 is 1900-01-01 .. 9999-12-31.
    if (/^\d+(\.\d+)?$/.test(dateStr)) {
      const serial = Number(dateStr);
      if (serial >= 1 && serial <= 2958465) {
        const asDate = moment('1899-12-30', 'YYYY-MM-DD').add(Math.floor(serial), 'days');
        if (asDate.isValid()) return asDate.format('YYYY-MM-DD');
      }
      throw new Error(
        `Unable to parse date: "${dateStr}" — a bare number is read as an Excel serial date, ` +
          `and ${dateStr} is outside the supported range (1–2958465).`
      );
    }

    // Try all known formats
    for (const format of DATE_FORMATS) {
      const parsed = moment(dateStr, format, true); // true = strict parsing
      if (parsed.isValid()) {
        return parsed.format('YYYY-MM-DD');
      }
    }

    // Try moment's automatic parsing as last resort
    const auto = moment(dateStr);
    if (auto.isValid()) {
      logger.warn(
        `Date parsed without explicit format: ${dateStr} -> ${auto.format('YYYY-MM-DD')}`
      );
      return auto.format('YYYY-MM-DD');
    }

    // Failed to parse
    throw new Error(`Unable to parse date: "${dateStr}"`);
  }

  /**
   * Detect date format
   */
  static detectFormat(dateString) {
    const dateStr = String(dateString).trim();

    for (const format of DATE_FORMATS) {
      const parsed = moment(dateStr, format, true);
      if (parsed.isValid()) {
        return format;
      }
    }

    return null;
  }

  /**
   * Parse date and return Date object
   */
  static parse(dateString, options = {}) {
    const normalized = this.normalize(dateString, options);
    return new Date(normalized);
  }

  /**
   * Validate date range
   */
  static isInRange(dateString, startDate, endDate) {
    try {
      const date = this.parse(dateString);
      const start = new Date(startDate);
      const end = new Date(endDate);

      return date >= start && date <= end;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if date is valid
   */
  static isValid(dateString) {
    try {
      this.normalize(dateString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get age from date of birth
   */
  static getAge(dateOfBirthString) {
    try {
      const dob = moment(this.normalize(dateOfBirthString));
      return moment().diff(dob, 'years');
    } catch {
      return null;
    }
  }
}

module.exports = DateNormalizer;
