import {
  calculateInclusiveDaysBetween,
  toTariffDateInput,
} from "@/components/portal/lib/electrical-audit/utility-tariff-period";

export type BillingPeriodLike = {
  billing_period_start?: string;
  billing_period_end?: string;
  localId?: string;
  id?: string;
  bill_no?: string;
};

const parseBillingDateOnlyMs = (value?: string | null): number | null => {
  const normalized = toTariffDateInput(value);
  if (!normalized) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) return null;

  return Date.UTC(year, month - 1, day);
};

export const billingPeriodsOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean => {
  const aStart = parseBillingDateOnlyMs(startA);
  const aEnd = parseBillingDateOnlyMs(endA);
  const bStart = parseBillingDateOnlyMs(startB);
  const bEnd = parseBillingDateOnlyMs(endB);

  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return false;
  }

  return aStart <= bEnd && bStart <= aEnd;
};

export const isBillingPeriodWithinTariff = (
  billingStart: string,
  billingEnd: string,
  tariffStart?: string,
  tariffEnd?: string,
): boolean => {
  const start = parseBillingDateOnlyMs(billingStart);
  const end = parseBillingDateOnlyMs(billingEnd);
  const tariffFrom = parseBillingDateOnlyMs(tariffStart);
  const tariffTo = parseBillingDateOnlyMs(tariffEnd);

  if (
    start === null ||
    end === null ||
    tariffFrom === null ||
    tariffTo === null
  ) {
    return false;
  }

  return start >= tariffFrom && end <= tariffTo;
};

export function validateBillingRecordPeriod({
  billingStart,
  billingEnd,
  tariffPeriodStart,
  tariffPeriodEnd,
  maxBillingDays,
  otherRecords,
  excludeLocalId,
  excludeId,
}: {
  billingStart: string;
  billingEnd: string;
  tariffPeriodStart?: string;
  tariffPeriodEnd?: string;
  maxBillingDays?: number | null;
  otherRecords: BillingPeriodLike[];
  excludeLocalId?: string;
  excludeId?: string;
}): { valid: boolean; message?: string } {
  const start = billingStart.trim();
  const end = billingEnd.trim();

  if (!start || !end) {
    return {
      valid: false,
      message: "Billing period start and end dates are required.",
    };
  }

  const startMs = parseBillingDateOnlyMs(start);
  const endMs = parseBillingDateOnlyMs(end);

  if (startMs === null || endMs === null) {
    return {
      valid: false,
      message: "Invalid billing period start or end date.",
    };
  }

  if (startMs > endMs) {
    return {
      valid: false,
      message: "Billing period start must be on or before billing period end.",
    };
  }

  if (!tariffPeriodStart || !tariffPeriodEnd || maxBillingDays == null) {
    return {
      valid: false,
      message:
        "Configure utility tariff effective from and effective to dates before saving billing records.",
    };
  }

  if (
    !isBillingPeriodWithinTariff(
      start,
      end,
      tariffPeriodStart,
      tariffPeriodEnd,
    )
  ) {
    return {
      valid: false,
      message: `Billing period must fall within the utility tariff period (${tariffPeriodStart} to ${tariffPeriodEnd}).`,
    };
  }

  const recordDays = calculateInclusiveDaysBetween(start, end);
  if (recordDays === null) {
    return {
      valid: false,
      message: "Could not calculate billing days for this period.",
    };
  }

  for (const record of otherRecords) {
    if (excludeLocalId && record.localId === excludeLocalId) continue;
    if (excludeId && record.id === excludeId) continue;

    const otherStart = toTariffDateInput(record.billing_period_start);
    const otherEnd = toTariffDateInput(record.billing_period_end);
    if (!otherStart || !otherEnd) continue;

    if (billingPeriodsOverlap(start, end, otherStart, otherEnd)) {
      const label = record.bill_no?.trim() || "another billing record";
      return {
        valid: false,
        message: `Billing period overlaps with ${label} (${otherStart} to ${otherEnd}).`,
      };
    }
  }

  return { valid: true };
}
