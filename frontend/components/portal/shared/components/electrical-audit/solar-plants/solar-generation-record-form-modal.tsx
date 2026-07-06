"use client";

import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Save, X } from "lucide-react";
import { SolarGenerationRecordFormFields } from "./solar-generation-record-form-fields";
import {
  formatBillingPeriodLabel,
  type SolarGenerationFormState,
} from "./solar-generation-record-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: SolarGenerationFormState | null;
  onFormChange: (
    updater: (prev: SolarGenerationFormState) => SolarGenerationFormState,
  ) => void;
  onSave: () => void;
  saving?: boolean;
};

export function SolarGenerationRecordFormModal({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  saving = false,
}: Props) {
  if (!form) return null;

  const title = form.isNew
    ? `Audit · ${formatBillingPeriodLabel(form.billing_period_start, form.billing_period_end)}`
    : `Edit generation · ${formatBillingPeriodLabel(form.billing_period_start, form.billing_period_end)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <SolarGenerationRecordFormFields form={form} onFormChange={onFormChange} />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : form.isNew ? "Save audit" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
