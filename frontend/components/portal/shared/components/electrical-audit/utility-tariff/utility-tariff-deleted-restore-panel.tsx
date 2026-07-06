"use client";

import { Button } from "@/components/portal/ui/button";
import type { UtilityTariff } from "@/store/slices/electrical-audit/utilityTariffApiSlice";
import { RotateCcw } from "lucide-react";
import {
  formatDisplayValue,
  tariffToForm,
  toDateInput,
} from "./utility-tariff-utils";

function PreviewField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-[11px] leading-tight text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-medium text-foreground">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

type Props = {
  tariff: UtilityTariff;
  restoring?: boolean;
  onRestore: () => void;
  onLoadIntoForm?: () => void;
};

export function UtilityTariffDeletedRestorePanel({
  tariff,
  restoring = false,
  onRestore,
  onLoadIntoForm,
}: Props) {
  const form = tariffToForm(tariff);
  const deletedAt = tariff.deleted_at
    ? new Date(tariff.deleted_at).toLocaleString()
    : null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Previously deleted tariff found
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
            A tariff for effective from{" "}
            <span className="font-medium">{toDateInput(form.effective_from)}</span>
            {deletedAt ? ` was deleted on ${deletedAt}.` : " exists in archive."}{" "}
            Restore it to bring back the saved data, or change the effective from
            date to create a new record.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onLoadIntoForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadIntoForm}
              disabled={restoring}
            >
              Load into form
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={onRestore}
            disabled={restoring}
            className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {restoring ? "Restoring..." : "Restore"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2 border-t border-amber-200/80 pt-3 dark:border-amber-900/40">
        <PreviewField
          label="Effective From"
          value={toDateInput(form.effective_from)}
        />
        <PreviewField
          label="Effective To"
          value={toDateInput(form.effective_to)}
        />
        <PreviewField
          label="Basic Energy (₹/unit)"
          value={form.basic_energy_charges_rs_per_unit}
        />
        <PreviewField
          label="Fixed Charges (₹/kW or kVA)"
          value={form.fixed_charges_rs_per_kW_or_per_kVA}
        />
        <PreviewField label="ED (%)" value={form.ed_percent} />
        <PreviewField label="Documents" value={tariff.documents?.length ?? 0} />
      </div>
    </div>
  );
}
