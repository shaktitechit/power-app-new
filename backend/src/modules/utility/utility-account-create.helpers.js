import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
import {
  applyDataSheetInclusionsToAccount,
  parseDataSheetInclusions,
} from "../utility-workflow/index.js";
import {
  parseBoolean,
  resolveAuditorId,
} from "../shared/electrical-audit.helpers.js";

const { UtilityAccount } = modelsRegistry;

export const BULK_CREATE_MAX_ACCOUNTS = 100;

const CONNECTION_TYPES = new Set(["LT", "HT"]);

export const validateUtilityAccountCreateInput = (raw = {}) => {
  const errors = [];
  const account_number = String(raw.account_number ?? "").trim();
  const connection_type = String(raw.connection_type ?? "").trim();

  if (!account_number) {
    errors.push("account_number is required");
  }

  if (!connection_type) {
    errors.push("connection_type is required");
  } else if (!CONNECTION_TYPES.has(connection_type)) {
    errors.push("connection_type must be LT or HT");
  }

  const sanctioned_demand_value = raw.sanctioned_demand_value;
  if (
    sanctioned_demand_value !== undefined &&
    sanctioned_demand_value !== "" &&
    Number.isNaN(Number(sanctioned_demand_value))
  ) {
    errors.push("sanctioned_demand_value must be a number");
  }

  const sanctioned_demand_unit = raw.sanctioned_demand_unit;
  if (
    sanctioned_demand_unit !== undefined &&
    sanctioned_demand_unit !== "" &&
    !["kVA", "kW", "BHP"].includes(sanctioned_demand_unit)
  ) {
    errors.push("sanctioned_demand_unit must be kVA, kW, or BHP");
  }

  return {
    errors,
    normalized: {
      account_number,
      connection_type,
      category: raw.category,
      location: raw.location,
      sanctioned_demand_value,
      sanctioned_demand_unit,
      provider: raw.provider,
      billing_cycle: raw.billing_cycle,
      audit_date: raw.audit_date,
      auditor_id: raw.auditor_id,
      is_transformer_maintained_by_facility: raw.is_transformer_maintained_by_facility,
      data_sheet_inclusions: raw.data_sheet_inclusions,
    },
  };
};

export const buildUtilityAccountDocument = ({
  user,
  facility_id,
  input,
  documents = [],
  utilityAccountId,
}) => {
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
    is_transformer_maintained_by_facility,
    data_sheet_inclusions,
  } = input;

  const utilityAccount = new UtilityAccount({
    _id: utilityAccountId || new mongoose.Types.ObjectId(),
    facility_id,
    account_number,
    connection_type,
    category,
    location,
    sanctioned_demand_value:
      sanctioned_demand_value !== undefined && sanctioned_demand_value !== ""
        ? Number(sanctioned_demand_value)
        : undefined,
    sanctioned_demand_unit: sanctioned_demand_unit || "kVA",
    provider,
    billing_cycle,
    audit_date: audit_date || undefined,
    auditor_id: resolveAuditorId(user, input),
    is_transformer_maintained_by_facility: parseBoolean(
      is_transformer_maintained_by_facility,
      false,
    ),
    documents,
  });

  const parsedInclusions = parseDataSheetInclusions(data_sheet_inclusions);
  applyDataSheetInclusionsToAccount(utilityAccount, parsedInclusions);

  return { utilityAccount, parsedInclusions };
};

export const parseBulkAccountsInput = (raw) => {
  if (raw === undefined || raw === null) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  return raw;
};
