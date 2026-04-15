const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {

    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    // Unique filename: fieldname-timestamp-originalExtension
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

function checkFileType(file, cb) {
  // Allowed ext
  // const filetypes = /jpg|jpeg|png|pdf|doc|docx|txt/;
  // const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // const mimetype = filetypes.test(file.mimetype);

  // if (extname && mimetype) {
  //   return cb(null, true);
  // } else {
  //   cb('Error: Images/Docs Only!');
  // }
  // Allow all for now
  cb(null, true);
}

const upload = multer({
  storage,
  // fileFilter: function (req, file, cb) {
  //   checkFileType(file, cb);
  // },

});

module.exports = upload;
