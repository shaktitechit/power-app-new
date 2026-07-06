import {
  ACCOUNT_STATUS,
  ALL_ENERGY_DATASHEET_KEYS,
  AUDIT_STEP_TO_DATASHEET_KEY,
  CONNECTED_DATASHEET_KEYS,
  FINAL_SUBMIT_STEPS,
  SAFETY_DATASHEET_KEYS,
  SECTION_STATUS,
  STANDARD_DATASHEET_KEYS,
  getDataSheetKeyForAuditStep,
  isEnergyAuditStep,
  isFinalSubmitStep,
} from "./utility-workflow.constants.js";
import {
  buildDefaultDataSheet,
  DATASHEET_ALL_FALSE_INCLUSIONS,
  defaultConnectedSection,
  defaultSection,
} from "./utility-workflow.defaults.js";

const cloneDataSheet = (dataSheet) => {
  const base = buildDefaultDataSheet(DATASHEET_ALL_FALSE_INCLUSIONS);
  if (!dataSheet || typeof dataSheet !== "object") return base;

  for (const key of ALL_ENERGY_DATASHEET_KEYS) {
    const incoming = dataSheet[key];
    if (!incoming || typeof incoming !== "object") continue;

    const connected = incoming.connected === true;

    if (CONNECTED_DATASHEET_KEYS.includes(key)) {
      base[key] = {
        ...defaultConnectedSection(connected),
        ...incoming,
        connected,
      };
    } else {
      base[key] = {
        ...defaultSection(connected),
        ...incoming,
        connected,
      };
    }
  }

  return base;
};

export const parseDataSheetInclusions = (raw) => {
  if (raw === undefined || raw === null || raw === "") return null;

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const out = {};
  for (const key of ALL_ENERGY_DATASHEET_KEYS) {
    if (key in parsed) out[key] = Boolean(parsed[key]);
  }

  return Object.keys(out).length ? out : null;
};

export const applyDataSheetInclusionsToAccount = (account, inclusions) => {
  if (inclusions && Object.keys(inclusions).length) {
    account._dataSheetInclusions = inclusions;
  }
};

const syncDataSheetInclusions = (dataSheet, inclusions) => {
  for (const key of ALL_ENERGY_DATASHEET_KEYS) {
    if (!(key in inclusions)) continue;

    const isIncluded = Boolean(inclusions[key]);
    const wasIncluded = dataSheet[key]?.connected === true;
    const isConnectedKey = CONNECTED_DATASHEET_KEYS.includes(key);

    if (!dataSheet[key] || typeof dataSheet[key] !== "object") {
      dataSheet[key] = isConnectedKey
        ? defaultConnectedSection(isIncluded)
        : defaultSection(isIncluded);
    }

    if (!isIncluded) {
      const defaults = isConnectedKey
        ? defaultConnectedSection(false)
        : defaultSection(false);
      dataSheet[key] = { ...defaults, connected: false };
    } else if (!wasIncluded && isIncluded) {
      const defaults = isConnectedKey
        ? defaultConnectedSection(true)
        : defaultSection(true);
      dataSheet[key] = { ...defaults, connected: true };
    } else {
      dataSheet[key].connected = isIncluded;
    }
  }
};

/** Sync dataSheet inclusions before every save; new accounts get full pending sheet. */
export const prepareUtilityAccountWorkflowForSave = (account) => {
  if (!account.accountStatus) {
    account.accountStatus = ACCOUNT_STATUS.PENDING;
  }

  const inclusions = account._dataSheetInclusions;

  if (account.isNew || !account.dataSheet || typeof account.dataSheet !== "object") {
    account.dataSheet = buildDefaultDataSheet(inclusions || {});
    delete account._dataSheetInclusions;
    return account;
  }

  const dataSheet = cloneDataSheet(account.dataSheet);

  if (inclusions) {
    syncDataSheetInclusions(dataSheet, inclusions);
  }

  for (const key of ALL_ENERGY_DATASHEET_KEYS) {
    if (!dataSheet[key] || typeof dataSheet[key] !== "object") {
      dataSheet[key] = CONNECTED_DATASHEET_KEYS.includes(key)
        ? defaultConnectedSection(false)
        : defaultSection(false);
    }
  }

  delete account._dataSheetInclusions;

  account.dataSheet = dataSheet;
  account.markModified?.("dataSheet");
  return account;
};

export const syncConnectionFlagsToDataSheet = (account) => {
  account.dataSheet = cloneDataSheet(account.dataSheet);
  account.markModified?.("dataSheet");
  return account.dataSheet;
};

export const markDataSheetSectionCompleted = ({
  dataSheet,
  sheetKey,
  userId,
  at = new Date(),
}) => {
  const next = cloneDataSheet(dataSheet);
  const section = next[sheetKey];
  if (!section) return next;

  section.status = SECTION_STATUS.COMPLETED;
  section.completed_at = at;
  section.completed_by = userId;

  return next;
};

export const resetDataSheetSection = ({ dataSheet, sheetKey }) => {
  const next = cloneDataSheet(dataSheet);
  const section = next[sheetKey];
  if (!section) return next;

  section.status = SECTION_STATUS.PENDING;
  section.completed_at = null;
  section.completed_by = null;

  return next;
};

export const migrateLegacyAuditStateToDataSheet = (account) => {
  const dataSheet = cloneDataSheet(account.dataSheet);
  let accountStatus =
    account.accountStatus === ACCOUNT_STATUS.COMPLETED
      ? ACCOUNT_STATUS.COMPLETED
      : ACCOUNT_STATUS.PENDING;

  const submissions = account.audit_step_submissions;
  if (submissions && typeof submissions === "object") {
    for (const [step, sheetKey] of Object.entries(AUDIT_STEP_TO_DATASHEET_KEY)) {
      const entry = submissions[step];
      if (entry?.submitted_at) {
        dataSheet[sheetKey] = markDataSheetSectionCompleted({
          dataSheet,
          sheetKey,
          userId: entry.submitted_by,
          at: new Date(entry.submitted_at),
        })[sheetKey];
      }
    }

    if (
      submissions["preview-and-submit"]?.submitted_at ||
      submissions["safety-preview-and-submit"]?.submitted_at
    ) {
      accountStatus = ACCOUNT_STATUS.COMPLETED;
    }
  }

  return { dataSheet, accountStatus };
};

export const ensureUtilityAccountDataSheet = (account) => {
  if (!account.dataSheet || typeof account.dataSheet !== "object") {
    const migrated = migrateLegacyAuditStateToDataSheet(account);
    account.dataSheet = migrated.dataSheet;
    if (!account.accountStatus) {
      account.accountStatus = migrated.accountStatus;
    }
  } else {
    account.dataSheet = cloneDataSheet(account.dataSheet);
  }

  if (!account.accountStatus) {
    account.accountStatus = ACCOUNT_STATUS.PENDING;
  }

  return account;
};

export const isUtilityAccountCompleted = (account) =>
  account?.accountStatus === ACCOUNT_STATUS.COMPLETED;

export const isDataSheetSectionIncluded = (account, key) => {
  const section = account?.dataSheet?.[key];
  if (!section || typeof section !== "object") return false;
  return section.connected === true;
};

export const deriveLegacyAuditStepSubmissions = (account) => {
  const subs = {};
  const dataSheet = account?.dataSheet;
  if (!dataSheet) return subs;

  for (const [step, sheetKey] of Object.entries(AUDIT_STEP_TO_DATASHEET_KEY)) {
    const section = dataSheet[sheetKey];
    if (section?.status === SECTION_STATUS.COMPLETED && section.completed_at) {
      subs[step] = {
        submitted_at: section.completed_at,
        submitted_by: section.completed_by,
      };
    }
  }

  if (isUtilityAccountCompleted(account)) {
    subs["preview-and-submit"] = {
      submitted_at: account.account_completed_at || new Date(),
      submitted_by: account.account_completed_by || null,
    };
  }

  if (account.audit_step_submissions && typeof account.audit_step_submissions === "object") {
    for (const [step, entry] of Object.entries(account.audit_step_submissions)) {
      if (!subs[step] && entry) subs[step] = entry;
    }
  }

  return subs;
};

export const enrichUtilityAccountForResponse = (accountLike) => {
  const account =
    typeof accountLike?.toObject === "function"
      ? accountLike.toObject()
      : { ...accountLike };

  ensureUtilityAccountDataSheet(account);

  return {
    ...account,
    audit_step_submissions: deriveLegacyAuditStepSubmissions(account),
  };
};

const readAuditStepSubmissions = (utilityAccount) =>
  utilityAccount.audit_step_submissions &&
  typeof utilityAccount.audit_step_submissions === "object" &&
  !Array.isArray(utilityAccount.audit_step_submissions)
    ? { ...utilityAccount.audit_step_submissions }
    : {};

/** Apply audit step submission to a utility account document (does not save). */
export const applyAuditStepSubmit = (utilityAccount, { step, userId }) => {
  ensureUtilityAccountDataSheet(utilityAccount);

  if (isFinalSubmitStep(step)) {
    utilityAccount.accountStatus = ACCOUNT_STATUS.COMPLETED;
    utilityAccount.account_completed_at = new Date();
    utilityAccount.account_completed_by = userId;

    if (!utilityAccount.auditor_id && userId) {
      utilityAccount.auditor_id = userId;
    }

    const prev = readAuditStepSubmissions(utilityAccount);
    prev[step] = {
      submitted_at: utilityAccount.account_completed_at,
      submitted_by: userId,
    };
    if (step === "preview-and-submit") {
      delete prev["safety-preview-and-submit"];
    }

    utilityAccount.audit_step_submissions = prev;
    utilityAccount.markModified("audit_step_submissions");
    return;
  }

  if (isEnergyAuditStep(step)) {
    const sheetKey = getDataSheetKeyForAuditStep(step);
    const submittedAt = new Date();
    utilityAccount.dataSheet = markDataSheetSectionCompleted({
      dataSheet: utilityAccount.dataSheet,
      sheetKey,
      userId,
      at: submittedAt,
    });
    utilityAccount.markModified("dataSheet");

    const prev = readAuditStepSubmissions(utilityAccount);
    prev[step] = {
      submitted_at: submittedAt,
      submitted_by: userId,
    };
    utilityAccount.audit_step_submissions = prev;
    utilityAccount.markModified("audit_step_submissions");
    return;
  }

  const prev = readAuditStepSubmissions(utilityAccount);
  prev[step] = {
    submitted_at: new Date(),
    submitted_by: userId,
  };
  utilityAccount.audit_step_submissions = prev;
  utilityAccount.markModified("audit_step_submissions");
};

/** Revert audit step submission / allow editing (does not save). */
export const applyAuditStepAllow = (utilityAccount, { step }) => {
  ensureUtilityAccountDataSheet(utilityAccount);

  if (isFinalSubmitStep(step)) {
    utilityAccount.accountStatus = ACCOUNT_STATUS.PENDING;
    utilityAccount.account_completed_at = null;
    utilityAccount.account_completed_by = null;

    const prev = readAuditStepSubmissions(utilityAccount);
    delete prev["preview-and-submit"];
    delete prev["safety-preview-and-submit"];

    utilityAccount.audit_step_submissions = prev;
    utilityAccount.markModified("audit_step_submissions");
    return;
  }

  if (isEnergyAuditStep(step)) {
    const sheetKey = getDataSheetKeyForAuditStep(step);
    utilityAccount.dataSheet = resetDataSheetSection({
      dataSheet: utilityAccount.dataSheet,
      sheetKey,
    });
    utilityAccount.markModified("dataSheet");

    const prev = readAuditStepSubmissions(utilityAccount);
    delete prev[step];
    utilityAccount.audit_step_submissions = prev;
    utilityAccount.markModified("audit_step_submissions");
    return;
  }

  const prev = readAuditStepSubmissions(utilityAccount);
  delete prev[step];
  utilityAccount.audit_step_submissions = prev;
  utilityAccount.markModified("audit_step_submissions");
};

export { buildDefaultDataSheet, FINAL_SUBMIT_STEPS };
