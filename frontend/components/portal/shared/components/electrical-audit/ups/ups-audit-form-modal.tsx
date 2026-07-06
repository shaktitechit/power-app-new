"use client";

import { Button } from "@/components/portal/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/portal/ui/dialog";
import { Save, X } from "lucide-react";
import { UPSAuditFormFields } from "./ups-audit-form-fields";
import type { UPSAuditFormState } from "./ups-audit-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UPSAuditFormState | null;
  onFormChange: (updater: (prev: UPSAuditFormState) => UPSAuditFormState) => void;
  onSave: () => void;
  saving?: boolean;
};

export function UPSAuditFormModal({ open, onOpenChange, form, onFormChange, onSave, saving = false }: Props) {
  if (!form) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{form.isNew ? "Add UPS Audit Record" : "Edit UPS Audit Record"}</DialogTitle>
        </DialogHeader>
        <UPSAuditFormFields form={form} onFormChange={onFormChange} />
        <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : form.isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
