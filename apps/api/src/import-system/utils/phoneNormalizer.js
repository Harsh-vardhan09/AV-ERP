/**
 * PhoneNormalizer - Utility for normalizing phone numbers
 * Handles international formats and converts to standard format
 */

const { PHONE_FORMATS } = require('../constants/importConstants');
const logger = require('../../utils/logger');

class PhoneNormalizer {
  /**
   * Normalize phone number to standard format
   */
  static normalize(phoneNumber, options = {}) {
    if (!phoneNumber) {
      return null;
    }

    let normalized = String(phoneNumber).trim();

    // Remove common separators
    normalized = normalized.replace(/[\s\-\(\)\.]/g, '');

    // Remove common prefixes
    if (normalized.startsWith('+91')) {
      normalized = normalized.substring(3);
    } else if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }

    // Validate length (should be 10 digits for India)
    if (!/^\d{10}$/.test(normalized)) {
      throw new Error(`Invalid phone number format: "${phoneNumber}"`);
    }

    return normalized;
  }

  /**
   * Format phone number with country code
   */
  static format(phoneNumber, countryCode = '+91') {
    try {
      const normalized = this.normalize(phoneNumber);
      return `${countryCode}${normalized}`;
    } catch {
      return phoneNumber;
    }
  }

  /**
   * Validate phone number
   */
  static isValid(phoneNumber) {
    try {
      this.normalize(phoneNumber);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract phone numbers from text
   */
  static extractFromText(text) {
    const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g;
    const matches = text.match(phoneRegex) || [];
    return matches.filter((phone) => this.isValid(phone));
  }
}

module.exports = PhoneNormalizer;
