import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
import { uploadBufferToFileManagement } from "../../utils/fileManagementUpload.js";

const { Company } = modelsRegistry;

const COMPANY_FIELDS = [
  "legal_name",
  "trade_name",
  "tagline",
  "gstin",
  "cin",
  "pan",
  "drug_license",
  "fssai_license",
  "email",
  "billing_email",
  "phone",
  "website",
  "logo_url",
  "favicon_url",
  "primary_color",
  "secondary_color",
  "theme_palette",
  "address",
  "city",
  "state",
  "pincode",
  "country",
  "currency",
  "timezone",
  "financial_year",
  "invoice_footer_note",
  "bank_name",
  "account_name",
  "account_number",
  "ifsc_code",
  "branch_name",
  "account_type",
  "upi_id",
  "swift_code",
  "branch_offices",
  "is_default",
];

const COMPANY_POPULATE = [{ path: "updated_by", select: "name email role" }];

function throwError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function parseJsonArray(value, fieldName) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      throwError(`${fieldName} must be an array`);
    }
  }
  throwError(`${fieldName} must be an array`);
}

function normalizeBranchOffices(rawOffices) {
  const offices = parseJsonArray(rawOffices ?? [], "branch_offices");
  const normalized = offices.map((office) => {
    const row = {
      name: String(office?.name ?? "").trim(),
      gstin: String(office?.gstin ?? "").trim().toUpperCase(),
      cin: String(office?.cin ?? "").trim().toUpperCase(),
      pan: String(office?.pan ?? "").trim().toUpperCase(),
      address: String(office?.address ?? "").trim(),
      city: String(office?.city ?? "").trim(),
      state: String(office?.state ?? "").trim(),
      pincode: String(office?.pincode ?? "").trim(),
      country: String(office?.country ?? "").trim(),
      is_head_office: office?.is_head_office === true || office?.is_head_office === "true",
    };
    if (office?._id && mongoose.Types.ObjectId.isValid(office._id)) {
      row._id = office._id;
    }
    return row;
  }).filter((office) =>
    office.name ||
    office.gstin ||
    office.cin ||
    office.pan ||
    office.address ||
    office.city ||
    office.state ||
    office.pincode ||
    office.country,
  );

  if (normalized.length > 0 && !normalized.some((office) => office.is_head_office)) {
    normalized[0].is_head_office = true;
  }

  return normalized.map((office, index) => ({
    ...office,
    is_head_office: office.is_head_office && normalized.findIndex((row) => row.is_head_office) === index,
  }));
}

function syncHeadOfficeFields(payload) {
  const offices = payload.branch_offices || [];
  const head = offices.find((office) => office.is_head_office) || offices[0];
  if (!head) return;
  payload.gstin = head.gstin;
  payload.cin = head.cin;
  payload.pan = head.pan;
  payload.address = head.address;
  payload.city = head.city;
  payload.state = head.state;
  payload.pincode = head.pincode;
  payload.country = head.country;
}

function serializeCompany(company) {
  if (!company) return company;
  const obj = typeof company.toObject === "function" ? company.toObject() : company;
  delete obj.quotation_terms;
  return obj;
}

function pickCompanyFields(body = {}) {
  const payload = {};

  for (const field of COMPANY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;

    if (field === "branch_offices") {
      payload.branch_offices = normalizeBranchOffices(body.branch_offices);
      syncHeadOfficeFields(payload);
      continue;
    }

    if (field === "is_default") {
      payload.is_default = body.is_default === true || body.is_default === "true";
      continue;
    }

    payload[field] = body[field] == null ? "" : String(body[field]);
  }

  return payload;
}

async function unsetOtherDefaults(keepId) {
  await Company.updateMany(
    { _id: { $ne: keepId }, is_default: true },
    { $set: { is_default: false } },
  );
}

function firstUploadedFile(files, field) {
  const value = files?.[field];
  if (Array.isArray(value) && value[0]) return value[0];
  return null;
}

async function applyBrandingUploads(company, files) {
  const logo = firstUploadedFile(files, "logo");
  const favicon = firstUploadedFile(files, "favicon");
  if (!logo && !favicon) return company;

  if (logo) {
    const uploaded = await uploadBufferToFileManagement(logo, "company", company._id);
    company.logo_url = uploaded.secure_url;
  }
  if (favicon) {
    const uploaded = await uploadBufferToFileManagement(favicon, "company", company._id);
    company.favicon_url = uploaded.secure_url;
  }

  await company.save();
  return company;
}

async function promoteAnotherDefault(excludeId) {
  const nextDefault = await Company.findOne({ _id: { $ne: excludeId } }).sort({
    created_at: 1,
  });
  if (!nextDefault) return;
  nextDefault.is_default = true;
  await nextDefault.save();
}

export async function createCompanyService({ user, body, files }) {
  const payload = pickCompanyFields(body);
  const existingCount = await Company.countDocuments();

  payload.is_default = existingCount === 0 ? true : payload.is_default === true;

  const company = await Company.create({
    ...payload,
    updated_by: user?._id || null,
  });

  if (company.is_default) {
    await unsetOtherDefaults(company._id);
  }

  await applyBrandingUploads(company, files);

  return serializeCompany(await Company.findById(company._id).populate(COMPANY_POPULATE));
}

export async function getCompaniesService() {
  const companies = await Company.find({}).populate(COMPANY_POPULATE).sort({ is_default: -1, created_at: -1 });
  return companies.map(serializeCompany);
}

async function findDefaultCompany() {
  return (
    (await Company.findOne({ is_default: true })) ||
    (await Company.findOne({}).sort({ created_at: 1 }))
  );
}

function extractStoredFileId(storedUrl) {
  const value = String(storedUrl || "").trim();
  if (!value) return null;
  const match = value.match(
    /file-management\/files\/([^/?#]+)\/(?:view|download|content)/i,
  );
  return match?.[1] || null;
}

export async function getCompanyBrandingService() {
  const company = await findDefaultCompany();
  if (!company) return null;
  return {
    legal_name: company.legal_name || "",
    trade_name: company.trade_name || "",
    logo_url: company.logo_url || "",
    favicon_url: company.favicon_url || "",
    primary_color: company.primary_color || "#636ccb",
    secondary_color: company.secondary_color || "#6e8cfb",
    theme_palette: company.theme_palette || "default",
    updated_at: company.updated_at,
  };
}

export async function resolveCompanyBrandingAsset(kind) {
  const company = await findDefaultCompany();
  if (!company) return null;
  const storedUrl = kind === "favicon" ? company.favicon_url : company.logo_url;
  if (!String(storedUrl || "").trim()) return null;
  const fileId = extractStoredFileId(storedUrl);
  if (fileId) return { fileId };
  return { redirectUrl: String(storedUrl).trim() };
}

export async function getDefaultCompanyService() {
  const company = await findDefaultCompany();
  if (!company) throwError("Company not found", 404);
  return serializeCompany(await Company.populate(company, COMPANY_POPULATE));
}

export async function getCompanyByIdService({ companyId }) {
  const id = toObjectId(companyId);
  if (!id) throwError("Invalid company id");

  const company = await Company.findById(id).populate(COMPANY_POPULATE);
  if (!company) throwError("Company not found", 404);
  return serializeCompany(company);
}

export async function updateCompanyService({ user, companyId, body, files }) {
  const id = toObjectId(companyId);
  if (!id) throwError("Invalid company id");

  const company = await Company.findById(id);
  if (!company) throwError("Company not found", 404);

  const payload = pickCompanyFields(body);
  const unsettingDefault = payload.is_default === false && company.is_default;

  Object.assign(company, payload, { updated_by: user?._id || company.updated_by });

  if (company.is_default) {
    await unsetOtherDefaults(company._id);
  } else if (unsettingDefault) {
    await promoteAnotherDefault(company._id);
  }

  await company.save();
  await applyBrandingUploads(company, files);
  return serializeCompany(await Company.findById(company._id).populate(COMPANY_POPULATE));
}

export async function setDefaultCompanyService({ user, companyId }) {
  const id = toObjectId(companyId);
  if (!id) throwError("Invalid company id");

  const company = await Company.findById(id);
  if (!company) throwError("Company not found", 404);

  company.is_default = true;
  company.updated_by = user?._id || company.updated_by;
  await company.save();
  await unsetOtherDefaults(company._id);

  return serializeCompany(await Company.findById(company._id).populate(COMPANY_POPULATE));
}

export async function deleteCompanyService({ companyId }) {
  const id = toObjectId(companyId);
  if (!id) throwError("Invalid company id");

  const company = await Company.findById(id);
  if (!company) throwError("Company not found", 404);

  const wasDefault = company.is_default;
  await company.softDelete();

  if (wasDefault) {
    await promoteAnotherDefault(company._id);
  }
}
