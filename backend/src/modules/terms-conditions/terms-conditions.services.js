import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";

const { TermsConditions, Company } = modelsRegistry;

const TERMS_POPULATE = [
  { path: "created_by", select: "name email role" },
  { path: "updated_by", select: "name email role" },
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

function htmlToPlainText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLines(rawLines) {
  let lines = rawLines;
  if (typeof lines === "string") {
    try {
      lines = JSON.parse(lines);
    } catch {
      lines = lines.split(/\n+/);
    }
  }
  if (!Array.isArray(lines)) return [];
  return lines
    .map((line) => String(line ?? "").trim())
    .filter((line) => htmlToPlainText(line));
}

function normalizeLegacyGroups(rawTerms) {
  let terms = rawTerms;
  if (typeof terms === "string") {
    try {
      terms = JSON.parse(terms);
    } catch {
      terms = terms.split("\n");
    }
  }
  if (!Array.isArray(terms)) return [];

  return terms
    .map((term, index) => {
      if (typeof term === "string") {
        const lines = term
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => htmlToPlainText(line));
        if (!lines.length) return null;
        return {
          title: `Terms ${index + 1}`,
          lines,
        };
      }

      const title = String(term?.title ?? "").trim() || `Terms ${index + 1}`;
      let lines = term?.lines;
      if (typeof term?.content === "string") {
        lines = String(term.content).split(/\n+/);
      }
      lines = normalizeLines(lines);
      if (!lines.length) return null;
      return { title, lines };
    })
    .filter(Boolean);
}

function pickTermsFields(body = {}) {
  const title = String(body?.title ?? "").trim();
  const lines = normalizeLines(body?.lines);
  if (!title) throwError("Title is required");
  if (!lines.length) throwError("Add at least one line");
  return { title, lines };
}

async function populateTerms(doc) {
  if (!doc) return doc;
  return TermsConditions.populate(doc, TERMS_POPULATE);
}

async function migrateLegacyCompanyTerms() {
  const existing = await TermsConditions.countDocuments();
  if (existing > 0) return;

  const company =
    (await Company.findOne({ is_default: true })) ||
    (await Company.findOne({}).sort({ created_at: 1 }));
  const groups = normalizeLegacyGroups(company?.quotation_terms);
  if (!groups.length) return;

  await TermsConditions.insertMany(
    groups.map((group) => ({
      title: group.title,
      lines: group.lines,
    })),
  );

  if (company?._id) {
    await Company.updateOne({ _id: company._id }, { $unset: { quotation_terms: 1 } });
  }
}

export function flattenTermsDocuments(docs = []) {
  const flattened = [];
  docs.forEach((term) => {
    const title = String(term?.title || "").trim() || "Terms";
    const lines = Array.isArray(term?.lines) ? term.lines : [];
    lines.forEach((line) => {
      const content = String(line || "").trim();
      if (!htmlToPlainText(content)) return;
      flattened.push({
        termNo: flattened.length + 1,
        title,
        content,
      });
    });
  });
  return flattened;
}

export async function getFlattenedQuotationTerms() {
  await migrateLegacyCompanyTerms();
  const docs = await TermsConditions.find({}).sort({ created_at: 1 }).lean();
  return flattenTermsDocuments(docs);
}

export async function getFlattenedQuotationTermsByIds(ids = []) {
  await migrateLegacyCompanyTerms();
  const objectIds = (Array.isArray(ids) ? ids : [])
    .map((id) => toObjectId(id))
    .filter(Boolean);
  if (!objectIds.length) return [];

  const docs = await TermsConditions.find({ _id: { $in: objectIds } }).lean();
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const ordered = objectIds.map((id) => byId.get(String(id))).filter(Boolean);
  return flattenTermsDocuments(ordered);
}

export async function createTermsConditionsService({ user, body = {} }) {
  await migrateLegacyCompanyTerms();
  const payload = pickTermsFields(body);
  const doc = await TermsConditions.create({
    ...payload,
    created_by: user?._id || null,
    updated_by: user?._id || null,
  });
  return populateTerms(doc);
}

export async function getTermsConditionsService() {
  await migrateLegacyCompanyTerms();
  const docs = await TermsConditions.find({})
    .sort({ created_at: 1 })
    .populate(TERMS_POPULATE);
  return docs;
}

export async function getTermsConditionsByIdService({ termsId }) {
  const id = toObjectId(termsId);
  if (!id) throwError("Invalid terms & conditions id");
  const doc = await TermsConditions.findById(id).populate(TERMS_POPULATE);
  if (!doc) throwError("Terms & conditions not found", 404);
  return doc;
}

export async function updateTermsConditionsService({ user, termsId, body = {} }) {
  const id = toObjectId(termsId);
  if (!id) throwError("Invalid terms & conditions id");

  const doc = await TermsConditions.findById(id);
  if (!doc) throwError("Terms & conditions not found", 404);

  const payload = pickTermsFields(body);
  doc.title = payload.title;
  doc.lines = payload.lines;
  doc.updated_by = user?._id || doc.updated_by;
  await doc.save();
  return populateTerms(doc);
}

export async function deleteTermsConditionsService({ termsId }) {
  const id = toObjectId(termsId);
  if (!id) throwError("Invalid terms & conditions id");

  const doc = await TermsConditions.findById(id);
  if (!doc) throwError("Terms & conditions not found", 404);
  await doc.softDelete();
}
