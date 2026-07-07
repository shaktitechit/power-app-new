import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

function isAllowedUpload(file) {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
    return true;
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) || PDF_EXTENSIONS.has(ext);
}

const fileFilter = (req, file, cb) => {
  if (isAllowedUpload(file)) cb(null, true);
  else cb(new Error("Only images and PDFs are allowed"), false);
};

export const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).array("documents", 10);
