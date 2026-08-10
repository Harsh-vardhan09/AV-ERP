const { v2 } = require('cloudinary');
const fs = require('fs');
const env = require('./env.js');
const logger = require('../logging/logger.js');

// The SDK only self-configures from CLOUDINARY_URL; we ship the three separate
// vars, so without this every upload fails with "Must supply api_key"
v2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const isConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);
if (!isConfigured) {
  logger.warn('[Cloudinary] Credentials missing — file uploads will fail');
}

const path = require('path');

const uploadoncloud = async (localfilepath) => {
  try {
    if (!localfilepath) return null;

    // Determine resource type from file extension
    const ext = (path.extname(localfilepath) || '').toLowerCase();
    let resource_type = 'raw';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'].includes(ext)) {
      resource_type = 'image';
    } else if (ext === '.pdf') {
      // serve PDF via image delivery so Cloudinary doesn't restrict raw/pdf delivery
      resource_type = 'image';
    }

    // sanitize filename for public_id: allow a-z0-9._- only
    const base = path.basename(localfilepath);
    const nameOnly = base.replace(/\.[^/.]+$/, '');
    const sanitized = nameOnly
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);

    const rand = Math.floor(Math.random() * 90000) + 10000;
    const publicId = `erp/assignments/${Date.now()}-${rand}-${sanitized}`;

    const response = await v2.uploader.upload(localfilepath, {
      resource_type,
      public_id: publicId,
      folder: undefined,
    });

    // Ensure callers that read `url` get an HTTPS URL (secure_url)
    if (response && response.secure_url) response.url = response.secure_url;

    logger.info(`[Cloudinary] Uploaded: ${response.url}`);
    try {
      fs.unlinkSync(localfilepath);
    } catch (_) {}
    return response;
  } catch (error) {
    logger.error('[Cloudinary] Upload failed', { error: error.message });
    try {
      fs.unlinkSync(localfilepath);
    } catch (_) {}
    return null;
  }
};

const uploadImageToCloud = async (source, options = {}) => {
  try {
    const defaults = {
      resource_type: 'image',
      folder: options.folder || 'erp/students',
      overwrite: true,
      ...options,
    };

    let response;
    if (typeof source === 'string') {
      response = await v2.uploader.upload(source, defaults);
      try {
        fs.unlinkSync(source);
      } catch (_) {}
    } else if (Buffer.isBuffer(source)) {
      response = await new Promise((resolve, reject) => {
        const uploadStream = v2.uploader.upload_stream(defaults, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        uploadStream.end(source);
      });
    } else {
      throw new Error('source must be a file path string or Buffer');
    }

    console.log(`[Cloudinary] Image uploaded: ${response.secure_url}`);
    return response;
  } catch (error) {
    console.error('[Cloudinary] Image upload error:', error.message);
    if (typeof source === 'string') {
      try {
        fs.unlinkSync(source);
      } catch (_) {}
    }
    throw error;
  }
};

const deleteFromCloud = async (publicId) => {
  if (!publicId) return;
  try {
    await v2.uploader.destroy(publicId, { resource_type: 'image' });
    console.log(`[Cloudinary] Deleted asset: ${publicId}`);
  } catch (err) {
    console.error('[Cloudinary] Delete error:', err.message);
  }
};

const uploadPdfToCloud = async (buffer, options = {}) => {
  const defaults = {
    resource_type: 'raw',
    folder: options.folder || 'erp/oases/pdfs',
    overwrite: true,
    ...options,
  };

  return new Promise((resolve, reject) => {
    const uploadStream = v2.uploader.upload_stream(defaults, (err, result) => {
      if (err) {
        console.error('[Cloudinary] PDF upload error:', err.message);
        return reject(err);
      }
      console.log(`[Cloudinary] PDF uploaded: ${result.secure_url}`);
      resolve(result);
    });
    uploadStream.end(buffer);
  });
};

module.exports = { uploadoncloud, uploadImageToCloud, deleteFromCloud, uploadPdfToCloud };
