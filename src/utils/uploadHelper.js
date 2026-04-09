const multer = require("multer");
const path = require("path");
const fs = require("fs");

const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// ✅ Dynamic destination — complaint ya profile dono handle karega
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route ke hisaab se folder decide hoga
    let uploadPath = "uploads/complaints"; // default

    if (req.baseUrl.includes("auth") || req.path.includes("profile")) {
      uploadPath = "uploads/profiles";
    }

    createDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const prefix = req.baseUrl.includes("auth") ? "profile" : "complaint";
    cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only images (jpeg, jpg, png, webp) are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;