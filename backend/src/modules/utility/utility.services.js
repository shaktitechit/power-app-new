import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";

const {
  Facility,
  FacilityAuditor,
  UtilityAccount,
  User,
} = modelsRegistry;

import { isFacilityAuditClosed, isUtilityAuditCompleted } from "../../helpers/auditState.js";
import {
  ALLOWED_AUDIT_STEPS,
  applyAuditStepAllow,
  applyAuditStepSubmit,
  applyDataSheetInclusionsToAccount,
  enrichUtilityAccountForResponse,
  ensureUtilityAccountDataSheet,
  isFinalSubmitStep,
  parseDataSheetInclusions,
  calculateUtilityRecordLevelStats,
} from "../utility-workflow/index.js";

const enrichWithStats = async (utilityAccount) => {
  if (!utilityAccount) return utilityAccount;
  const enriched = enrichUtilityAccountForResponse(utilityAccount);
  enriched.completionStats = await calculateUtilityRecordLevelStats(
    utilityAccount._id || utilityAccount.id,
    enriched.dataSheet,
  );
  return enriched;
};
import {
  applyOpenUtilityAudit,
  getIncludedDataSheetKeys,
  resetIncludedAuditRecordsToPending,
} from "../utility-workflow/open-utility-audit.service.js";
import { syncAllAuditSectionsForUtilityAccount } from "../utility-workflow/utility-workflow.sync.js";
import { hasOrgWideUtilityAccountRead } from "../../services/authorization/index.js";
import {
  uploadAuditDocuments,
  parseBoolean,
  createRecentActivity,
  buildActivityMessage,
  createNotification,
  resolveAccessibleFacility,
  applyAuditorIdFromBody,
} from "../shared/electrical-audit.helpers.js";
import {
  BULK_CREATE_MAX_ACCOUNTS,
  buildUtilityAccountDocument,
  parseBulkAccountsInput,
  validateUtilityAccountCreateInput,
} from "./utility-account-create.helpers.js";

export { ALLOWED_AUDIT_STEPS } from "../utility-workflow/index.js";

const finalizeUtilityAccountCreate = async ({
  user,
  utilityAccount,
  parsedInclusions,
}) => {
  await utilityAccount.save();

  if (parsedInclusions) {
    await syncAllAuditSectionsForUtilityAccount(utilityAccount._id);
  }

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "utility_account",
    entity_id: utilityAccount._id,
    entity_name: utilityAccount.account_number,
    facility_id: utilityAccount.facility_id,
    utility_account_id: utilityAccount._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "utility account",
      entityName: utilityAccount.account_number,
    }),
    meta: {
      connection_type: utilityAccount.connection_type,
      provider: utilityAccount.provider,
    },
  });

  return await enrichWithStats(
    parsedInclusions
      ? await UtilityAccount.findById(utilityAccount._id)
      : utilityAccount,
  );
};

export const createUtilityAccountService = async ({ user, body, files }) => {
  const { facility_id } = body;

  if (!facility_id) {
    const error = new Error("facility_id is required");
    error.statusCode = 400;
    throw error;
  }

  const { errors, normalized } = validateUtilityAccountCreateInput(body);
  if (errors.length) {
    const error = new Error(errors.join("; "));
    error.statusCode = 400;
    throw error;
  }

  const facility = await resolveAccessibleFacility(user, facility_id);

  if (!facility) {
    const error = new Error("Facility not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  const existingUtilityAccount = await UtilityAccount.findOne({
    facility_id,
    account_number: normalized.account_number,
  });

  if (existingUtilityAccount) {
    const error = new Error("Utility account already exists for this facility");
    error.statusCode = 400;
    throw error;
  }

  const utilityAccountId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "utility-accounts",
    utilityAccountId,
  );

  const { utilityAccount, parsedInclusions } = buildUtilityAccountDocument({
    user,
    facility_id,
    input: normalized,
    documents: uploadedDocuments,
    utilityAccountId,
  });

  return finalizeUtilityAccountCreate({
    user,
    utilityAccount,
    parsedInclusions,
  });
};

export const bulkCreateUtilityAccountsService = async ({ user, body }) => {
  const { facility_id } = body;

  if (!facility_id) {
    const error = new Error("facility_id is required");
    error.statusCode = 400;
    throw error;
  }

  const accounts = parseBulkAccountsInput(body.accounts);
  if (!Array.isArray(accounts) || accounts.length === 0) {
    const error = new Error("accounts must be a non-empty array");
    error.statusCode = 400;
    throw error;
  }

  if (accounts.length > BULK_CREATE_MAX_ACCOUNTS) {
    const error = new Error(
      `Cannot create more than ${BULK_CREATE_MAX_ACCOUNTS} utility accounts at once`,
    );
    error.statusCode = 400;
    throw error;
  }

  const facility = await resolveAccessibleFacility(user, facility_id);
  if (!facility) {
    const error = new Error("Facility not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  const sharedDefaults = {
    category: body.category,
    location: body.location,
    sanctioned_demand_value: body.sanctioned_demand_value,
    sanctioned_demand_unit: body.sanctioned_demand_unit,
    provider: body.provider,
    billing_cycle: body.billing_cycle,
    audit_date: body.audit_date,
    auditor_id: body.auditor_id,
    is_transformer_maintained_by_facility: body.is_transformer_maintained_by_facility,
    data_sheet_inclusions: body.data_sheet_inclusions,
  };

  const failed = [];
  const pendingCreates = [];
  const seenAccountNumbers = new Set();

  accounts.forEach((rawItem, index) => {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      failed.push({
        index,
        account_number: null,
        message: "Each account must be an object",
      });
      return;
    }

    const mergedInput = {
      ...sharedDefaults,
      ...rawItem,
      facility_id,
      data_sheet_inclusions:
        rawItem.data_sheet_inclusions ?? body.data_sheet_inclusions,
    };

    const { errors, normalized } = validateUtilityAccountCreateInput(mergedInput);
    if (errors.length) {
      failed.push({
        index,
        account_number: normalized.account_number || null,
        message: errors.join("; "),
      });
      return;
    }

    const accountKey = normalized.account_number.toLowerCase();
    if (seenAccountNumbers.has(accountKey)) {
      failed.push({
        index,
        account_number: normalized.account_number,
        message: "Duplicate account number in request payload",
      });
      return;
    }

    seenAccountNumbers.add(accountKey);
    pendingCreates.push({ index, normalized });
  });

  const accountNumbersToCheck = pendingCreates.map(
    (entry) => entry.normalized.account_number,
  );

  const existingAccounts = accountNumbersToCheck.length
    ? await UtilityAccount.find({
      facility_id,
      account_number: { $in: accountNumbersToCheck },
    }).select("account_number")
    : [];

  const existingAccountNumbers = new Set(
    existingAccounts.map((doc) => doc.account_number.toLowerCase()),
  );

  const created = [];

  for (const entry of pendingCreates) {
    const { index, normalized } = entry;

    if (existingAccountNumbers.has(normalized.account_number.toLowerCase())) {
      failed.push({
        index,
        account_number: normalized.account_number,
        message: "Utility account already exists for this facility",
      });
      continue;
    }

    try {
      const { utilityAccount, parsedInclusions } = buildUtilityAccountDocument({
        user,
        facility_id,
        input: normalized,
      });

      const saved = await finalizeUtilityAccountCreate({
        user,
        utilityAccount,
        parsedInclusions,
      });

      existingAccountNumbers.add(normalized.account_number.toLowerCase());
      created.push(saved);
    } catch (err) {
      failed.push({
        index,
        account_number: normalized.account_number,
        message: err?.message || "Failed to create utility account",
      });
    }
  }

  return {
    created,
    failed,
    summary: buildBulkCreateSummary(accounts.length, created, failed),
  };
};

const buildBulkCreateSummary = (total, created, failed) => ({
  total,
  created: created.length,
  failed: failed.length,
});

export const getUtilityAccountsService = async ({ user, query }) => {
  const { facility_id } = query;

  let utilities = [];

  if (hasOrgWideUtilityAccountRead(user)) {
    const q = facility_id ? { facility_id } : {};
    utilities = await UtilityAccount.find(q)
      .populate("facility_id", "name city")
      .populate("auditor_id", "name email")
      .sort({ created_at: -1 });
  } else {
    const assignedFacilityIds = await FacilityAuditor.find({
      user_id: user._id,
    }).distinct("facility_id");

    const ownedFacilities = await Facility.find({
      owner_user_id: user._id,
    }).distinct("_id");

    const accessibleFacilityIds = [...ownedFacilities, ...assignedFacilityIds];

    const q = {
      facility_id: {
        $in: facility_id
          ? accessibleFacilityIds.filter(
            (id) => id.toString() === facility_id.toString(),
          )
          : accessibleFacilityIds,
      },
    };

    utilities = await UtilityAccount.find(q)
      .populate("facility_id", "name city")
      .populate("auditor_id", "name email")
      .sort({ created_at: -1 });
  }

  return await Promise.all(
    utilities.map((utility) => enrichWithStats(utility))
  );
};

export const getUtilityAccountByIdService = async ({ user, id }) => {
  const utilityAccount = await UtilityAccount.findById(id)
    .populate("facility_id", "name city address owner_user_id")
    .populate("auditor_id", "name email");

  if (!utilityAccount) {
    const error = new Error("Utility account not found");
    error.statusCode = 404;
    throw error;
  }

  const facility = await resolveAccessibleFacility(
    user,
    utilityAccount.facility_id._id,
  );

  if (!facility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  const payload = await enrichWithStats(utilityAccount);
  const subsOut = { ...(payload.audit_step_submissions || {}) };
  for (const previewKey of ["preview-and-submit", "safety-preview-and-submit"]) {
    const preview = subsOut[previewKey];
    if (preview?.submitted_by) {
      const userDoc = await User.findById(preview.submitted_by)
        .select("name email")
        .lean();
      subsOut[previewKey] = {
        ...preview,
        submitted_by: userDoc || preview.submitted_by,
      };
    }
  }
  payload.audit_step_submissions = subsOut;

  return payload;
};

export const submitUtilityAuditStepService = async ({ user, id, step, io }) => {
  if (!step || typeof step !== "string" || !ALLOWED_AUDIT_STEPS.includes(step)) {
    const error = new Error("Invalid audit step");
    error.statusCode = 400;
    throw error;
  }

  const utilityAccount = await UtilityAccount.findById(id);

  if (!utilityAccount) {
    const error = new Error("Utility account not found");
    error.statusCode = 404;
    throw error;
  }

  const facility = await resolveAccessibleFacility(
    user,
    utilityAccount.facility_id,
  );

  if (!facility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  ensureUtilityAccountDataSheet(utilityAccount);

  applyAuditStepSubmit(utilityAccount, { step, userId: user._id });

  const updated = await utilityAccount.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "utility_account",
    entity_id: updated._id,
    entity_name: updated.account_number,
    facility_id: updated.facility_id,
    utility_account_id: updated._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "utility account (audit step submitted)",
      entityName: step,
    }),
    meta: {
      audit_step: step,
    },
  });

  if (isFinalSubmitStep(step) && io) {
    await createNotification(io, {
      recipient: facility.owner_user_id,
      sender: user._id,
      title: "Utility Account Submitted",
      message: `Utility account ${updated.account_number} has been submitted for facility: ${facility.name}`,
      type: "utility",
      referenceId: updated._id,
    });
  }

  return await enrichWithStats(updated);
};

export const allowUtilityAuditStepService = async ({ user, id, step }) => {
  if (!step || typeof step !== "string" || !ALLOWED_AUDIT_STEPS.includes(step)) {
    const error = new Error("Invalid audit step");
    error.statusCode = 400;
    throw error;
  }

  const utilityAccount = await UtilityAccount.findById(id);

  if (!utilityAccount) {
    const error = new Error("Utility account not found");
    error.statusCode = 404;
    throw error;
  }

  const facility = await resolveAccessibleFacility(
    user,
    utilityAccount.facility_id,
  );

  if (!facility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  applyAuditStepAllow(utilityAccount, { step });

  const updated = await utilityAccount.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "utility_account",
    entity_id: updated._id,
    entity_name: updated.account_number,
    facility_id: updated.facility_id,
    utility_account_id: updated._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "utility account (audit step editing allowed)",
      entityName: step,
    }),
    meta: {
      audit_step: step,
      audit_allow_editing: true,
    },
  });

  return await enrichWithStats(updated);
};

export const openUtilityAuditService = async ({ user, id }) => {
  const utilityAccount = await UtilityAccount.findById(id);

  if (!utilityAccount) {
    const error = new Error("Utility account not found");
    error.statusCode = 404;
    throw error;
  }

  const facility = await resolveAccessibleFacility(
    user,
    utilityAccount.facility_id,
  );

  if (!facility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  if (isFacilityAuditClosed(facility)) {
    const error = new Error(
      "Cannot open utility audit while the facility audit is closed",
    );
    error.statusCode = 403;
    throw error;
  }

  ensureUtilityAccountDataSheet(utilityAccount);

  if (!isUtilityAuditCompleted(utilityAccount)) {
    const error = new Error("Utility audit is not submitted yet");
    error.statusCode = 400;
    throw error;
  }

  const includedSheetKeys = getIncludedDataSheetKeys(utilityAccount);

  applyOpenUtilityAudit(utilityAccount);
  await resetIncludedAuditRecordsToPending(utilityAccount._id, includedSheetKeys);

  const updated = await utilityAccount.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "utility_account",
    entity_id: updated._id,
    entity_name: updated.account_number,
    facility_id: updated.facility_id,
    utility_account_id: updated._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "utility account (audit re-opened)",
      entityName: updated.account_number,
    }),
    meta: {
      audit_reopened: true,
      included_sections: includedSheetKeys,
    },
  });

  return await enrichWithStats(updated);
};

export const updateUtilityAccountService = async ({ user, id, body, files }) => {
  const {
    account_number,
    connection_type,
    category,
    location,
    sanctioned_demand_value,
    sanctioned_demand_unit,
    provider,
    billing_cycle,
    audit_date,
    auditor_id,
    is_transformer_maintained_by_facility,
    removed_document_ids,
    data_sheet_inclusions,
  } = body;

  const utilityAccount = await UtilityAccount.findById(id);

  if (!utilityAccount) {
    const error = new Error("Utility account not found");
    error.statusCode = 404;
    throw error;
  }

  const facility = await resolveAccessibleFacility(
    user,
    utilityAccount.facility_id,
  );

  if (!facility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  if (
    account_number !== undefined &&
    account_number.trim() !== utilityAccount.account_number
  ) {
    const existingUtilityAccount = await UtilityAccount.findOne({
      facility_id: utilityAccount.facility_id,
      account_number: account_number.trim(),
      _id: { $ne: utilityAccount._id },
    });

    if (existingUtilityAccount) {
      const error = new Error("Utility account already exists for this facility");
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedFields = Object.keys(body || {});

  utilityAccount.account_number =
    account_number !== undefined
      ? account_number.trim()
      : utilityAccount.account_number;

  utilityAccount.connection_type =
    connection_type ?? utilityAccount.connection_type;

  utilityAccount.category = category ?? utilityAccount.category;
  utilityAccount.location = location ?? utilityAccount.location;

  if (sanctioned_demand_value !== undefined) {
    utilityAccount.sanctioned_demand_value =
      sanctioned_demand_value !== ""
        ? Number(sanctioned_demand_value)
        : undefined;
    utilityAccount.sanctioned_demand_unit =
      sanctioned_demand_unit || utilityAccount.sanctioned_demand_unit || "kVA";
  } else if (sanctioned_demand_unit !== undefined) {
    utilityAccount.sanctioned_demand_unit = sanctioned_demand_unit;
  }

  utilityAccount.provider = provider ?? utilityAccount.provider;
  utilityAccount.billing_cycle = billing_cycle ?? utilityAccount.billing_cycle;
  utilityAccount.audit_date = audit_date ?? utilityAccount.audit_date;
  applyAuditorIdFromBody(utilityAccount, user, body);

  if (is_transformer_maintained_by_facility !== undefined) {
    utilityAccount.is_transformer_maintained_by_facility = parseBoolean(
      is_transformer_maintained_by_facility,
    );
  }

  let parsedRemovedDocIds = [];
  if (removed_document_ids) {
    try {
      parsedRemovedDocIds =
        typeof removed_document_ids === "string"
          ? JSON.parse(removed_document_ids)
          : removed_document_ids;
    } catch (e) {
      console.error("Failed to parse removed_document_ids:", e);
    }
  }

  if (Array.isArray(parsedRemovedDocIds) && parsedRemovedDocIds.length > 0) {
    const originalCount = utilityAccount.documents.length;
    utilityAccount.documents = utilityAccount.documents.filter(
      (doc) => !parsedRemovedDocIds.includes(doc._id?.toString()),
    );
    if (utilityAccount.documents.length !== originalCount) {
      updatedFields.push("documents");
    }
  }

  if (body.existing_documents) {
    try {
      const parsedDocs =
        typeof body.existing_documents === "string"
          ? JSON.parse(body.existing_documents)
          : body.existing_documents;
      utilityAccount.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
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

  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "utility-accounts",
    utilityAccount._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    utilityAccount.documents = [
      ...(utilityAccount.documents || []),
      ...uploadedDocuments,
    ];
    updatedFields.push("documents");
  }

  ensureUtilityAccountDataSheet(utilityAccount);

  applyDataSheetInclusionsToAccount(
    utilityAccount,
    parseDataSheetInclusions(data_sheet_inclusions),
  );

  const updatedUtilityAccount = await utilityAccount.save();

  const parsedInclusions = parseDataSheetInclusions(data_sheet_inclusions);
  if (parsedInclusions) {
    await syncAllAuditSectionsForUtilityAccount(updatedUtilityAccount._id);
  }

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "utility_account",
    entity_id: updatedUtilityAccount._id,
    entity_name: updatedUtilityAccount.account_number,
    facility_id: updatedUtilityAccount.facility_id,
    utility_account_id: updatedUtilityAccount._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "utility account",
      entityName: updatedUtilityAccount.account_number,
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      connection_type: updatedUtilityAccount.connection_type,
    },
  });

  const responseAccount = parsedInclusions
    ? await UtilityAccount.findById(updatedUtilityAccount._id)
    : updatedUtilityAccount;

  return await enrichWithStats(responseAccount);
};

export const uploadUtilityAccountDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const utilityAccount = await UtilityAccount.findById(id);

  if (!utilityAccount) {
    const error = new Error("Utility account not found");
    error.statusCode = 404;
    throw error;
  }

  const facility = await resolveAccessibleFacility(
    user,
    utilityAccount.facility_id,
  );

  if (!facility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
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

  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "utility-accounts",
    utilityAccount._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    utilityAccount.documents = [
      ...(utilityAccount.documents || []),
      ...uploadedDocuments,
    ];
    await utilityAccount.save();
  }

  return await enrichWithStats(utilityAccount);
};

export const deleteUtilityAccountService = async ({ user, id }) => {
  const utilityAccount = await UtilityAccount.findById(id);

  if (!utilityAccount) {
    const error = new Error("Utility account not found");
    error.statusCode = 404;
    throw error;
  }

  const facility = await resolveAccessibleFacility(
    user,
    utilityAccount.facility_id,
  );

  if (!facility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  const entityName = utilityAccount.account_number;
  const facilityId = utilityAccount.facility_id;

  await utilityAccount.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "utility_account",
    entity_id: utilityAccount._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityAccount._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "utility account",
      entityName,
    }),
  });

  return true;
};
