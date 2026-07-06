import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { UtilityTariff } = modelsRegistry;

import {
  buildActivityMessage,
  createRecentActivity,
  getAccessibleUtilityAccountIds,
  isAdmin,
  resolveAccessibleFacility,
  resolveAccessibleUtilityAccount,
  uploadAuditDocuments,
  resolveAuditorId,
  applyAuditorIdFromBody,
} from "../../shared/electrical-audit.helpers.js";
import {
  parseTariffDateOnly,
  validateUtilityTariffEffectiveFrom,
  findSoftDeletedUtilityTariff,
} from "./utility-tariff.validation.js";
import { applyIsCompletedFromBody } from "../../../helpers/parseRequestBoolean.js";
import { assertAuditRecordMutable } from "../../../helpers/auditRecordCompletenessGuard.js";



const formatDateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
};

const buildTariffEntityName = (effectiveFrom, accountNumber) => {
  const dateLabel = formatDateLabel(effectiveFrom);
  if (accountNumber && dateLabel) {
    return `Tariff ${dateLabel} (${accountNumber})`;
  }
  if (dateLabel) return `Tariff ${dateLabel}`;
  if (accountNumber) return `Tariff (${accountNumber})`;
  return "Tariff";
};

// 📂 Upload documents
;

function applyTariffFields(tariff, body, uploadedDocuments = [], user) {
  const {
    effective_to,
    basic_energy_charges_rs_per_unit,
    fixed_charges_rs_per_kW_or_per_kVA,
    ed_percent,
    octroi_rs_per_unit,
    surcharge_rs,
    cow_cess_rs,
    rental_rs,
    infracess_rs,
    other_charges_or_rebates_rs,
    any_other_rs,
    audit_date,
  } = body;

  tariff.deleted_at = null;
  tariff.effective_to = effective_to ? parseTariffDateOnly(effective_to) : null;
  tariff.basic_energy_charges_rs_per_unit = basic_energy_charges_rs_per_unit;
  tariff.fixed_charges_rs_per_kW_or_per_kVA = fixed_charges_rs_per_kW_or_per_kVA;
  tariff.ed_percent = ed_percent;
  tariff.octroi_rs_per_unit = octroi_rs_per_unit;
  tariff.surcharge_rs = surcharge_rs;
  tariff.cow_cess_rs = cow_cess_rs;
  tariff.rental_rs = rental_rs;
  tariff.infracess_rs = infracess_rs;
  tariff.other_charges_or_rebates_rs = other_charges_or_rebates_rs;
  tariff.any_other_rs = any_other_rs;
  tariff.audit_date = audit_date;
  applyAuditorIdFromBody(tariff, user, body);

  if (uploadedDocuments.length > 0) {
    tariff.documents = [...(tariff.documents || []), ...uploadedDocuments];
  }
}

async function restoreUtilityTariffById({
  user,
  utility,
  tariffId,
  body,
  files,
  effectiveFrom,
}) {
  const tariff = await UtilityTariff.findById(tariffId).setOptions({
    includeDeleted: true,
  });

  if (!tariff || !tariff.deleted_at) {
    const error = new Error("Deleted utility tariff not found");
    error.statusCode = 404;
    throw error;
  }

  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "undefined",
    tariff._id,
  );

  if (effectiveFrom) {
    tariff.effective_from = effectiveFrom;
  }

  applyTariffFields(tariff, body, uploadedDocuments, user);
  await tariff.save();

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "tariff",
    entity_id: tariff._id,
    entity_name: buildTariffEntityName(tariff.effective_from, utility.account_number),
    facility_id: utility.facility_id,
    utility_account_id: tariff.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "restored",
      entityLabel: "utility tariff",
      entityName: buildTariffEntityName(
        tariff.effective_from,
        utility.account_number,
      ),
    }),
    meta: {
      effective_from: tariff.effective_from,
      effective_to: tariff.effective_to,
      restored_from_soft_delete: true,
    },
  });

  return {
    success: true,
    message: "Utility tariff restored successfully",
    data: tariff,
  };
}

export const getDeletedUtilityTariffLookupService = async ({
  user,
  reqQuery,
}) => {
  const { utility_account_id, effective_from } = reqQuery;

  if (!utility_account_id || !effective_from) {
    const error = new Error(
      "utility_account_id and effective_from are required",
    );
    error.statusCode = 400;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    utility_account_id,
  );

  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  const softDeleted = await findSoftDeletedUtilityTariff({
    utilityAccountId: utility_account_id,
    effectiveFrom: effective_from,
  });

  if (!softDeleted) {
    return { success: true, data: null };
  }

  const tariff = await UtilityTariff.findById(softDeleted._id)
    .setOptions({ includeDeleted: true })
    .populate("auditor_id", "name email");

  return {
    success: true,
    data: tariff,
  };
};

export const restoreUtilityTariffService = async ({
  user,
  id,
  body,
  files,
}) => {
  const tariff = await UtilityTariff.findById(id).setOptions({
    includeDeleted: true,
  });

  if (!tariff || !tariff.deleted_at) {
    const error = new Error("Deleted utility tariff not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    tariff.utility_account_id,
  );

  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  let effectiveFrom = tariff.effective_from;
  if (body?.effective_from) {
    const periodValidation = await validateUtilityTariffEffectiveFrom({
      utilityAccountId: tariff.utility_account_id,
      effectiveFrom: body.effective_from,
      excludeId: tariff._id,
    });

    if (!periodValidation.ok) {
      const error = new Error(periodValidation.message);
      error.statusCode = periodValidation.statusCode;
      throw error;
    }

    effectiveFrom = periodValidation.effectiveFrom;
  }

  return restoreUtilityTariffById({
    user,
    utility,
    tariffId: tariff._id,
    body,
    files,
    effectiveFrom,
  });
};

//
// 🚀 CREATE TARIFF
//

export const createUtilityTariffService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    utility_account_id,
    effective_from,
    effective_to,
    basic_energy_charges_rs_per_unit,
    fixed_charges_rs_per_kW_or_per_kVA,
    ed_percent,
    octroi_rs_per_unit,
    surcharge_rs,
    cow_cess_rs,
    rental_rs,
    infracess_rs,
    other_charges_or_rebates_rs,
    any_other_rs,
    audit_date,
    auditor_id,
  } = body;

  if (!utility_account_id || !effective_from) {
    { const error = new Error("utility_account_id and effective_from are required"); error.statusCode = 400; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const periodValidation = await validateUtilityTariffEffectiveFrom({
    utilityAccountId: utility_account_id,
    effectiveFrom: effective_from,
  });

  if (!periodValidation.ok) {
    const error = new Error(periodValidation.message);
    error.statusCode = periodValidation.statusCode;
    throw error;
  }

  const softDeleted = await findSoftDeletedUtilityTariff({
    utilityAccountId: utility_account_id,
    effectiveFrom: periodValidation.effectiveFrom,
  });

  if (softDeleted) {
    const error = new Error(
      "A previously deleted tariff exists for this effective from date. Use Restore in the form or choose a different date.",
    );
    error.statusCode = 409;
    throw error;
  }

  const tariffId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(files, "undefined", tariffId);

  const tariff = await UtilityTariff.create({
      _id: tariffId,
      utility_account_id,
      effective_from: periodValidation.effectiveFrom,
      effective_to: effective_to ? parseTariffDateOnly(effective_to) : null,

      basic_energy_charges_rs_per_unit,
      fixed_charges_rs_per_kW_or_per_kVA,
      ed_percent,
      octroi_rs_per_unit,
      surcharge_rs,
      cow_cess_rs,
      rental_rs,
      infracess_rs,
      other_charges_or_rebates_rs,
      any_other_rs,

      audit_date,
      auditor_id: resolveAuditorId(user, body),

    documents: uploadedDocuments,
  });

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "tariff",
    entity_id: tariff._id,
    entity_name: buildTariffEntityName(tariff.effective_from, utility.account_number),
    facility_id: utility.facility_id,
    utility_account_id: tariff.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "utility tariff",
      entityName: buildTariffEntityName(
        tariff.effective_from,
        utility.account_number,
      ),
    }),
    meta: {
      effective_from: tariff.effective_from,
      effective_to: tariff.effective_to,
      basic_energy_charges_rs_per_unit: tariff.basic_energy_charges_rs_per_unit,
    },
  });

  return {
    success: true,
    message: "Utility tariff created successfully",
    data: tariff,
  };
};

export const getUtilityTariffsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { utility_account_id } = reqQuery;

  let tariffs = [];

  const allowedIds = await getAccessibleUtilityAccountIds(user);

  const query = {};

  if (allowedIds === null) {
    if (utility_account_id) query.utility_account_id = utility_account_id;
  } else {
    if (utility_account_id) {
      const isAllowed = allowedIds.some(
        (id) => id.toString() === utility_account_id.toString(),
      );
      if (!isAllowed) return { success: true, count: 0, data: [] };
      query.utility_account_id = utility_account_id;
    } else {
      query.utility_account_id = { $in: allowedIds };
    }
  }

  tariffs = await UtilityTariff.find(query)
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email")
    .sort({ effective_from: -1 });

  return {
    success: true,
    count: tariffs.length,
    data: tariffs,
  };
};

export const getUtilityTariffByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const tariff = await UtilityTariff.findById(id)
    .populate("utility_account_id")
    .populate("auditor_id", "name email");

  if (!tariff) {
    { const error = new Error("Tariff not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    tariff.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: tariff,
  };
};

export const updateUtilityTariffService = async ({ user, body, files, reqQuery, id, params }) => {
  const tariff = await UtilityTariff.findById(id);

  if (!tariff) {
    { const error = new Error("Tariff not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    tariff.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  assertAuditRecordMutable({
    record: tariff,
    user,
    body,
    operation: "update",
  });

  if (body.effective_from !== undefined) {
    const periodValidation = await validateUtilityTariffEffectiveFrom({
      utilityAccountId: tariff.utility_account_id,
      effectiveFrom: body.effective_from,
      excludeId: tariff._id,
    });

    if (!periodValidation.ok) {
      const error = new Error(periodValidation.message);
      error.statusCode = periodValidation.statusCode;
      throw error;
    }

    body.effective_from = periodValidation.effectiveFrom;
  }

  if (body.effective_to !== undefined && body.effective_to !== null && body.effective_to !== "") {
    body.effective_to = parseTariffDateOnly(body.effective_to);
  } else if (body.effective_to === "") {
    body.effective_to = null;
  }

  const uploadedDocuments = await uploadAuditDocuments(files, "undefined", tariff._id);

  const updatedFields = Object.keys(body || {});

  Object.keys(body || {}).forEach((key) => {
    if (key === "existing_documents") return;
    tariff[key] = body[key] ?? tariff[key];
  });

  if (body.existing_documents) {
    try {
      const parsedDocs = typeof body.existing_documents === "string"
        ? JSON.parse(body.existing_documents)
        : body.existing_documents;
      tariff.documents = parsedDocs;
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  if (uploadedDocuments.length > 0) {
    tariff.documents = [...(tariff.documents || []), ...uploadedDocuments];
    updatedFields.push("documents");
  }

  applyIsCompletedFromBody(tariff, body);
  applyAuditorIdFromBody(tariff, user, body);

  const updated = await tariff.save();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "tariff",
    entity_id: updated._id,
    entity_name: buildTariffEntityName(updated.effective_from, utility.account_number),
    facility_id: utility.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "utility tariff",
      entityName: buildTariffEntityName(
        updated.effective_from,
        utility.account_number,
      ),
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
    },
  });

  return {
    success: true,
    message: "Tariff updated successfully",
    data: updated,
  };
};

export const deleteUtilityTariffService = async ({ user, body, files, reqQuery, id, params }) => {
  const tariff = await UtilityTariff.findById(id);

  if (!tariff) {
    { const error = new Error("Tariff not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    tariff.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }

  assertAuditRecordMutable({
    record: tariff,
    user,
    operation: "delete",
  });
  }

  const entityName = buildTariffEntityName(
    tariff.effective_from,
    utility.account_number,
  );
  const facilityId = utility.facility_id;

  await tariff.softDelete();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "tariff",
    entity_id: tariff._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: tariff.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "utility tariff",
      entityName,
    }),
  });

  return {
    success: true,
    message: "Tariff deleted successfully",
  };
};

export const uploadTariffDocumentsService = async ({ user, files, id, body }) => {
  const tariff = await UtilityTariff.findById(id);

  if (!tariff) {
    { const error = new Error("Tariff not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    tariff.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }

  assertAuditRecordMutable({
    record: tariff,
    user,
    body,
    operation: "upload",
  });
  }

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

  const uploadedDocuments = await uploadAuditDocuments(files, "undefined", tariff._id);

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    tariff.documents = [...(tariff.documents || []), ...uploadedDocuments];
  }

  const updated = await tariff.save();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "tariff",
    entity_id: updated._id,
    entity_name: buildTariffEntityName(updated.effective_from, utility.account_number),
    facility_id: utility.facility_id,
    utility_account_id: updated.utility_account_id,
    message: `${user?.name || "User"} uploaded ${uploadedDocuments.length} document(s) to utility tariff`,
    meta: {
      uploaded_count: uploadedDocuments.length,
      updated_fields: ["documents"],
    },
  });

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: updated,
  };
};
