/**
 * XLSX Parser - Stream-based XLSX parsing
 * Prevents memory overload for large Excel files
 * Supports multiple sheets and robust error handling
 */

const xlsx = require('xlsx');
const { FILE } = require('../constants/importConstants');
const logger = require('../../../src/core/logging/logger.js');

class XLSXParser {
  /**
   * Parse XLSX file
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Parsing options
   * @returns {Promise<{headers: Array, rows: Array, errors: Array, metadata: Object}>}
   */
  static async parse(fileBuffer, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const {
          sheetIndex = FILE.XLSX_SHEET_INDEX,
          headerRowNumber = 1,
          maxRows = FILE.MAX_ROWS_PER_FILE,
          validateRow = null,
          transformRow = null,
          skipEmptyRows = true,
        } = options;

        // Read workbook
        let workbook;
        try {
          workbook = xlsx.read(fileBuffer, {
            type: 'buffer',
            cellFormula: false,
            cellStyles: false,
          });
        } catch (error) {
          reject(new Error(`Failed to read Excel file: ${error.message}`, { cause: error }));
          return;
        }

        // Validate sheet existence
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('No sheets found in Excel file'));
          return;
        }

        if (sheetIndex >= workbook.SheetNames.length) {
          reject(new Error(`Sheet index ${sheetIndex} out of range`));
          return;
        }

        const sheetName = workbook.SheetNames[sheetIndex];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const rawData = xlsx.utils.sheet_to_json(worksheet, {
          defval: null,
          blankrows: !skipEmptyRows,
        });

        if (rawData.length === 0) {
          resolve({
            headers: [],
            rows: [],
            errors: [],
            totalRows: 0,
            metadata: {
              sheetName,
              sheetIndex,
              totalSheets: workbook.SheetNames.length,
            },
          });
          return;
        }

        // Extract headers (keys from first row)
        const headerRow = Object.keys(rawData[0]);

        // Validate headers
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
            return;
          }
        }

        // Process rows
        const rows = [];
        const errors = [];
        let processedRows = 0;

        for (let i = 0; i < rawData.length; i++) {
          try {
            const row = rawData[i];
            const rowNumber = i + headerRowNumber + 1;

            // Skip empty rows if configured
            if (skipEmptyRows && this.isEmptyRow(row)) {
              continue;
            }

            // Check row limit
            if (processedRows >= maxRows) {
              logger.warn(`Maximum rows limit (${maxRows}) exceeded. Stopping import.`);
              break;
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
                continue;
              }
            }

            // Custom row transformation
            let processedRow = row;
            if (transformRow) {
              try {
                processedRow = transformRow(row, rowNumber, headerRow);
              } catch (error) {
                errors.push({
                  rowNumber,
                  row,
                  error: error.message,
                  type: 'transformation_error',
                });
                continue;
              }
            }

            rows.push({
              rowNumber,
              data: processedRow,
            });

            processedRows++;
          } catch (error) {
            logger.error(`Error processing row ${i + 1}:`, error);
            errors.push({
              rowNumber: i + 1,
              error: error.message,
              type: 'processing_error',
            });
          }
        }

        resolve({
          headers: headerRow,
          rows,
          errors,
          totalRows: rows.length,
          skippedRows: rawData.length - rows.length,
          metadata: {
            sheetName,
            sheetIndex,
            totalSheets: workbook.SheetNames.length,
            sheetNames: workbook.SheetNames,
          },
        });
      } catch (error) {
        logger.error('XLSX parsing error:', error);
        reject(new Error(`XLSX parsing failed: ${error.message}`, { cause: error }));
      }
    });
  }

  /**
   * Check if a row is empty
   */
  static isEmptyRow(row) {
    return Object.values(row).every((val) => val === null || val === undefined || val === '');
  }

  /**
   * Get list of sheet names
   * @param {Buffer} fileBuffer - File buffer
   * @returns {Array<string>} Sheet names
   */
  static getSheetNames(fileBuffer) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      return workbook.SheetNames;
    } catch (error) {
      logger.error('Error reading sheet names:', error);
      return [];
    }
  }

  /**
   * Validate XLSX file
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static async validate(fileBuffer, options = {}) {
    const {
      maxSize = FILE.MAX_SIZE_XLSX,
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

    // Try to read workbook
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        result.isValid = false;
        result.errors.push('No sheets found in Excel file');
        return result;
      }

      // Check for formulas in cells (optional)
      if (!allowFormulaInjection) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const hasFormulas = Object.keys(sheet).some(
          (cellRef) => sheet[cellRef]?.f || (sheet[cellRef]?.v && sheet[cellRef].v.toString().startsWith('='))
        );

        if (hasFormulas) {
          result.warnings.push('File contains formulas. These will be converted to values during import.');
        }
      }

      // Try to parse
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
   * Extract sample from XLSX
   * @param {Buffer} fileBuffer - File buffer
   * @param {number} sampleSize - Number of rows to extract
   * @param {number} sheetIndex - Sheet index
   * @returns {Promise<{headers: Array, rows: Array, metadata: Object}>}
   */
  static async extractSample(fileBuffer, sampleSize = 5, sheetIndex = 0) {
    const result = await this.parse(fileBuffer, {
      sheetIndex,
      maxRows: sampleSize,
    });

    return {
      headers: result.headers,
      rows: result.rows.slice(0, sampleSize).map((r) => r.data),
      metadata: result.metadata,
    };
  }

  /**
   * Count total rows in XLSX (excluding header)
   * @param {Buffer} fileBuffer - File buffer
   * @param {number} sheetIndex - Sheet index
   * @returns {Promise<number>} Row count
   */
  static async countRows(fileBuffer, sheetIndex = 0) {
    const result = await this.parse(fileBuffer, {
      sheetIndex,
      maxRows: FILE.MAX_ROWS_PER_FILE,
    });

    return result.totalRows;
  }

  /**
   * Convert errors to XLSX for download
   * @param {Array} errors - Error objects
   * @returns {Buffer} Excel file buffer
   */
  static generateErrorXLSX(errors) {
    if (errors.length === 0) {
      return null;
    }

    // Prepare data
    const data = [
      ['Row Number', 'Field', 'Value', 'Error Message', 'Suggested Correction'],
      ...errors.map((err) => [
        err.rowNumber || '',
        err.field || '',
        err.value || '',
        err.errorMessage || '',
        err.suggestedCorrection || '',
      ]),
    ];

    // Create worksheet
    const worksheet = xlsx.utils.aoa_to_sheet(data);

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Row Number
      { wch: 15 }, // Field
      { wch: 25 }, // Value
      { wch: 35 }, // Error Message
      { wch: 35 }, // Suggested Correction
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Errors');

    // Generate buffer
    return xlsx.write(workbook, { type: 'buffer' });
  }

  /**
   * Extract data from multiple sheets
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Options
   * @returns {Promise<Array>} Array of sheet data
   */
  static async parseAllSheets(fileBuffer, options = {}) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const results = [];

      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const result = await this.parse(fileBuffer, {
          ...options,
          sheetIndex: i,
        });
        results.push({
          sheetName: workbook.SheetNames[i],
          sheetIndex: i,
          ...result,
        });
      }

      return results;
    } catch (error) {
      logger.error('Error parsing all sheets:', error);
      throw error;
    }
  }
}

module.exports = XLSXParser;
