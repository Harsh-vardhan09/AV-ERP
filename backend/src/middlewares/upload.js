const multer=require("multer");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // Make sure this folder exists
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Keep the original file name
    },
});

const upload = multer({ storage: storage });
module.exports={
    upload
}