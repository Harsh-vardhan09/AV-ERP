/**
 * FileSecurityScanner - Detects and prevents malicious content
 * Checks for formula injection, malicious payloads, and file corruption
 */

const { FILE } = require('../constants/importConstants');
const logger = require('../../../core/logging/logger.js');

class FileSecurityScanner {
  /**
   * Perform comprehensive security scan
   */
  static async scan(fileBuffer, options = {}) {
    const {
      allowFormulaInjection = false,
      allowDangerousPatterns = false,
      maxCellLength = FILE.MAX_CELL_LENGTH,
    } = options;

    const result = {
      safe: true,
      threats: [],
      warnings: [],
      details: {},
    };

    // Scan file signature FIRST — determines if it's binary (XLSX) or text (CSV)
    const signatureScan = this.scanFileSignature(fileBuffer);
    if (!signatureScan.valid) {
      result.safe = false;
      result.threats.push({
        type: 'INVALID_FILE_SIGNATURE',
        severity: 'CRITICAL',
        message: signatureScan.message,
      });
    }
    result.details.signature = signatureScan;

    // XLSX/binary files must NOT be scanned with text-based pattern matchers.
    // XLSX is a ZIP archive — decoding binary bytes as UTF-8 produces garbage
    // that trivially matches SQL/formula patterns, causing false positives.
    const isBinaryFile = signatureScan.fileType === 'xlsx' || signatureScan.fileType === 'ods';

    if (!isBinaryFile) {
      // Scan for formula injection (CSV / text files only)
      if (!allowFormulaInjection) {
        const formulaScan = this.scanFormulaInjection(fileBuffer);
        if (formulaScan.detected) {
          result.safe = false;
          result.threats.push({
            type: 'FORMULA_INJECTION',
            severity: 'HIGH',
            message: `Formula injection detected in ${formulaScan.count} locations`,
            samples: formulaScan.samples,
          });
        }
        result.details.formulas = formulaScan;
      }

      // Scan for malicious patterns (CSV / text files only)
      if (!allowDangerousPatterns) {
        const patternScan = this.scanMaliciousPatterns(fileBuffer);
        if (patternScan.detected) {
          result.safe = false;
          result.threats.push({
            type: 'MALICIOUS_PATTERN',
            severity: 'CRITICAL',
            message: `Malicious pattern detected: ${patternScan.patterns.join(', ')}`,
          });
        }
        result.details.patterns = patternScan;
      }
    } else {
      // For binary files: skip text-based scans, mark them as not applicable
      result.details.formulas = { detected: false, skipped: true, reason: 'Binary file — text scan skipped' };
      result.details.patterns = { detected: false, skipped: true, reason: 'Binary file — text scan skipped' };
    }

    // Scan for oversized cells (text files only — binary files use their own encoding)
    if (!isBinaryFile) {
      const cellScan = this.scanCellSizes(fileBuffer, maxCellLength);
      if (cellScan.violations > 0) {
        result.warnings.push({
          type: 'OVERSIZED_CELLS',
          severity: 'MEDIUM',
          message: `Found ${cellScan.violations} cells exceeding maximum length`,
        });
      }
      result.details.cells = cellScan;
    }

    // Scan for suspicious encodings (only meaningful for text/CSV files)
    if (!isBinaryFile) {
      const encodingScan = this.scanEncoding(fileBuffer);
      if (encodingScan.suspicious) {
        result.warnings.push({
          type: 'SUSPICIOUS_ENCODING',
          severity: 'LOW',
          message: encodingScan.message,
        });
      }
      result.details.encoding = encodingScan;
    }

    // Scan file size
    const sizeScan = this.scanFileSize(fileBuffer);
    result.details.size = sizeScan;

    return result;
  }

  /**
   * Scan file signature/magic bytes
   */
  static scanFileSignature(fileBuffer) {
    const result = {
      valid: false,
      fileType: 'unknown',
      message: '',
    };

    if (fileBuffer.length < 4) {
      result.message = 'File too small to determine type';
      return result;
    }

    // CSV has no specific signature, check for text content
    try {
      const header = fileBuffer.toString('utf-8', 0, Math.min(100, fileBuffer.length));
      if (/^[\x20-\x7E\r\n]*$/.test(header)) {
        result.valid = true;
        result.fileType = 'csv';
        return result;
      }
    } catch (e) {
      // Not valid UTF-8
    }

    // XLSX is a ZIP file (starts with PK)
    if (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b) {
      result.valid = true;
      result.fileType = 'xlsx';
      return result;
    }

    // ODS (OpenDocument Spreadsheet)
    if (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04) {
      result.valid = true;
      result.fileType = 'ods';
      return result;
    }

    result.message = 'File signature does not match expected types (CSV, XLSX, ODS)';
    return result;
  }

  /**
   * Scan for formula injection
   */
  static scanFormulaInjection(fileBuffer) {
    const result = {
      detected: false,
      count: 0,
      patterns: ['=', '@', '+', '-'],
      samples: [],
    };

    try {
      const text = fileBuffer.toString('utf-8');
      const lines = text.split('\n');

      const injectionPattern = /^(=|@|\+|-)(?![\n\r])/m;

      lines.forEach((line, index) => {
        const matches = line.match(injectionPattern);
        if (matches) {
          result.detected = true;
          result.count++;

          // Store sample (first 5 instances)
          if (result.samples.length < 5) {
            result.samples.push({
              line: index + 1,
              content: line.substring(0, 100),
              pattern: matches[1],
            });
          }
        }
      });
    } catch (error) {
      logger.error('Error scanning for formula injection:', error);
    }

    return result;
  }

  /**
   * Scan for malicious patterns
   */
  static scanMaliciousPatterns(fileBuffer) {
    const result = {
      detected: false,
      patterns: [],
      matches: [],
    };

    try {
      const text = fileBuffer.toString('utf-8');

      const dangerousPatterns = {
        'JavaScript URL': /javascript:/i,
        'Script Tag': /<script[^>]*>/i,
        'Event Handler': /(onclick|onerror|onload|onmouseover|onmouseout)=/i,
        'Code Evaluation': /(eval\(|exec\(|Function\()/i,
        'SQL Injection': /('|"|;).*--(.*)|('|"|;).*\/\*/i,
        'XSS': /<iframe|<embed|<object/i,
      };

      for (const [patternName, pattern] of Object.entries(dangerousPatterns)) {
        const matches = text.match(pattern);
        if (matches) {
          result.detected = true;
          result.patterns.push(patternName);
          result.matches.push({
            pattern: patternName,
            content: matches[0].substring(0, 100),
          });
        }
      }
    } catch (error) {
      logger.error('Error scanning for malicious patterns:', error);
    }

    return result;
  }

  /**
   * Scan for oversized cells
   */
  static scanCellSizes(fileBuffer, maxLength = FILE.MAX_CELL_LENGTH) {
    const result = {
      violations: 0,
      maxFound: 0,
      examples: [],
    };

    try {
      const text = fileBuffer.toString('utf-8');
      const cells = text.split(/[\r\n,;|]/);

      cells.forEach((cell, index) => {
        if (cell.length > maxLength) {
          result.violations++;
          result.maxFound = Math.max(result.maxFound, cell.length);

          // Store example (first 5)
          if (result.examples.length < 5) {
            result.examples.push({
              cellIndex: index,
              length: cell.length,
              preview: cell.substring(0, 50),
            });
          }
        }
      });
    } catch (error) {
      logger.error('Error scanning cell sizes:', error);
    }

    return result;
  }

  /**
   * Scan for suspicious encoding
   */
  static scanEncoding(fileBuffer) {
    const result = {
      detected: false,
      encodings: [],
      suspicious: false,
      message: '',
    };

    try {
      // Check for null bytes (indicator of binary disguised as text)
      if (fileBuffer.indexOf(0) !== -1) {
        result.detected = true;
        result.suspicious = true;
        result.message = 'File contains null bytes';
        result.encodings.push('BINARY_CONTENT');
      }

      // Try to decode as UTF-8
      try {
        const text = fileBuffer.toString('utf-8');
        if (text.indexOf('\ufffd') !== -1) {
          result.detected = true;
          result.message = 'File contains invalid UTF-8 characters';
          result.encodings.push('INVALID_UTF8');
        }
      } catch (e) {
        result.detected = true;
        result.suspicious = true;
        result.message = 'Unable to decode as UTF-8';
        result.encodings.push('NON_UTF8');
      }
    } catch (error) {
      logger.error('Error scanning encoding:', error);
    }

    return result;
  }

  /**
   * Scan file size
   */
  static scanFileSize(fileBuffer, limits = {}) {
    const { csvLimit = FILE.MAX_SIZE_CSV, xlsxLimit = FILE.MAX_SIZE_XLSX } = limits;

    const result = {
      size: fileBuffer.length,
      sizeInMB: (fileBuffer.length / (1024 * 1024)).toFixed(2),
      warnings: [],
    };

    if (fileBuffer.length > csvLimit) {
      result.warnings.push({
        type: 'EXCEEDS_CSV_LIMIT',
        limit: csvLimit,
        exceeded: fileBuffer.length - csvLimit,
      });
    }

    if (fileBuffer.length > xlsxLimit) {
      result.warnings.push({
        type: 'EXCEEDS_XLSX_LIMIT',
        limit: xlsxLimit,
        exceeded: fileBuffer.length - xlsxLimit,
      });
    }

    return result;
  }

  /**
   * Sanitize file content (remove dangerous patterns)
   * @param {string} content - File content
   * @returns {string} Sanitized content
   */
  static sanitizeContent(content) {
    let sanitized = content;

    // Remove formula injection patterns at cell start
    sanitized = sanitized.replace(/^(=|@|\+|-)(?=[\s\S])/gm, "'$1"); // Add quote prefix

    // Remove script tags
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/(onclick|onerror|onload|onmouseover)=['"]/gi, 'disabled-$1="');

    // Remove dangerous URLs
    sanitized = sanitized.replace(/javascript:/gi, 'unsafe:');

    return sanitized;
  }

  /**
   * Get security summary
   */
  static getSummarySeverity(scanResult) {
    const threats = scanResult.threats || [];

    if (threats.some((t) => t.severity === 'CRITICAL')) {
      return 'CRITICAL';
    }
    if (threats.some((t) => t.severity === 'HIGH')) {
      return 'HIGH';
    }
    if (threats.some((t) => t.severity === 'MEDIUM')) {
      return 'MEDIUM';
    }
    if (scanResult.warnings?.length > 0) {
      return 'LOW';
    }
    return 'SAFE';
  }
}

module.exports = FileSecurityScanner;
