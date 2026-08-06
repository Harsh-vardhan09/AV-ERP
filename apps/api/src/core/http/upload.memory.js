const multer = require('multer');

const memStorage = multer.memoryStorage();
const uploadMemory = multer({
  storage: memStorage,
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = uploadMemory;
