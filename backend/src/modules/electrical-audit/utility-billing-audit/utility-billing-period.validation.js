import { modelsRegistry } from "../../../data/modelRegistry.js";

const { UtilityTariff, UtilityBillingRecord } = modelsRegistry;

export const parseBillingDateOnly = (value) => {
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

export const formatBillingDateOnly = (value) => {
  const date = parseBillingDateOnly(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
};

/** Inclusive overlap between two billing periods. */
export const billingPeriodsOverlap = (startA, endA, startB, endB) => {
  const aStart = parseBillingDateOnly(startA);
  const aEnd = parseBillingDateOnly(endA);
  const bStart = parseBillingDateOnly(startB);
  const bEnd = parseBillingDateOnly(endB);

  if (!aStart || !aEnd || !bStart || !bEnd) return false;

  return aStart <= bEnd && bStart <= aEnd;
};

export const isBillingPeriodWithinTariff = (
  billingStart,
  billingEnd,
  tariffStart,
  tariffEnd,
) => {
  const start = parseBillingDateOnly(billingStart);
  const end = parseBillingDateOnly(billingEnd);
  const tariffFrom = parseBillingDateOnly(tariffStart);
  const tariffTo = parseBillingDateOnly(tariffEnd);

  if (!start || !end || !tariffFrom || !tariffTo) return false;

  return start >= tariffFrom && end <= tariffTo;
};

export async function getLatestUtilityTariffForAccount(utilityAccountId) {
  const tariffs = await UtilityTariff.find({ utility_account_id: utilityAccountId })
    .sort({ effective_from: -1 })
    .limit(1);

  return tariffs[0] || null;
}

export async function validateUtilityBillingPeriod({
  utilityAccountId,
  billingPeriodStart,
  billingPeriodEnd,
  excludeRecordId = null,
}) {
  const start = parseBillingDateOnly(billingPeriodStart);
  const end = parseBillingDateOnly(billingPeriodEnd);

  if (!start || !end) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid billing period start or end date",
    };
  }

  if (start > end) {
    return {
      ok: false,
      statusCode: 400,
      message: "Billing period start must be on or before billing period end",
    };
  }

  const tariff = await getLatestUtilityTariffForAccount(utilityAccountId);
  if (!tariff?.effective_from || !tariff?.effective_to) {
    return {
      ok: false,
      statusCode: 400,
      message:
        "Configure utility tariff effective from and effective to dates before adding billing records",
    };
  }

  if (
    !isBillingPeriodWithinTariff(
      billingPeriodStart,
      billingPeriodEnd,
      tariff.effective_from,
      tariff.effective_to,
    )
  ) {
    return {
      ok: false,
      statusCode: 400,
      message: `Billing period must fall within the utility tariff period (${formatBillingDateOnly(tariff.effective_from)} to ${formatBillingDateOnly(tariff.effective_to)})`,
    };
  }

  const query = { utility_account_id: utilityAccountId };
  if (excludeRecordId) {
    query._id = { $ne: excludeRecordId };
  }

  const existingRecords = await UtilityBillingRecord.find(query).select(
    "billing_period_start billing_period_end bill_no",
  );

  for (const record of existingRecords) {
    if (
      billingPeriodsOverlap(
        billingPeriodStart,
        billingPeriodEnd,
        record.billing_period_start,
        record.billing_period_end,
      )
    ) {
      const label = record.bill_no?.trim() || "existing record";
      return {
        ok: false,
        statusCode: 400,
        message: `Billing period overlaps with ${label} (${formatBillingDateOnly(record.billing_period_start)} to ${formatBillingDateOnly(record.billing_period_end)})`,
      };
    }
  }

  return { ok: true };
}
