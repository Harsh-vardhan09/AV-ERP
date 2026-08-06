const multer = require('multer');
const path = require('path');
const fs = require('fs');

// app.js serves /uploads from src/uploads — this file sits two levels below it
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

const genericStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    cb(null, UPLOAD_ROOT);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-${file.originalname}`;
    req.fileName = filename;
    cb(null, filename);
  },
});
const upload = multer({ storage: genericStorage });

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for photo upload'), false);
  }
};

const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(UPLOAD_ROOT, 'students');
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
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Used when the file goes straight to Cloudinary and never touches disk
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
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
