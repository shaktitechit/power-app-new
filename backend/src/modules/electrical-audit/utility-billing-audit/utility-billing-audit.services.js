import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { UtilityBillingRecord } = modelsRegistry;

import {
  buildActivityMessage,
  createRecentActivity,
  getAccessibleUtilityAccountIds,
  isAdmin,
  parseNumber,
  resolveAccessibleFacility,
  resolveAccessibleUtilityAccount,
  uploadAuditDocuments,
  resolveAuditorId,
  applyAuditorIdFromBody,
} from "../../shared/electrical-audit.helpers.js";

import { applyIsCompletedFromBody } from "../../../helpers/parseRequestBoolean.js";
import { assertAuditRecordMutable } from "../../../helpers/auditRecordCompletenessGuard.js";
import { validateUtilityBillingPeriod } from "./utility-billing-period.validation.js";



// helper: upload documents
;

// helper: number parser
;

// @route POST /api/v1/utility-billing-records
// @desc Create Utility Billing Record
// @access Protected

export const createUtilityBillingRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    utility_account_id,
    billing_period_start,
    billing_period_end,
    billing_days,
    bill_no,
    mdi_kVA,
    units_kWh,
    units_kVAh,
    pf,
    fixed_charges_rs,
    demand_charges_rs,
    energy_charges_rs,
    taxes_and_rent_rs,
    other_charges_rs,
    penalty_rs,
    other_charges_remark,
    rebate_subsidy_rs,
    monthly_electricity_bill_rs,
    unit_consumption_per_day_kVAh,
    average_per_unit_cost_rs,
    audit_date,
    auditor_id,
  } = body;

  if (!utility_account_id || !billing_period_start || !billing_period_end) {
    // res.status(400);
    throw new Error(
      "utility_account_id, billing_period_start and billing_period_end are required",
    );
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const periodValidation = await validateUtilityBillingPeriod({
    utilityAccountId: utility_account_id,
    billingPeriodStart: billing_period_start,
    billingPeriodEnd: billing_period_end,
  });

  if (!periodValidation.ok) {
    const error = new Error(periodValidation.message);
    error.statusCode = periodValidation.statusCode;
    throw error;
  }

  const billingRecordId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "billing",
    billingRecordId,
  );

  const billingRecord = await UtilityBillingRecord.create({
    _id: billingRecordId,
    utility_account_id,
    billing_period_start,
    billing_period_end,
    billing_days: parseNumber(billing_days),
    bill_no: bill_no?.trim(),
    mdi_kVA: parseNumber(mdi_kVA),
    units_kWh: parseNumber(units_kWh),
    units_kVAh: parseNumber(units_kVAh),
    pf: parseNumber(pf),
    fixed_charges_rs: parseNumber(fixed_charges_rs),
    demand_charges_rs: parseNumber(demand_charges_rs),
    energy_charges_rs: parseNumber(energy_charges_rs),
    taxes_and_rent_rs: parseNumber(taxes_and_rent_rs),
    other_charges_rs: parseNumber(other_charges_rs),
    penalty_rs: parseNumber(penalty_rs),
    other_charges_remark: other_charges_remark?.trim(),
    rebate_subsidy_rs: parseNumber(rebate_subsidy_rs),
    monthly_electricity_bill_rs: parseNumber(monthly_electricity_bill_rs),
    unit_consumption_per_day_kVAh: parseNumber(unit_consumption_per_day_kVAh),
    average_per_unit_cost_rs: parseNumber(average_per_unit_cost_rs),
    audit_date: audit_date || undefined,
    auditor_id: resolveAuditorId(user, body),
    documents: uploadedDocuments,
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "utility_billing",
    entity_id: billingRecord._id,
    entity_name: billingRecord.bill_no || "Billing Record",
    facility_id: utility.facility_id,
    utility_account_id: billingRecord.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "utility billing record",
      entityName: billingRecord.bill_no || "",
    }),
    meta: {
      units_kWh: billingRecord.units_kWh,
      units_kVAh: billingRecord.units_kVAh,
      mdi_kVA: billingRecord.mdi_kVA,
      monthly_electricity_bill_rs: billingRecord.monthly_electricity_bill_rs,
      billing_period_start: billingRecord.billing_period_start,
      billing_period_end: billingRecord.billing_period_end,
    },
  });

  return {
    success: true,
    message: "Utility billing record created successfully",
    data: billingRecord,
  };
};

export const getUtilityBillingRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { utility_account_id, page, limit } = reqQuery;

  const allowedIds = await getAccessibleUtilityAccountIds(user);

  const query = {};

  if (allowedIds === null) {
    // admin — no restriction
    if (utility_account_id) query.utility_account_id = utility_account_id;
  } else {
    // non-admin
    if (utility_account_id) {
      const isAllowed = allowedIds.some(
        (id) => id.toString() === utility_account_id.toString(),
      );
      if (!isAllowed) {
        return {
          success: true,
          total: 0,
          pages: 1,
          currentPage: 1,
          count: 0,
          data: [],
        };
      }
      query.utility_account_id = utility_account_id;
    } else {
      query.utility_account_id = { $in: allowedIds };
    }
  }

  // Count total records matching search conditions
  const total = await UtilityBillingRecord.countDocuments(query);

  let q = UtilityBillingRecord.find(query)
    .populate("utility_account_id", "account_number facility_id")
    .populate("auditor_id", "name email")
    .sort({ billing_period_start: -1 });

  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;
    q = q.skip(skip).limit(limitNum);
  }

  const billingRecords = await q;

  return {
    success: true,
    total,
    pages: limit ? Math.ceil(total / parseInt(limit, 10)) : 1,
    currentPage: page ? parseInt(page, 10) : 1,
    count: billingRecords.length,
    data: billingRecords,
  };
};

export const getUtilityBillingRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const billingRecord = await UtilityBillingRecord.findById(id)
    .populate("utility_account_id")
    .populate("auditor_id", "name email");

  if (!billingRecord) {
    { const error = new Error("Utility billing record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    billingRecord.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: billingRecord,
  };
};

export const updateUtilityBillingRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    billing_period_start,
    billing_period_end,
    billing_days,
    bill_no,
    mdi_kVA,
    units_kWh,
    units_kVAh,
    pf,
    fixed_charges_rs,
    demand_charges_rs,
    energy_charges_rs,
    taxes_and_rent_rs,
    other_charges_rs,
    penalty_rs,
    other_charges_remark,
    rebate_subsidy_rs,
    monthly_electricity_bill_rs,
    unit_consumption_per_day_kVAh,
    average_per_unit_cost_rs,
    audit_date,
    auditor_id,
  } = body;

  const billingRecord = await UtilityBillingRecord.findById(id);

  if (!billingRecord) {
    { const error = new Error("Utility billing record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    billingRecord.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  assertAuditRecordMutable({
    record: billingRecord,
    user,
    body,
    operation: "update",
  });

  const nextBillingPeriodStart =
    billing_period_start ?? billingRecord.billing_period_start;
  const nextBillingPeriodEnd =
    billing_period_end ?? billingRecord.billing_period_end;

  if (billing_period_start !== undefined || billing_period_end !== undefined) {
    const periodValidation = await validateUtilityBillingPeriod({
      utilityAccountId: billingRecord.utility_account_id,
      billingPeriodStart: nextBillingPeriodStart,
      billingPeriodEnd: nextBillingPeriodEnd,
      excludeRecordId: billingRecord._id,
    });

    if (!periodValidation.ok) {
      const error = new Error(periodValidation.message);
      error.statusCode = periodValidation.statusCode;
      throw error;
    }
  }

  const updatedFields = Object.keys(body || {}).filter(key => key !== 'existing_documents');
  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "billing",
    billingRecord._id,
  );

  if (body.existing_documents) {
    try {
      const parsedDocs = typeof body.existing_documents === "string"
        ? JSON.parse(body.existing_documents)
        : body.existing_documents;
      billingRecord.documents = parsedDocs;
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  billingRecord.billing_period_start =
    billing_period_start ?? billingRecord.billing_period_start;
  billingRecord.billing_period_end =
    billing_period_end ?? billingRecord.billing_period_end;
  billingRecord.billing_days =
    billing_days !== undefined
      ? parseNumber(billing_days)
      : billingRecord.billing_days;
  billingRecord.bill_no =
    bill_no !== undefined ? bill_no?.trim() : billingRecord.bill_no;
  billingRecord.mdi_kVA =
    mdi_kVA !== undefined ? parseNumber(mdi_kVA) : billingRecord.mdi_kVA;
  billingRecord.units_kWh =
    units_kWh !== undefined ? parseNumber(units_kWh) : billingRecord.units_kWh;
  billingRecord.units_kVAh =
    units_kVAh !== undefined
      ? parseNumber(units_kVAh)
      : billingRecord.units_kVAh;
  billingRecord.pf = pf !== undefined ? parseNumber(pf) : billingRecord.pf;
  billingRecord.fixed_charges_rs =
    fixed_charges_rs !== undefined
      ? parseNumber(fixed_charges_rs)
      : billingRecord.fixed_charges_rs;
  billingRecord.demand_charges_rs =
    demand_charges_rs !== undefined
      ? parseNumber(demand_charges_rs)
      : billingRecord.demand_charges_rs;
  billingRecord.energy_charges_rs =
    energy_charges_rs !== undefined
      ? parseNumber(energy_charges_rs)
      : billingRecord.energy_charges_rs;
  billingRecord.taxes_and_rent_rs =
    taxes_and_rent_rs !== undefined
      ? parseNumber(taxes_and_rent_rs)
      : billingRecord.taxes_and_rent_rs;
  billingRecord.other_charges_rs =
    other_charges_rs !== undefined
      ? parseNumber(other_charges_rs)
      : billingRecord.other_charges_rs;
  billingRecord.penalty_rs =
    penalty_rs !== undefined
      ? parseNumber(penalty_rs)
      : billingRecord.penalty_rs;
  billingRecord.other_charges_remark =
    other_charges_remark !== undefined
      ? other_charges_remark?.trim()
      : billingRecord.other_charges_remark;
  billingRecord.rebate_subsidy_rs =
    rebate_subsidy_rs !== undefined
      ? parseNumber(rebate_subsidy_rs)
      : billingRecord.rebate_subsidy_rs;
  billingRecord.monthly_electricity_bill_rs =
    monthly_electricity_bill_rs !== undefined
      ? parseNumber(monthly_electricity_bill_rs)
      : billingRecord.monthly_electricity_bill_rs;
  billingRecord.unit_consumption_per_day_kVAh =
    unit_consumption_per_day_kVAh !== undefined
      ? parseNumber(unit_consumption_per_day_kVAh)
      : billingRecord.unit_consumption_per_day_kVAh;
  billingRecord.average_per_unit_cost_rs =
    average_per_unit_cost_rs !== undefined
      ? parseNumber(average_per_unit_cost_rs)
      : billingRecord.average_per_unit_cost_rs;
  billingRecord.audit_date = audit_date ?? billingRecord.audit_date;
  applyAuditorIdFromBody(billingRecord, user, body);

  if (uploadedDocuments.length > 0) {
    billingRecord.documents = [
      ...(billingRecord.documents || []),
      ...uploadedDocuments,
    ];
    updatedFields.push("documents");
  }

  applyIsCompletedFromBody(billingRecord, body);
  const updatedBillingRecord = await billingRecord.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "utility_billing",
    entity_id: updatedBillingRecord._id,
    entity_name: updatedBillingRecord.bill_no || "Billing Record",
    facility_id: utility.facility_id,
    utility_account_id: updatedBillingRecord.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "utility billing record",
      entityName: updatedBillingRecord.bill_no || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      units_kWh: updatedBillingRecord.units_kWh,
      units_kVAh: updatedBillingRecord.units_kVAh,
      mdi_kVA: updatedBillingRecord.mdi_kVA,
      monthly_electricity_bill_rs:
        updatedBillingRecord.monthly_electricity_bill_rs,
      billing_period_start: updatedBillingRecord.billing_period_start,
      billing_period_end: updatedBillingRecord.billing_period_end,
    },
  });

  return {
    success: true,
    message: "Utility billing record updated successfully",
    data: updatedBillingRecord,
  };
};

export const deleteUtilityBillingRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const billingRecord = await UtilityBillingRecord.findById(id);

  if (!billingRecord) {
    { const error = new Error("Utility billing record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    billingRecord.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }

  assertAuditRecordMutable({
    record: billingRecord,
    user,
    operation: "delete",
  });
  }

  const entityName = billingRecord.bill_no || "Billing Record";
  const facilityId = utility.facility_id;
  const utilityId = billingRecord.utility_account_id;
  const unitsKWh = billingRecord.units_kWh;
  const unitsKVAh = billingRecord.units_kVAh;
  const mdiKVA = billingRecord.mdi_kVA;
  const monthlyBill = billingRecord.monthly_electricity_bill_rs;
  const billingStart = billingRecord.billing_period_start;
  const billingEnd = billingRecord.billing_period_end;

  await billingRecord.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "utility_billing",
    entity_id: billingRecord._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "utility billing record",
      entityName,
    }),
    meta: {
      units_kWh: unitsKWh,
      units_kVAh: unitsKVAh,
      mdi_kVA: mdiKVA,
      monthly_electricity_bill_rs: monthlyBill,
      billing_period_start: billingStart,
      billing_period_end: billingEnd,
    },
  });

  return {
    success: true,
    message: "Utility billing record deleted successfully",
  };
};

export const uploadBillingRecordDocumentsService = async ({ user, id, files, body }) => {
  const billingRecord = await UtilityBillingRecord.findById(id);

  if (!billingRecord) {
    const error = new Error("Utility billing record not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    billingRecord.utility_account_id,
  );

  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  assertAuditRecordMutable({
    record: billingRecord,
    user,
    body,
    operation: "upload",
  });

  let captions = [];
  if (body?.captions) {
    try {
      captions =
        typeof body.captions === "string"
          ? JSON.parse(body.captions)
          : body.captions;
    } catch {
      captions = [];
    }
  }

  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "billing",
    billingRecord._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    billingRecord.documents = [
      ...(billingRecord.documents || []),
      ...uploadedDocuments,
    ];
    await billingRecord.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: billingRecord,
  };
};
