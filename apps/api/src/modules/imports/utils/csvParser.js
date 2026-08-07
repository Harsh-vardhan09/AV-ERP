/**
 * CSV Parser - Stream-based CSV parsing
 * Prevents memory overload for large files
 * Supports flexible headers and robust error handling
 */

const { Readable } = require('stream');
const csv = require('fast-csv');
const { FILE } = require('../constants/importConstants');
const logger = require('../../../core/logging/logger.js');

class CSVParser {
  /**
   * Parse CSV file with streaming
   * @param {Buffer|Stream} fileData - File buffer or stream
   * @param {Object} options - Parsing options
   * @returns {Promise<{headers: Array, rows: Array, errors: Array}>}
   */
  static async parse(fileData, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        delimiter = ',',
        headers = true,
        skipRows = 0,
        maxRows = FILE.MAX_ROWS_PER_FILE,
        validateRow = null,
        transformRow = null,
        encoding = FILE.ENCODING,
      } = options;

      const rows = [];
      const errors = [];
      let headerRow = null;
      let rowNumber = 0;
      let processedRows = 0;

      // Create stream from buffer
      const stream = Buffer.isBuffer(fileData) ? Readable.from([fileData]) : fileData;

      // Detect delimiter if not specified
      let detectedDelimiter = delimiter;

      stream
        .pipe(
          csv.parse({
            delimiter: detectedDelimiter,
            headers: headers,
            ignoreEmpty: options.ignoreEmpty !== false,
            trim: true,
            maxRows,
            encoding,
          })
        )
        // fast-csv emits 'headers' on the parser stream and has no `on` parse
        // option — passing one is silently ignored, which left headerRow null and
        // made fileUploadValidator reject every CSV with ERR_INVALID_HEADERS
        .on('headers', (parsedHeaders) => {
          headerRow = parsedHeaders;

          if (options.validateHeaders) {
            try {
              options.validateHeaders(headerRow);
            } catch (error) {
              reject(
                new Error(`Header validation failed: ${error.message}`, {
                  cause: error,
                  headers: headerRow,
                })
              );
            }
          }
        })
        .on('data', async (row) => {
          try {
            rowNumber++;

            // Skip initial rows if specified
            if (rowNumber <= skipRows) {
              return;
            }

            // Check row limit
            if (processedRows >= maxRows) {
              reject(new Error(`Maximum rows limit (${maxRows}) exceeded`));
              return;
            }

            // Custom row validation
            if (validateRow) {
              try {
                validateRow(row, rowNumber, headerRow);
              } catch (error) {
                errors.push({
                  rowNumber,
                  row,
                  error: error.message,
                  type: 'validation_error',
                });
                return;
              }
            }

            // Custom row transformation
            if (transformRow) {
              try {
                row = transformRow(row, rowNumber, headerRow);
              } catch (error) {
                errors.push({
                  rowNumber,
                  row,
                  error: error.message,
                  type: 'transformation_error',
                });
                return;
              }
            }

            rows.push({
              rowNumber,
              data: row,
            });

            processedRows++;
          } catch (error) {
            logger.error(`Error processing row ${rowNumber}:`, error);
            errors.push({
              rowNumber,
              error: error.message,
              type: 'processing_error',
            });
          }
        })
        .on('error', (error) => {
          logger.error('CSV parsing error:', error);
          reject(new Error(`CSV parsing failed: ${error.message}`, { cause: error }));
        })
        .on('end', () => {
          resolve({
            headers: headerRow,
            rows,
            errors,
            totalRows: rows.length,
            skippedRows: rowNumber - rows.length - skipRows,
          });
        });
    });
  }

  /**
   * Detect CSV delimiter
   * @param {Buffer} fileBuffer - File buffer
   * @returns {string} Detected delimiter
   */
  static detectDelimiter(fileBuffer) {
    // Sample first line
    const text = fileBuffer.toString('utf-8', 0, Math.min(1024, fileBuffer.length));
    const firstLine = text.split('\n')[0];

    // Count potential delimiters
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(`\\${delimiter}`)) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Validate CSV file
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static async validate(fileBuffer, options = {}) {
    const {
      maxSize = FILE.MAX_SIZE_CSV,
      maxRows = FILE.MAX_ROWS_PER_FILE,
      allowFormulaInjection = false,
    } = options;

    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check file size
    if (fileBuffer.length > maxSize) {
      result.isValid = false;
      result.errors.push(`File size (${fileBuffer.length} bytes) exceeds limit (${maxSize} bytes)`);
    }

    // Check for formula injection
    if (!allowFormulaInjection) {
      const text = fileBuffer.toString('utf-8', 0, Math.min(10000, fileBuffer.length));
      const injectionPattern = /^(=|@|\\+|-)/m;

      if (injectionPattern.test(text)) {
        result.warnings.push(
          'File may contain formula injections. Please verify the content before importing.'
        );
      }
    }

    // Try to parse
    try {
      const parsed = await this.parse(fileBuffer, {
        maxRows: 10, // Just validate first 10 rows
      });

      if (parsed.errors.length > 0) {
        result.warnings.push(`Found ${parsed.errors.length} parsing issues in sample rows`);
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Parse error: ${error.message}`);
    }

    return result;
  }

  /**
   * Extract sample from CSV
   * @param {Buffer} fileBuffer - File buffer
   * @param {number} sampleSize - Number of rows to extract
   * @returns {Promise<{headers: Array, rows: Array}>}
   */
  static async extractSample(fileBuffer, sampleSize = 5) {
    const result = await this.parse(fileBuffer, {
      maxRows: sampleSize,
    });

    return {
      headers: result.headers,
      rows: result.rows.slice(0, sampleSize).map((r) => r.data),
    };
  }

  /**
   * Count total rows in CSV (excluding header)
   * @param {Buffer} fileBuffer - File buffer
   * @returns {Promise<number>} Row count
   */
  static async countRows(fileBuffer) {
    const result = await this.parse(fileBuffer, {
      maxRows: FILE.MAX_ROWS_PER_FILE,
    });

    return result.totalRows;
  }

  /**
   * Generate downloadable error CSV
   * @param {Array} errors - Array of error objects
   * @returns {string} CSV content
   */
  static generateErrorCSV(errors) {
    if (errors.length === 0) {
      return '';
    }

    // Headers
    const headers = ['Row Number', 'Field', 'Value', 'Error Message', 'Suggested Correction'];
    const rows = errors.map((err) => [
      err.rowNumber || '',
      err.field || '',
      err.value || '',
      err.errorMessage || '',
      err.suggestedCorrection || '',
    ]);

    // Convert to CSV
    const csvRows = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if needed
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(',')
      )
      .join('\n');

    return csvRows;
  }
}

module.exports = CSVParser;
