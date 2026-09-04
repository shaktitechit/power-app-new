import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { modelsRegistry } from "../../data/modelRegistry.js";
import { API_PUBLIC_BASE_URL } from "../../config/fileManagement.js";
import {
  getFileMeta,
  getViewPresignedUrl,
} from "../../services/fileManagement/index.js";
import { resolveCompanyBrandingAsset } from "../company/company.services.js";

const { Company } = modelsRegistry;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGE_EMAIL_TEMPLATE_PATH = path.join(
  __dirname,
  "template/emails/template.html",
);

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSentAt(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function publicAppBaseUrl() {
  const api = String(process.env.API_PUBLIC_BASE_URL || "").trim();
  if (/^https?:\/\//i.test(api)) return api.replace(/\/$/, "");
  if (/^https?:\/\//i.test(API_PUBLIC_BASE_URL)) return API_PUBLIC_BASE_URL.replace(/\/$/, "");
  const frontend = String(process.env.FRONTEND_URL || "").split(",")[0].trim();
  if (/^https?:\/\//i.test(frontend)) return frontend.replace(/\/$/, "");
  return "http://localhost:5000";
}

function companyDisplayName(company) {
  return (
    String(company?.legal_name || "").trim() ||
    String(company?.trade_name || "").trim() ||
    "Shakti Powers"
  );
}

function officeAddressLine(office) {
  const cityState = [office?.city, office?.state, office?.pincode].filter(Boolean).join(", ");
  return [office?.address, cityState, office?.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function companyAddressHtml(company) {
  const offices = Array.isArray(company?.branch_offices) ? company.branch_offices : [];
  const lines = offices
    .map((office) => {
      const address = officeAddressLine(office);
      if (!address) return "";
      const label = office.is_head_office
        ? "Head Office"
        : String(office.name || office.city || "Office").trim();
      return `${label}: ${address}`;
    })
    .filter(Boolean);

  if (!lines.length) {
    const fallback = officeAddressLine({
      address: company?.address,
      city: company?.city,
      state: company?.state,
      pincode: company?.pincode,
      country: company?.country,
    });
    if (fallback) lines.push(fallback);
  }

  return lines.map((line) => escapeHtml(line)).join("<br>");
}

function companyCitiesLine(company) {
  const offices = Array.isArray(company?.branch_offices) ? company.branch_offices : [];
  const cities = [...new Set(offices.map((office) => String(office.city || "").trim()).filter(Boolean))];
  if (!cities.length && company?.city) cities.push(String(company.city).trim());
  return cities.join("  ||  ");
}

function companyContactLine(company) {
  return [
    company?.phone && `Phone: ${company.phone}`,
    company?.email && `Email: ${company.email}`,
    company?.website && `Website: ${String(company.website).replace(/^https?:\/\//i, "").replace(/\/$/, "")}`,
  ]
    .filter(Boolean)
    .join("   ");
}

function logoImgHtml(src, alt, width) {
  if (!src) return "";
  return `<img src="${escapeHtml(src)}" alt="" width="${width}" style="display:block;max-width:${width}px;height:auto;border:0;outline:none;text-decoration:none;" />`;
}

export async function findDefaultCompany() {
  return (
    (await Company.findOne({ is_default: true }).lean()) ||
    (await Company.findOne({}).sort({ created_at: 1 }).lean())
  );
}

export async function loadCompanyLogoAttachment() {
  try {
    const asset = await resolveCompanyBrandingAsset("logo");
    if (!asset) return null;

    let buffer;
    let contentType = "image/png";
    let name = "logo.png";

    if (asset.fileId) {
      const meta = await getFileMeta(asset.fileId);
      const presignedUrl = await getViewPresignedUrl(asset.fileId);
      const response = await fetch(presignedUrl);
      if (!response.ok) return null;
      buffer = Buffer.from(await response.arrayBuffer());
      contentType = meta?.mimeType || response.headers.get("content-type") || "image/png";
      name = meta?.originalName || "logo.png";
    } else if (asset.redirectUrl) {
      const response = await fetch(asset.redirectUrl);
      if (!response.ok) return null;
      buffer = Buffer.from(await response.arrayBuffer());
      contentType = response.headers.get("content-type") || "image/png";
    } else {
      return null;
    }

    return {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name,
      contentType,
      contentBytes: buffer.toString("base64"),
      contentId: "company-logo",
      isInline: true,
    };
  } catch {
    return null;
  }
}

export function renderMessageEmailTemplate({
  senderName,
  senderEmail,
  recipientName,
  subject,
  message,
  company,
  logoUrl,
}) {
  const html = fs.readFileSync(MESSAGE_EMAIL_TEMPLATE_PATH, "utf8");
  const name = companyDisplayName(company);
  const primaryColor = String(company?.primary_color || "#636ccb").trim() || "#636ccb";
  const tagline = String(company?.tagline || "").trim();

  return html
    .replaceAll("{{primaryColor}}", escapeHtml(primaryColor))
    .replaceAll("{{companyName}}", escapeHtml(name))
    .replaceAll("{{tagline}}", escapeHtml(tagline))
    .replaceAll("{{headerLogo}}", logoImgHtml(logoUrl, name, 120))
    .replaceAll("{{footerLogo}}", "")
    .replaceAll("{{companyAddress}}", companyAddressHtml(company))
    .replaceAll("{{companyCities}}", escapeHtml(companyCitiesLine(company)))
    .replaceAll("{{companyContact}}", escapeHtml(companyContactLine(company)))
    .replaceAll("{{senderName}}", escapeHtml(senderName || "A colleague"))
    .replaceAll("{{senderEmail}}", escapeHtml(senderEmail || ""))
    .replaceAll("{{recipientName}}", escapeHtml(recipientName || "there"))
    .replaceAll("{{subject}}", escapeHtml(subject || "(no subject)"))
    .replaceAll("{{message}}", escapeHtml(message).replace(/\n/g, "<br>"))
    .replaceAll("{{sentAt}}", escapeHtml(formatSentAt()));
}

export async function buildBrandedEmailHtml(params) {
  const company = await findDefaultCompany();
  const logoAttachment = await loadCompanyLogoAttachment();
  const logoUrl = logoAttachment
    ? "cid:company-logo"
    : company?.logo_url
      ? `${publicAppBaseUrl()}/api/v1/companies/branding/logo`
      : "";

  return {
    company,
    logoAttachment,
    html: renderMessageEmailTemplate({
      ...params,
      company,
      logoUrl,
    }),
  };
}

export function fileToGraphAttachment(file, fallbackName = "attachment") {
  if (!file?.buffer) return null;
  return {
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: file.originalname || fallbackName,
    contentType: file.mimetype || "application/octet-stream",
    contentBytes: file.buffer.toString("base64"),
  };
}
