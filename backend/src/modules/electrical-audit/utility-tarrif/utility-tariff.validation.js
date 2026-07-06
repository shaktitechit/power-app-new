import { modelsRegistry } from "../../../data/modelRegistry.js";

const { UtilityTariff } = modelsRegistry;

export const parseTariffDateOnly = (value) => {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  const raw = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
};

export const formatTariffDateOnly = (value) => {
  const date = parseTariffDateOnly(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
};

export async function findSoftDeletedUtilityTariff({
  utilityAccountId,
  effectiveFrom,
}) {
  const normalizedFrom = parseTariffDateOnly(effectiveFrom);
  if (!normalizedFrom || !utilityAccountId) {
    return null;
  }

  const dayStart = normalizedFrom;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return UtilityTariff.findOne({
    utility_account_id: utilityAccountId,
    deleted_at: { $ne: null },
    effective_from: { $gte: dayStart, $lt: dayEnd },
  })
    .setOptions({ includeDeleted: true })
    .select("_id effective_from deleted_at");
}

export async function findConflictingUtilityTariff({
  utilityAccountId,
  effectiveFrom,
  excludeId = null,
}) {
  const normalizedFrom = parseTariffDateOnly(effectiveFrom);
  if (!normalizedFrom || !utilityAccountId) {
    return null;
  }

  const targetDay = formatTariffDateOnly(normalizedFrom);
  const tariffs = await UtilityTariff.find({
    utility_account_id: utilityAccountId,
  }).select("_id effective_from effective_to");

  return (
    tariffs.find((tariff) => {
      if (excludeId && String(tariff._id) === String(excludeId)) {
        return false;
      }
      return formatTariffDateOnly(tariff.effective_from) === targetDay;
    }) ?? null
  );
}

export async function validateUtilityTariffEffectiveFrom({
  utilityAccountId,
  effectiveFrom,
  excludeId = null,
}) {
  const normalizedFrom = parseTariffDateOnly(effectiveFrom);
  if (!normalizedFrom) {
    return {
      ok: false,
      statusCode: 400,
      message: "Effective from must be a valid date (YYYY-MM-DD).",
    };
  }

  const conflict = await findConflictingUtilityTariff({
    utilityAccountId,
    effectiveFrom: normalizedFrom,
    excludeId,
  });

  if (conflict) {
    return {
      ok: false,
      statusCode: 409,
      message: `A utility tariff with effective from ${formatTariffDateOnly(normalizedFrom)} already exists for this utility account. Edit the existing record instead of creating a duplicate.`,
    };
  }

  return { ok: true, effectiveFrom: normalizedFrom };
}
