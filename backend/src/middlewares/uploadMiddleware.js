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

// Senders may swap the generated PDF for a signed scan or an office document,
// so email attachments accept more than the in-app document uploads do.
const EMAIL_ATTACHMENT_EXTENSIONS = new Set([
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
  ".txt",
  ".rtf",
  ".zip",
]);

const emailAttachmentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (isAllowedUpload(file) || EMAIL_ATTACHMENT_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Attachment must be an image, PDF, or office document"), false);
  }
};

export const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).array("documents", 10);

export const uploadEmailAttachment = multer({
  storage,
  fileFilter: emailAttachmentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("attachment");

const BRANDING_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".ico",
  ".bmp",
]);

function isAllowedBrandingImage(file) {
  if (file.mimetype.startsWith("image/")) return true;
  const ext = path.extname(file.originalname || "").toLowerCase();
  return BRANDING_EXTENSIONS.has(ext);
}

export const uploadCompanyBranding = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (isAllowedBrandingImage(file)) cb(null, true);
    else cb(new Error("Only image files are allowed for logo and favicon"), false);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
]);
