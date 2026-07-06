import { isUtilityAuditCompleted } from "../../helpers/auditState.js";
import {
  calculateUtilityRecordLevelStats,
  enrichUtilityAccountForResponse,
} from "../utility-workflow/index.js";

export const ELECTRICAL_ENERGY_AUDIT = "Electrical Energy Audit";
export const ELECTRICAL_SAFETY_AUDIT = "Electrical Safety Audit";

export function supportsFacilityUtilityProgress(auditType) {
  return (
    auditType === ELECTRICAL_ENERGY_AUDIT ||
    auditType === ELECTRICAL_SAFETY_AUDIT
  );
}

export function summarizeFacilityUtilityProgress(utilityAccounts) {
  if (!utilityAccounts?.length) {
    return {
      percentage: 0,
      completedAccounts: 0,
      totalAccounts: 0,
      breakdown: [],
    };
  }

  let totalCompletedSections = 0;
  let totalSections = 0;

  const breakdown = utilityAccounts.map((account) => {
    const stats = account.completionStats;
    const sectionCompleted = stats?.completed ?? 0;
    const sectionTotal = stats?.total ?? 0;

    totalCompletedSections += sectionCompleted;
    totalSections += sectionTotal;

    const auditSubmitted = isUtilityAuditCompleted(account);
    const sectionPercentage = stats?.percentage ?? 0;

    return {
      label: account.account_number || "Unnamed account",
      isDone: auditSubmitted,
      detail: auditSubmitted
        ? "Audit submitted"
        : sectionTotal > 0
          ? `${sectionPercentage}% sections complete`
          : "Pending",
    };
  });

  const completedAccounts = breakdown.filter((item) => item.isDone).length;
  const percentage =
    totalSections > 0
      ? Math.round((totalCompletedSections / totalSections) * 100)
      : Math.round((completedAccounts / utilityAccounts.length) * 100);

  return {
    percentage,
    completedAccounts,
    totalAccounts: utilityAccounts.length,
    breakdown,
  };
}

async function enrichUtilityWithStats(utilityAccount) {
  const enriched = enrichUtilityAccountForResponse(utilityAccount);
  enriched.completionStats = await calculateUtilityRecordLevelStats(
    utilityAccount._id || utilityAccount.id,
    enriched.dataSheet,
  );
  return enriched;
}

export async function buildFacilityUtilityProgress(utilityAccounts) {
  if (!utilityAccounts?.length) {
    return summarizeFacilityUtilityProgress([]);
  }

  const enrichedAccounts = await Promise.all(
    utilityAccounts.map((account) => enrichUtilityWithStats(account)),
  );

  return summarizeFacilityUtilityProgress(enrichedAccounts);
}

export async function buildUtilityProgressMapForFacilities(facilities, utilities) {
  const utilitiesByFacilityId = new Map();

  for (const utility of utilities) {
    const facilityId = String(utility.facility_id);
    if (!utilitiesByFacilityId.has(facilityId)) {
      utilitiesByFacilityId.set(facilityId, []);
    }
    utilitiesByFacilityId.get(facilityId).push(utility);
  }

  const progressMap = {};
  const progressTargets = facilities.filter((facility) =>
    supportsFacilityUtilityProgress(facility.audit_type),
  );

  await Promise.all(
    progressTargets.map(async (facility) => {
      const facilityId = String(facility._id);
      const facilityUtilities = utilitiesByFacilityId.get(facilityId) || [];
      progressMap[facilityId] = await buildFacilityUtilityProgress(
        facilityUtilities,
      );
    }),
  );

  return progressMap;
}
