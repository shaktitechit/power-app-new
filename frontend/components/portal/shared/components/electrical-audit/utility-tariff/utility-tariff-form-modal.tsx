"use client";

import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import type { UtilityTariff } from "@/store/slices/electrical-audit/utilityTariffApiSlice";
import { Save, X } from "lucide-react";
import { UtilityTariffDeletedRestorePanel } from "./utility-tariff-deleted-restore-panel";
import {
  editableInputClass,
  type TariffModalFormState,
} from "./utility-tariff-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TariffModalFormState | null;
  onFieldChange: (key: keyof TariffModalFormState, value: string) => void;
  onSave: () => void;
  saving?: boolean;
  deletedTariffPreview?: UtilityTariff | null;
  deletedLookupLoading?: boolean;
  onRestoreDeleted?: () => void;
  onLoadDeletedIntoForm?: () => void;
  restoring?: boolean;
};

export function UtilityTariffFormModal({
  open,
  onOpenChange,
  form,
  onFieldChange,
  onSave,
  saving = false,
  deletedTariffPreview = null,
  deletedLookupLoading = false,
  onRestoreDeleted,
  onLoadDeletedIntoForm,
  restoring = false,
}: Props) {
  if (!form) return null;

  const hasDeletedConflict = form.isNew && !!deletedTariffPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {form.isNew ? "Add Utility Tariff" : "Edit Utility Tariff"}
          </DialogTitle>
        </DialogHeader>

        {form.isNew && deletedLookupLoading ? (
          <p className="text-sm text-muted-foreground">
            Checking for previously deleted tariffs…
          </p>
        ) : null}

        {hasDeletedConflict && deletedTariffPreview && onRestoreDeleted ? (
          <UtilityTariffDeletedRestorePanel
            tariff={deletedTariffPreview}
            restoring={restoring}
            onRestore={onRestoreDeleted}
            onLoadIntoForm={onLoadDeletedIntoForm}
          />
        ) : null}

        <div className="grid grid-cols-3 gap-4 py-2">
          <div className="space-y-2">
            <Label>Effective From</Label>
            <Input
              type="date"
              value={form.effective_from}
              onChange={(e) => onFieldChange("effective_from", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Effective To</Label>
            <Input
              type="date"
              value={form.effective_to}
              onChange={(e) => onFieldChange("effective_to", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Basic Energy Charges (₹/unit)</Label>
            <Input
              type="number"
              value={form.basic_energy_charges_rs_per_unit}
              onChange={(e) =>
                onFieldChange("basic_energy_charges_rs_per_unit", e.target.value)
              }
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Fixed Charges (₹/kW or kVA)</Label>
            <Input
              type="number"
              value={form.fixed_charges_rs_per_kW_or_per_kVA}
              onChange={(e) =>
                onFieldChange("fixed_charges_rs_per_kW_or_per_kVA", e.target.value)
              }
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>ED (%)</Label>
            <Input
              type="number"
              value={form.ed_percent}
              onChange={(e) => onFieldChange("ed_percent", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Octroi (₹/unit)</Label>
            <Input
              type="number"
              value={form.octroi_rs_per_unit}
              onChange={(e) =>
                onFieldChange("octroi_rs_per_unit", e.target.value)
              }
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Surcharge (₹)</Label>
            <Input
              type="number"
              value={form.surcharge_rs}
              onChange={(e) => onFieldChange("surcharge_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Cow Cess (₹)</Label>
            <Input
              type="number"
              value={form.cow_cess_rs}
              onChange={(e) => onFieldChange("cow_cess_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Rental (₹)</Label>
            <Input
              type="number"
              value={form.rental_rs}
              onChange={(e) => onFieldChange("rental_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Infra Cess (₹)</Label>
            <Input
              type="number"
              value={form.infracess_rs}
              onChange={(e) => onFieldChange("infracess_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Other Charges / Rebates (₹)</Label>
            <Input
              type="number"
              value={form.other_charges_or_rebates_rs}
              onChange={(e) =>
                onFieldChange("other_charges_or_rebates_rs", e.target.value)
              }
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Any Other (₹)</Label>
            <Input
              type="number"
              value={form.any_other_rs}
              onChange={(e) => onFieldChange("any_other_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || restoring || hasDeletedConflict}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : form.isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
