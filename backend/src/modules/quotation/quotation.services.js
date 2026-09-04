import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
import { createRecentActivity } from "../../helpers/createRecentActivity.js";
import { buildActivityMessage } from "../../helpers/buildActivityMessage.js";
import {
  applyEnquiryVisibilityFilter,
  AUDIT_TYPES,
  resolveAccessibleEnquiry,
  savePipelineAdvance,
  sumRequestedAudits,
} from "../enquiry/enquiry.services.js";
import { getFlattenedQuotationTerms, getFlattenedQuotationTermsByIds } from "../terms-conditions/terms-conditions.services.js";
import {
  isMicrosoftGraphConfigured,
  MICROSOFT_GRAPH_MAILBOX,
} from "../../config/microsoftGraph.js";
import {
  sendGraphMail,
} from "../../services/microsoftGraph/graphMail.js";
import {
  buildBrandedEmailHtml,
  fileToGraphAttachment,
} from "../message/emailTemplate.js";

const { Quotation, Company, Enquiry, User } = modelsRegistry;

const QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

const STATUS_TRANSITIONS = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "DRAFT"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["DRAFT", "CANCELLED"],
  EXPIRED: ["DRAFT", "CANCELLED"],
  CANCELLED: ["DRAFT"],
};

const LOCKED_STATUSES = new Set(["ACCEPTED", "REJECTED", "CANCELLED"]);

const SIGNATORY_ROLES = ["super_admin", "admin", "manager"];

const SIGNATORY_DESIGNATION = {
  super_admin: "Director",
  admin: "Admin",
  manager: "Manager",
};

const QUOTATION_POPULATE = [
  { path: "createdBy", select: "name email role" },
  { path: "updatedBy", select: "name email role" },
  { path: "signatory.userId", select: "name email role" },
  { path: "enquiryId", select: "name city enquiry_number enquiry_status client_representative" },
];

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
];
const TEENS = [
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
  "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function throwError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function twoDigits(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${TENS[tens]}${ones ? ` ${ONES[ones]}` : ""}`.trim();
}

function threeDigits(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

function numberToIndianWords(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "Zero";
  if (n < 100) return twoDigits(n);
  if (n < 1000) return threeDigits(n);
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    return `${twoDigits(thousands)} Thousand${rest ? ` ${numberToIndianWords(rest)}` : ""}`;
  }
  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const rest = n % 100000;
    return `${twoDigits(lakhs)} Lakh${rest ? ` ${numberToIndianWords(rest)}` : ""}`;
  }
  const crores = Math.floor(n / 10000000);
  const rest = n % 10000000;
  return `${numberToIndianWords(crores)} Crore${rest ? ` ${numberToIndianWords(rest)}` : ""}`;
}

export function amountInWordsInr(amount) {
  const rounded = Math.round(Number(amount) || 0);
  return `Rupees ${numberToIndianWords(rounded)} Only`;
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function joinAddressParts(...parts) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeItems(rawItems) {
  const items = parseMaybeJson(rawItems);
  if (!Array.isArray(items) || items.length === 0) {
    throwError("Quotation must contain at least one item.");
  }

  return items.map((item, index) => {
    const description = String(item?.description || "").trim();
    if (!description) throwError(`Item ${index + 1} is missing a description`);

    const quantity = Number(item?.quantity);
    const rate = Number(item?.rate);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throwError(`Item ${index + 1} has an invalid quantity`);
    }
    if (!Number.isFinite(rate) || rate < 0) {
      throwError(`Item ${index + 1} has an invalid rate`);
    }

    const amount = item?.amount == null ? round2(quantity * rate) : round2(item.amount);

    return {
      srNo: Number.isFinite(Number(item?.srNo)) ? Number(item.srNo) : index + 1,
      description,
      hsnSac: String(item?.hsnSac || "").trim(),
      quantity,
      unit: String(item?.unit || "Nos").trim() || "Nos",
      rate,
      amount,
    };
  });
}

function computeFinancials(items, financialsInput = {}) {
  const input = parseMaybeJson(financialsInput) || {};
  const gstRate = Number.isFinite(Number(input.gstRate)) ? Number(input.gstRate) : 18;
  if (gstRate < 0) throwError("gstRate cannot be negative");

  const subtotal = round2(items.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const totalGst = round2(subtotal * (gstRate / 100));

  const taxType = String(input.taxType || "").toLowerCase();
  const wantsIgst =
    taxType === "inter" ||
    taxType === "igst" ||
    Number(input.igst) > 0;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (wantsIgst) {
    igst = totalGst;
  } else {
    cgst = round2(totalGst / 2);
    sgst = round2(totalGst - cgst);
  }

  const grandTotal = round2(subtotal + totalGst);
  const roundedGrandTotal = Math.round(grandTotal);

  return {
    subtotal,
    gstRate,
    cgst,
    sgst,
    igst,
    totalGst,
    grandTotal,
    roundedGrandTotal,
    amountInWords: amountInWordsInr(roundedGrandTotal),
  };
}

function normalizeTerms(rawTerms) {
  const terms = parseMaybeJson(rawTerms);
  if (terms == null) return undefined;
  if (!Array.isArray(terms)) throwError("termsAndConditions must be an array");

  return terms
    .map((term, index) => {
      if (typeof term === "string") {
        const content = term.trim();
        if (!content) return null;
        return {
          termNo: index + 1,
          title: `Term ${index + 1}`,
          content,
        };
      }

      const content = String(term?.content || "").trim();
      const title = String(term?.title || "").trim();
      if (!content || !title) return null;

      return {
        termNo: Number.isFinite(Number(term?.termNo)) ? Number(term.termNo) : index + 1,
        title,
        content,
      };
    })
    .filter(Boolean);
}

async function findDefaultCompany() {
  return (
    (await Company.findOne({ is_default: true })) ||
    (await Company.findOne({}).sort({ created_at: 1 }))
  );
}

function snapshotCompany(company, override = {}) {
  const source = parseMaybeJson(override) || {};
  const name =
    String(source.name || "").trim() ||
    String(company?.legal_name || "").trim() ||
    String(company?.trade_name || "").trim() ||
    "Shakti Power Solutions Pvt. Ltd.";

  const address =
    String(source.address || "").trim() ||
    joinAddressParts(
      company?.address,
      company?.city,
      company?.state,
      company?.pincode,
      company?.country,
    );

  if (!address) throwError("Company address is required to create a quotation");

  return {
    name,
    address,
    phone: String(source.phone || company?.phone || "").trim(),
    mobile: String(source.mobile || "").trim(),
    email: String(source.email || company?.email || "").trim(),
    website: String(source.website || company?.website || "").trim(),
    gstin: String(source.gstin || company?.gstin || "").trim(),
  };
}

function snapshotBankDetails(company, override = {}) {
  const source = parseMaybeJson(override) || {};
  const bankDetails = {
    beneficiaryName: String(source.beneficiaryName || company?.account_name || "").trim(),
    accountNo: String(source.accountNo || company?.account_number || "").trim(),
    bankName: String(source.bankName || company?.bank_name || "").trim(),
    branch: String(source.branch || company?.branch_name || "").trim(),
    ifscCode: String(source.ifscCode || company?.ifsc_code || "").trim().toUpperCase(),
    swiftCode: String(source.swiftCode || company?.swift_code || "").trim().toUpperCase(),
    micrCode: String(source.micrCode || "").trim(),
  };

  if (!bankDetails.beneficiaryName || !bankDetails.accountNo || !bankDetails.bankName || !bankDetails.ifscCode) {
    throwError("Bank details (beneficiaryName, accountNo, bankName, ifscCode) are required");
  }

  return bankDetails;
}

function snapshotCustomer(enquiry, override = {}) {
  const source = parseMaybeJson(override) || {};
  const primaryRep = Array.isArray(enquiry?.client_representatives)
    ? enquiry.client_representatives[0]
    : null;

  const name = String(source.name || enquiry?.name || "").trim();
  const address =
    String(source.address || "").trim() ||
    joinAddressParts(enquiry?.address, enquiry?.city);

  if (!name) throwError("Customer name is required");
  if (!address) throwError("Customer address is required");

  return {
    customerId: source.customerId || enquiry?._id || null,
    name,
    address,
    gstin: String(source.gstin || "").trim(),
    phone: String(source.phone || enquiry?.client_contact_number || primaryRep?.contact_number || "").trim(),
    mobile: String(source.mobile || enquiry?.client_contact_number || primaryRep?.contact_number || "").trim(),
    email: String(source.email || enquiry?.client_email || primaryRep?.email || "").trim(),
    kindAttn: String(
      source.kindAttn ||
      enquiry?.client_representative ||
      primaryRep?.name ||
      "",
    ).trim(),
  };
}

function snapshotSignatory(user, company, override = {}) {
  const source = parseMaybeJson(override) || {};
  const name = String(source.name || user?.name || "").trim();
  if (!name) throwError("Signatory name is required");

  const role = String(user?.role || "").trim();
  return {
    userId: source.userId || user?._id || null,
    name,
    designation:
      String(source.designation || SIGNATORY_DESIGNATION[role] || "Authorized Signatory").trim() ||
      "Authorized Signatory",
    companyName:
      String(source.companyName || company?.legal_name || company?.trade_name || "Shakti Power Solutions Pvt. Ltd.").trim(),
    signature: String(source.signature || "").trim(),
    signatureDate: source.signatureDate ? new Date(source.signatureDate) : undefined,
    seal: String(source.seal || "").trim(),
  };
}

async function resolveSignatory(actingUser, company, override = {}) {
  const source = parseMaybeJson(override) || {};
  const requestedId = toObjectId(source.userId);
  let signatoryUser = actingUser;

  if (requestedId) {
    const found = await User.findById(requestedId).select("name email role status");
    if (!found) throwError("Signatory user not found", 404);
    if (!SIGNATORY_ROLES.includes(found.role)) {
      throwError("Signatory must be an admin, super admin, or manager");
    }
    if (found.status && found.status !== "active") {
      throwError("Signatory user is not active");
    }
    signatoryUser = found;
  } else if (!SIGNATORY_ROLES.includes(String(actingUser?.role || ""))) {
    throwError("Select a signatory (admin, super admin, or manager)");
  }

  return snapshotSignatory(signatoryUser, company, {
    ...source,
    userId: signatoryUser?._id,
    name: source.name || signatoryUser?.name,
  });
}

export async function getQuotationSignatoriesService() {
  return User.find({
    role: { $in: SIGNATORY_ROLES },
    status: { $ne: "inactive" },
  })
    .select("name email role")
    .sort({ name: 1 })
    .lean();
}

function snapshotOrderAcceptance(customer, override = {}) {
  const source = parseMaybeJson(override);
  if (source == null) {
    return {
      enabled: true,
      customerName: customer?.kindAttn || "",
      companyName: customer?.name || "",
    };
  }

  return {
    enabled: source.enabled !== false && source.enabled !== "false",
    customerName: String(source.customerName || customer?.kindAttn || "").trim(),
    companyName: String(source.companyName || customer?.name || "").trim(),
    designation: String(source.designation || "").trim(),
    acceptedDate: source.acceptedDate ? new Date(source.acceptedDate) : undefined,
    remarks: String(source.remarks || "").trim(),
    signature: String(source.signature || "").trim(),
    companySeal: String(source.companySeal || "").trim(),
  };
}

async function generateQuotationRef(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `QT-SPL/${dateStr}/`;

  const latest = await Quotation.findOne({
    quotationRef: new RegExp(`^QT-SPL\\/${dateStr}\\/`),
  })
    .sort({ quotationRef: -1 })
    .select("quotationRef")
    .exec();

  let nextSerial = 1;
  if (latest?.quotationRef) {
    const lastPart = latest.quotationRef.split("/").pop();
    const parsed = parseInt(lastPart, 10);
    if (!Number.isNaN(parsed)) nextSerial = parsed + 1;
  }

  return `${prefix}${String(nextSerial).padStart(3, "0")}`;
}

function parseStatus(value, fallback) {
  if (value == null || value === "") return fallback;
  const status = String(value).trim().toUpperCase();
  if (!QUOTATION_STATUSES.includes(status)) {
    throwError(`Invalid status. Allowed: ${QUOTATION_STATUSES.join(", ")}`);
  }
  return status;
}

function parseDate(value, fieldName) {
  if (value == null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throwError(`Invalid ${fieldName}`);
  return date;
}

function defaultValidUntil(quotationDate) {
  const date = new Date(quotationDate);
  date.setDate(date.getDate() + 30);
  return date;
}

async function populateQuotation(quotation) {
  if (!quotation) return null;
  return Quotation.populate(quotation, QUOTATION_POPULATE);
}

async function logQuotationActivity({ user, action, quotation, extraMessage }) {
  await createRecentActivity({
    actor: user,
    action,
    entity_type: "quotation",
    entity_id: quotation._id,
    entity_name: quotation.quotationRef,
    message:
      extraMessage ||
      buildActivityMessage({
        actorName: user?.name || "User",
        action,
        entityLabel: "quotation",
        entityName: quotation.quotationRef,
      }),
    meta: {
      enquiry_id: quotation.enquiryId || null,
      status: quotation.status,
    },
  });
}

async function assertQuotationAccess(user, quotation) {
  if (!quotation) throwError("Quotation not found", 404);
  if (user?.role === "super_admin") return quotation;

  if (quotation.createdBy && String(quotation.createdBy) === String(user._id)) {
    return quotation;
  }

  const enquiryId = quotation.enquiryId || quotation.leadId;
  if (!enquiryId) {
    throwError("Quotation not found", 404);
  }

  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) throwError("Quotation not found", 404);
  return quotation;
}

async function accessibleEnquiryIds(user) {
  if (user?.role === "super_admin") return null;

  const query = {};
  applyEnquiryVisibilityFilter(query, user);
  return Enquiry.find(query).distinct("_id");
}

function enquiryRefId(value) {
  if (!value) return null;
  return typeof value === "object" ? value._id || null : value;
}

async function loadLinkedEnquiry(quotation) {
  const id = enquiryRefId(quotation?.enquiryId) || enquiryRefId(quotation?.leadId);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return Enquiry.findById(id);
}

async function advanceEnquiryIfQuoted(enquiry, status) {
  if (!enquiry) return;
  if (status === "SENT" || status === "ACCEPTED") {
    await savePipelineAdvance(enquiry, "quoted");
  }
}

async function quoteLinkedEnquiry(quotation, status = "SENT") {
  const enquiry = await loadLinkedEnquiry(quotation);
  await advanceEnquiryIfQuoted(enquiry, status);
}

/** Audit type a line item quotes, or `null` for anything else. */
function itemAuditType(item) {
  const description = String(item?.description || "").trim().toLowerCase();
  if (!description) return null;
  return AUDIT_TYPES.find((type) => type.toLowerCase() === description) || null;
}

/**
 * Quoted amounts are the latest word on what an audit is worth, so they
 * overwrite the enquiry's expected value for the audits they cover. Audits the
 * quotation says nothing about keep whatever the enquiry already had.
 */
async function syncEnquiryValuesFromQuotation(quotation, enquiryDoc = null) {
  const quoted = new Map();
  for (const item of quotation?.items ?? []) {
    const auditType = itemAuditType(item);
    if (!auditType) continue;
    const amount = Number(item?.amount);
    quoted.set(
      auditType,
      (quoted.get(auditType) || 0) + (Number.isFinite(amount) ? amount : 0),
    );
  }
  if (quoted.size === 0) return;

  const enquiry = enquiryDoc || (await loadLinkedEnquiry(quotation));
  if (!enquiry) return;

  const values = new Map(
    (enquiry.requested_audits ?? []).map((row) => [
      row.audit_type,
      Number(row.expected_value) || 0,
    ]),
  );
  for (const [auditType, amount] of quoted) values.set(auditType, amount);

  const rows = AUDIT_TYPES.filter((type) => values.has(type)).map((audit_type) => ({
    audit_type,
    expected_value: values.get(audit_type),
  }));

  enquiry.requested_audits = rows;
  enquiry.requested_audit_types = rows.map((row) => row.audit_type);
  enquiry.expected_value = sumRequestedAudits(rows);
  await enquiry.save();
}

export async function createQuotationService({ user, body = {} }) {
  const enquiryId = body.enquiryId || body.leadId || null;
  let enquiry = null;

  if (enquiryId) {
    enquiry = await resolveAccessibleEnquiry(user, enquiryId);
    if (!enquiry) throwError("Enquiry not found", 404);
    const enquiryStatus = String(enquiry.enquiry_status || "").toLowerCase();
    if (["won", "lost", "dropped"].includes(enquiryStatus)) {
      throwError("Quotations can only be created for enquiries that are still in the pipeline");
    }
  }

  const items = normalizeItems(body.items);
  const financials = computeFinancials(items, body.financials);
  const companyDoc = await findDefaultCompany();
  const company = snapshotCompany(companyDoc, body.company);
  const customer = snapshotCustomer(enquiry, body.customer);
  const bankDetails = snapshotBankDetails(companyDoc, body.bankDetails);
  const signatory = await resolveSignatory(user, companyDoc, body.signatory);
  const termsAndConditions = Array.isArray(body.termsConditionsIds)
    ? await getFlattenedQuotationTermsByIds(body.termsConditionsIds)
    : normalizeTerms(body.termsAndConditions) ?? (await getFlattenedQuotationTerms());
  const orderAcceptance = snapshotOrderAcceptance(customer, body.orderAcceptance);

  const quotationDate = parseDate(body.quotationDate, "quotationDate") || new Date();
  const validUntil =
    parseDate(body.validUntil, "validUntil") || defaultValidUntil(quotationDate);
  const status = parseStatus(body.status, "DRAFT");

  const subject =
    String(body.subject || "").trim() ||
    (enquiry
      ? `Quotation for ${enquiry.name}${enquiry.city ? ` — ${enquiry.city}` : ""}`
      : "");
  if (!subject) throwError("Subject is required");

  const payload = {
    quotationRef: String(body.quotationRef || "").trim() || (await generateQuotationRef(quotationDate)),
    quotationDate,
    validUntil,
    reference: String(body.reference || enquiry?.enquiry_number || "").trim(),
    subject,
    company,
    customer,
    enquiryId: enquiry?._id || null,
    leadId: enquiry?._id || toObjectId(body.leadId),
    opportunityId: toObjectId(body.opportunityId),
    items,
    financials,
    termsAndConditions,
    bankDetails,
    signatory,
    orderAcceptance,
    status,
    pdfUrl: String(body.pdfUrl || "").trim(),
    internalNotes: String(body.internalNotes || "").trim(),
    createdBy: user?._id || null,
    updatedBy: user?._id || null,
  };

  let quotation;
  try {
    quotation = await Quotation.create(payload);
  } catch (error) {
    if (error?.code === 11000) {
      payload.quotationRef = await generateQuotationRef(quotationDate);
      quotation = await Quotation.create(payload);
    } else {
      throw error;
    }
  }

  await advanceEnquiryIfQuoted(enquiry, status);
  await syncEnquiryValuesFromQuotation(quotation, enquiry);
  await logQuotationActivity({ user, action: "created", quotation });
  return populateQuotation(quotation);
}

export async function getQuotationsService({ user, query = {} }) {
  const filter = {};

  if (query.enquiryId || query.leadId) {
    const enquiry = await resolveAccessibleEnquiry(user, query.enquiryId || query.leadId);
    if (!enquiry) throwError("Enquiry not found", 404);
    filter.enquiryId = enquiry._id;
  } else {
    const ids = await accessibleEnquiryIds(user);
    if (ids) {
      filter.$or = [{ enquiryId: { $in: ids } }, { createdBy: user._id }];
    }
  }

  if (query.status) {
    filter.status = parseStatus(query.status);
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { quotationRef: new RegExp(search, "i") },
            { subject: new RegExp(search, "i") },
            { "customer.name": new RegExp(search, "i") },
            { reference: new RegExp(search, "i") },
          ],
        },
      ];
    }
  }

  return Quotation.find(filter)
    .populate(QUOTATION_POPULATE)
    .sort({ quotationDate: -1, created_at: -1 });
}

export async function getQuotationByIdService({ user, quotationId }) {
  const id = toObjectId(quotationId);
  if (!id) throwError("Invalid quotation id");

  const quotation = await Quotation.findById(id);
  await assertQuotationAccess(user, quotation);
  return populateQuotation(quotation);
}

export async function updateQuotationService({ user, quotationId, body = {} }) {
  const id = toObjectId(quotationId);
  if (!id) throwError("Invalid quotation id");

  const quotation = await Quotation.findById(id);
  await assertQuotationAccess(user, quotation);

  if (LOCKED_STATUSES.has(quotation.status)) {
    throwError(`${quotation.status} quotations cannot be edited`);
  }

  if (body.items) {
    quotation.items = normalizeItems(body.items);
    quotation.financials = computeFinancials(quotation.items, body.financials || quotation.financials);
  } else if (body.financials) {
    quotation.financials = computeFinancials(quotation.items, {
      ...quotation.financials.toObject?.() || quotation.financials,
      ...parseMaybeJson(body.financials),
    });
  }

  if (body.company) {
    quotation.company = snapshotCompany(null, {
      ...quotation.company.toObject?.() || quotation.company,
      ...parseMaybeJson(body.company),
    });
  }

  if (body.customer) {
    quotation.customer = snapshotCustomer(null, {
      ...quotation.customer.toObject?.() || quotation.customer,
      ...parseMaybeJson(body.customer),
    });
  }

  if (body.bankDetails) {
    quotation.bankDetails = snapshotBankDetails(null, {
      ...quotation.bankDetails.toObject?.() || quotation.bankDetails,
      ...parseMaybeJson(body.bankDetails),
    });
  }

  if (body.signatory) {
    quotation.signatory = await resolveSignatory(user, null, {
      ...quotation.signatory.toObject?.() || quotation.signatory,
      ...parseMaybeJson(body.signatory),
    });
  }

  if (Array.isArray(body.termsConditionsIds)) {
    quotation.termsAndConditions = await getFlattenedQuotationTermsByIds(body.termsConditionsIds);
  } else if (Array.isArray(body.termsAndConditions)) {
    quotation.termsAndConditions = normalizeTerms(body.termsAndConditions) || [];
  }

  if (body.orderAcceptance) {
    quotation.orderAcceptance = snapshotOrderAcceptance(quotation.customer, {
      ...quotation.orderAcceptance.toObject?.() || quotation.orderAcceptance,
      ...parseMaybeJson(body.orderAcceptance),
    });
  }

  if (body.subject !== undefined) {
    const subject = String(body.subject || "").trim();
    if (!subject) throwError("Subject is required");
    quotation.subject = subject;
  }

  if (body.reference !== undefined) quotation.reference = String(body.reference || "").trim();
  if (body.internalNotes !== undefined) quotation.internalNotes = String(body.internalNotes || "").trim();
  if (body.pdfUrl !== undefined) quotation.pdfUrl = String(body.pdfUrl || "").trim();
  if (body.quotationDate !== undefined) quotation.quotationDate = parseDate(body.quotationDate, "quotationDate");
  if (body.validUntil !== undefined) quotation.validUntil = parseDate(body.validUntil, "validUntil");

  if (body.status !== undefined) {
    const nextStatus = parseStatus(body.status);
    if (nextStatus !== quotation.status) {
      const allowed = STATUS_TRANSITIONS[quotation.status] || [];
      if (!allowed.includes(nextStatus)) {
        throwError(`Cannot change status from ${quotation.status} to ${nextStatus}`);
      }
      quotation.status = nextStatus;
    }
  }

  quotation.updatedBy = user?._id || quotation.updatedBy;
  await quotation.save();

  if (quotation.status === "SENT" || quotation.status === "ACCEPTED") {
    await quoteLinkedEnquiry(quotation, quotation.status);
  }

  if (body.items) {
    await syncEnquiryValuesFromQuotation(quotation);
  }

  await logQuotationActivity({ user, action: "updated", quotation });
  return populateQuotation(quotation);
}

export async function updateQuotationStatusService({ user, quotationId, body = {} }) {
  const id = toObjectId(quotationId);
  if (!id) throwError("Invalid quotation id");

  const quotation = await Quotation.findById(id);
  await assertQuotationAccess(user, quotation);

  const nextStatus = parseStatus(body.status);
  if (nextStatus === quotation.status) {
    return populateQuotation(quotation);
  }

  const allowed = STATUS_TRANSITIONS[quotation.status] || [];
  if (!allowed.includes(nextStatus)) {
    throwError(`Cannot change status from ${quotation.status} to ${nextStatus}`);
  }

  const previousStatus = quotation.status;
  quotation.status = nextStatus;
  quotation.updatedBy = user?._id || quotation.updatedBy;

  if (nextStatus === "ACCEPTED" && body.orderAcceptance) {
    quotation.orderAcceptance = snapshotOrderAcceptance(quotation.customer, {
      ...quotation.orderAcceptance.toObject?.() || quotation.orderAcceptance,
      ...parseMaybeJson(body.orderAcceptance),
      enabled: true,
      acceptedDate: body.orderAcceptance.acceptedDate || new Date(),
    });
  }

  await quotation.save();

  if (nextStatus === "SENT" || nextStatus === "ACCEPTED") {
    await quoteLinkedEnquiry(quotation, nextStatus);
  }

  await logQuotationActivity({
    user,
    action: "status_changed",
    quotation,
    extraMessage: `${user?.name || "User"} changed quotation "${quotation.quotationRef}" from ${previousStatus} to ${nextStatus}`,
  });

  return populateQuotation(quotation);
}

export async function acceptQuotationService({ user, quotationId, body = {} }) {
  return updateQuotationStatusService({
    user,
    quotationId,
    body: {
      status: "ACCEPTED",
      orderAcceptance: {
        ...(parseMaybeJson(body) || {}),
        acceptedDate: body?.acceptedDate || new Date(),
      },
    },
  });
}

function parseEmailList(value) {
  return String(value || "")
    .split(/[,;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function sendQuotationEmailService({ user, quotationId, body = {}, file }) {
  if (!isMicrosoftGraphConfigured()) {
    throwError("Microsoft Graph is not configured", 503);
  }

  const id = toObjectId(quotationId);
  if (!id) throwError("Invalid quotation id");

  const quotation = await Quotation.findById(id);
  await assertQuotationAccess(user, quotation);

  const canMarkSent = (STATUS_TRANSITIONS[quotation.status] || []).includes("SENT");
  const canResend = quotation.status === "SENT" || quotation.status === "ACCEPTED";
  if (!canMarkSent && !canResend) {
    throwError(`Cannot email a quotation in ${quotation.status} status`);
  }

  const toEmails = parseEmailList(body.to || quotation.customer?.email);
  const ccEmails = parseEmailList(body.cc);
  if (!toEmails.length) throwError("Recipient email is required");
  if (toEmails.some((email) => !isValidEmail(email))) throwError("Enter a valid recipient email");
  if (ccEmails.some((email) => !isValidEmail(email))) throwError("Enter a valid CC email");

  const senderEmail =
    parseEmailList(body.from)[0] ||
    String(user?.email || "").trim().toLowerCase() ||
    String(MICROSOFT_GRAPH_MAILBOX || "").trim().toLowerCase() ||
    null;
  if (!senderEmail || !isValidEmail(senderEmail)) {
    throwError("Enter a valid from email");
  }
  const mailSubject = String(body.subject || "").trim()
    || `Quotation ${quotation.quotationRef} — ${quotation.subject || ""}`.trim();
  const mailBody = String(body.body || body.message || "").trim()
    || `Please find attached quotation ${quotation.quotationRef}.`;
  const recipientName = String(body.recipientName || quotation.customer?.kindAttn || quotation.customer?.name || "").trim();

  const branded = await buildBrandedEmailHtml({
    senderName: user?.name,
    senderEmail,
    recipientName,
    subject: mailSubject,
    message: mailBody,
  });

  const attachments = [];
  if (branded.logoAttachment) attachments.push(branded.logoAttachment);
  const pdfAttachment = fileToGraphAttachment(
    file,
    `${quotation.quotationRef || "quotation"}.pdf`,
  );
  if (pdfAttachment) attachments.push(pdfAttachment);

  await sendGraphMail({
    fromMailbox: senderEmail,
    toEmail: toEmails,
    ccEmail: ccEmails,
    subject: mailSubject,
    body: mailBody,
    html: branded.html,
    attachments: attachments.length ? attachments : undefined,
  });

  if (canMarkSent) {
    return updateQuotationStatusService({
      user,
      quotationId,
      body: { status: "SENT" },
    });
  }

  quotation.updatedBy = user?._id || quotation.updatedBy;
  await quotation.save();
  await quoteLinkedEnquiry(quotation, "SENT");
  await logQuotationActivity({
    user,
    action: "updated",
    quotation,
    extraMessage: `${user?.name || "User"} resent quotation "${quotation.quotationRef}" to ${toEmails.join(", ")}`,
  });
  return populateQuotation(quotation);
}

export async function deleteQuotationService({ user, quotationId }) {
  if (user?.role !== "super_admin") {
    throwError("Only super administrators can delete quotations", 403);
  }

  const id = toObjectId(quotationId);
  if (!id) throwError("Invalid quotation id");

  const quotation = await Quotation.findById(id);
  await assertQuotationAccess(user, quotation);

  await quotation.softDelete();
  await logQuotationActivity({ user, action: "deleted", quotation });
}
