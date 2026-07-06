export function toTariffDateInput(value?: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

/** Inclusive day count between two YYYY-MM-DD dates (matches billing record day calc). */
export function calculateInclusiveDaysBetween(
  start: string,
  end: string,
): number | null {
  if (!start || !end) return null;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return null;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function getLatestUtilityTariff<
  T extends { effective_from?: string | null },
>(tariffs: T[]): T | null {
  if (!tariffs.length) return null;

  return [...tariffs].sort(
    (a, b) =>
      new Date(b.effective_from || 0).getTime() -
      new Date(a.effective_from || 0).getTime(),
  )[0];
}

export function getTariffPeriodDayCount(tariff: {
  effective_from?: string | null;
  effective_to?: string | null;
} | null): number | null {
  if (!tariff?.effective_from || !tariff?.effective_to) return null;

  return calculateInclusiveDaysBetween(
    toTariffDateInput(tariff.effective_from),
    toTariffDateInput(tariff.effective_to),
  );
}
