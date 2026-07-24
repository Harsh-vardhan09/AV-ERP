/**
 * File Upload Validator Middleware
 * Validates file before processing for import
 */

const FileSecurityScanner = require('../utils/fileSecurityScanner');
const CSVParser = require('../utils/csvParser');
const XLSXParser = require('../utils/xlsxParser');
const { FILE, MESSAGES, ERROR_CODES } = require('../constants/importConstants');
const logger = require('../../utils/logger');

/**
 * Middleware to validate uploaded import files
 */
const fileUploadValidator = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        code: ERROR_CODES.INVALID_FILE,
      });
    }

    const { fieldname, filename, encoding, mimetype, size, buffer } = req.file;

    // Validate MIME type
    if (!FILE.ALLOWED_MIME_TYPES.includes(mimetype)) {
      return res.status(400).json({
        success: false,
        message: MESSAGES.INVALID_FILE_TYPE,
        code: ERROR_CODES.INVALID_FILE,
        receivedMimetype: mimetype,
        allowedMimetypes: FILE.ALLOWED_MIME_TYPES,
      });
    }

    // Validate file size
    const maxSize = FILE.CSV_MIME_TYPES.includes(mimetype) ? FILE.MAX_SIZE_CSV : FILE.MAX_SIZE_XLSX;

    if (size > maxSize) {
      return res.status(400).json({
        success: false,
        message: MESSAGES.FILE_TOO_LARGE,
        code: ERROR_CODES.FILE_TOO_LARGE,
        fileSize: size,
        maxSize,
        sizeInMB: (size / (1024 * 1024)).toFixed(2),
      });
    }

    // Perform security scan
    logger.info(`Performing security scan on file: ${filename}`);
    const securityScan = await FileSecurityScanner.scan(buffer, {
      allowFormulaInjection: false,
      allowDangerousPatterns: false,
    });

    // Check for critical threats
    if (!securityScan.safe) {
      logger.warn(`Security threats detected in file: ${filename}`, securityScan.threats);
      return res.status(400).json({
        success: false,
        message: 'File contains potentially malicious content',
        code: ERROR_CODES.INVALID_FILE,
        threats: securityScan.threats,
        severity: FileSecurityScanner.getSummarySeverity(securityScan),
      });
    }

    // Validate file structure
    let fileStructure = null;
    try {
      if (FILE.CSV_MIME_TYPES.includes(mimetype)) {
        // CSV validation
        const csvValidation = await CSVParser.validate(buffer, {
          maxSize,
          maxRows: FILE.MAX_ROWS_PER_FILE,
        });

        if (!csvValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'CSV file structure is invalid',
            code: ERROR_CODES.INVALID_FILE,
            errors: csvValidation.errors,
            warnings: csvValidation.warnings,
          });
        }

        // Extract structure
        const sample = await CSVParser.extractSample(buffer, 5);
        fileStructure = {
          type: 'csv',
          headers: sample.headers,
          sampleRows: sample.rows,
          totalRows: await CSVParser.countRows(buffer),
        };
      } else if (FILE.XLSX_MIME_TYPES.includes(mimetype)) {
        // XLSX validation
        const xlsxValidation = await XLSXParser.validate(buffer, {
          maxSize,
          maxRows: FILE.MAX_ROWS_PER_FILE,
        });

        if (!xlsxValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Excel file structure is invalid',
            code: ERROR_CODES.INVALID_FILE,
            errors: xlsxValidation.errors,
            warnings: xlsxValidation.warnings,
          });
        }

        // Extract structure
        const sample = await XLSXParser.extractSample(buffer, 5);
        fileStructure = {
          type: 'xlsx',
          headers: sample.headers,
          sampleRows: sample.rows,
          totalRows: await XLSXParser.countRows(buffer),
          metadata: sample.metadata,
        };
      }
    } catch (error) {
      logger.error(`File structure validation error for ${filename}:`, error);
      return res.status(400).json({
        success: false,
        message: 'Unable to parse file structure',
        code: ERROR_CODES.INVALID_FILE,
        error: error.message,
      });
    }

    // Check if file has headers
    if (!fileStructure.headers || fileStructure.headers.length === 0) {
      return res.status(400).json({
        success: false,
        message: MESSAGES.INVALID_HEADERS,
        code: ERROR_CODES.INVALID_HEADERS,
      });
    }

    // Store validated file info in req
    req.fileValidation = {
      filename,
      mimetype,
      size,
      buffer,
      structure: fileStructure,
      security: {
        safe: true,
        warnings: securityScan.warnings,
      },
      uploadedAt: new Date(),
    };

    logger.info(`File validation successful: ${filename}`, {
      size,
      headers: fileStructure.headers.length,
      rows: fileStructure.totalRows,
    });

    next();
  } catch (error) {
    logger.error('File upload validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during file validation',
      code: ERROR_CODES.SYSTEM_ERROR,
      error: error.message,
    });
  }
};

module.exports = {
  fileUploadValidator,
};
