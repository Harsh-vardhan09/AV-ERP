// src/middlewares/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Generic disk storage (assignments, etc.) ─────────────────────────────────
const genericStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-${file.originalname}`;
    req.fileName = filename;
    cb(null, filename);
  },
});
const upload = multer({ storage: genericStorage });

// ─── Image-only storage for student/staff photos ─────────────────────────────
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for photo upload'), false);
  }
};

const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '..', 'uploads', 'students');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `photo-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─── In-memory storage (used when uploading directly to Cloudinary) ───────────
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB for template images
});

const templateFileFilter = (req, file, cb) => {
  const ok = ['image/png', 'image/jpeg', 'application/pdf'].includes(file.mimetype);
  if (ok) return cb(null, true);
  return cb(new Error('Only PNG, JPG, or PDF templates are allowed'), false);
};

const uploadTemplateMemory = multer({
  storage: memoryStorage,
  fileFilter: templateFileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

module.exports = upload;
module.exports.uploadPhoto = uploadPhoto;
module.exports.uploadMemory = uploadMemory;
module.exports.uploadTemplateMemory = uploadTemplateMemory;
