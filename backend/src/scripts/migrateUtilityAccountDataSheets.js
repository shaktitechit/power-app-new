/**
 * Backfill UtilityAccount.dataSheet from related electrical-audit records.
 *
 * Usage:
 *   npm run migrate:utility-datasheets
 *   npm run migrate:utility-datasheets -- --dry-run
 *   npm run migrate:utility-datasheets -- --account-id=<utilityAccountId>
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import UtilityAccount from "../models/utilityAccount.js";
import {
  ALL_ENERGY_DATASHEET_KEYS,
  CONNECTION_FLAG_BY_KEY,
  DATASHEET_KEY_TO_AUDIT_STEP,
  ACCOUNT_STATUS,
} from "../modules/utility-workflow/utility-workflow.constants.js";
import {
  buildDefaultDataSheet,
  DATASHEET_ALL_FALSE_INCLUSIONS,
} from "../modules/utility-workflow/utility-workflow.defaults.js";
import { migrateLegacyAuditStateToDataSheet } from "../modules/utility-workflow/utility-workflow.service.js";
import { modelsRegistry } from "../data/modelRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const {
  SolarPlant,
  SolarGenerationRecord,
  DGSet,
  DGAuditRecord,
  Transformer,
  TransformerAuditRecord,
  Pump,
  PumpAuditRecord,
  UtilityTariff,
  UtilityBillingRecord,
  HVACAudit,
  ACAuditRecord,
  LightingAuditRecord,
  StreetLightAuditRecord,
  UPSAudit,
  FanAuditRecord,
  LuxMeasurement,
  MiscLoadAuditRecord,
} = modelsRegistry;

/** dataSheet key -> models whose utility_account_id implies the section is connected */
const RELATED_MODELS_BY_DATASHEET_KEY = {
  solar: [SolarPlant, SolarGenerationRecord],
  dg: [DGSet, DGAuditRecord],
  transformer: [Transformer, TransformerAuditRecord],
  pump: [Pump, PumpAuditRecord],
  tariff: [UtilityTariff],
  billing: [UtilityBillingRecord],
  hvac: [HVACAudit],
  ac: [ACAuditRecord],
  lighting: [LightingAuditRecord],
  "street-light": [StreetLightAuditRecord],
  fan: [FanAuditRecord],
  lux: [LuxMeasurement],
  ups: [UPSAudit],
  misc: [MiscLoadAuditRecord],
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const accountIdArg = args.find((arg) => arg.startsWith("--account-id="));
  const accountId = accountIdArg ? accountIdArg.split("=")[1]?.trim() : null;

  return { dryRun, accountId };
};

const toIdString = (value) => {
  if (!value) return null;
  return String(value);
};

async function distinctUtilityAccountIds(models) {
  const ids = new Set();

  for (const Model of models) {
    const found = await Model.distinct("utility_account_id");
    for (const id of found) {
      const asString = toIdString(id);
      if (asString) ids.add(asString);
    }
  }

  return ids;
}

async function loadRelatedAccountIdsByKey() {
  const entries = await Promise.all(
    ALL_ENERGY_DATASHEET_KEYS.map(async (key) => [
      key,
      await distinctUtilityAccountIds(RELATED_MODELS_BY_DATASHEET_KEY[key] || []),
    ]),
  );

  return Object.fromEntries(entries);
}

function hasLegacyConnectionFlag(rawAccount, key) {
  const legacyField = CONNECTION_FLAG_BY_KEY[key];
  if (!legacyField) return false;
  return rawAccount[legacyField] === true;
}

function hasAuditStepActivity(rawAccount, key) {
  const step = DATASHEET_KEY_TO_AUDIT_STEP[key];
  if (!step) return false;

  const submission = rawAccount.audit_step_submissions?.[step];
  if (submission?.submitted_at) return true;

  return false;
}

function inferDataSheetInclusions(rawAccount, relatedAccountIdsByKey) {
  const accountId = toIdString(rawAccount._id);
  const inclusions = { ...DATASHEET_ALL_FALSE_INCLUSIONS };

  for (const key of ALL_ENERGY_DATASHEET_KEYS) {
    if (relatedAccountIdsByKey[key]?.has(accountId)) {
      inclusions[key] = true;
      continue;
    }

    if (hasLegacyConnectionFlag(rawAccount, key)) {
      inclusions[key] = true;
      continue;
    }

    if (hasAuditStepActivity(rawAccount, key)) {
      inclusions[key] = true;
    }
  }

  return inclusions;
}

function buildDataSheetForAccount(rawAccount, relatedAccountIdsByKey) {
  const inclusions = inferDataSheetInclusions(rawAccount, relatedAccountIdsByKey);
  const accountLike = {
    ...rawAccount,
    dataSheet: buildDefaultDataSheet(inclusions),
  };

  const { dataSheet, accountStatus } = migrateLegacyAuditStateToDataSheet(accountLike);

  const resolvedAccountStatus =
    rawAccount.accountStatus === ACCOUNT_STATUS.COMPLETED
      ? ACCOUNT_STATUS.COMPLETED
      : accountStatus;

  return { dataSheet, accountStatus: resolvedAccountStatus, inclusions };
}

async function migrateUtilityAccountDataSheets() {
  const { dryRun, accountId } = parseArgs();

  await connectDB();

  console.log(
    dryRun
      ? "Dry run — no documents will be written."
      : "Migrating utility account dataSheet fields…",
  );

  const relatedAccountIdsByKey = await loadRelatedAccountIdsByKey();

  const query = { deleted_at: null };
  if (accountId) {
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      throw new Error(`Invalid --account-id: ${accountId}`);
    }
    query._id = new mongoose.Types.ObjectId(accountId);
  }

  const rawAccounts = await UtilityAccount.collection.find(query).toArray();

  if (!rawAccounts.length) {
    console.log("No utility accounts matched.");
    await mongoose.disconnect();
    process.exit(0);
  }

  let updated = 0;
  const samples = [];

  for (const rawAccount of rawAccounts) {
    const { dataSheet, accountStatus, inclusions } = buildDataSheetForAccount(
      rawAccount,
      relatedAccountIdsByKey,
    );

    const connectedKeys = ALL_ENERGY_DATASHEET_KEYS.filter((key) => inclusions[key]);
    const label = rawAccount.account_number || String(rawAccount._id);

    if (samples.length < 5) {
      samples.push({
        account: label,
        connected: connectedKeys.join(", ") || "(none)",
        accountStatus,
      });
    }

    if (dryRun) {
      updated += 1;
      continue;
    }

    await UtilityAccount.collection.updateOne(
      { _id: rawAccount._id },
      {
        $set: {
          dataSheet,
          accountStatus,
        },
      },
    );

    updated += 1;
  }

  console.log(`Processed ${rawAccounts.length} utility account(s).`);
  console.log(`${dryRun ? "Would update" : "Updated"} ${updated} account(s).`);
  console.log("Sample results:");
  for (const sample of samples) {
    console.log(
      `  - ${sample.account}: connected=[${sample.connected}] status=${sample.accountStatus}`,
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

migrateUtilityAccountDataSheets().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
