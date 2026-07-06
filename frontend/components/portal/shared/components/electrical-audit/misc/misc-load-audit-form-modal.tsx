"use client";

import { Button } from "@/components/portal/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/portal/ui/dialog";
import { Save, X } from "lucide-react";
import { MiscLoadAuditFormFields } from "./misc-load-audit-form-fields";
import type { MiscLoadAuditFormState } from "./misc-load-audit-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: MiscLoadAuditFormState | null;
  onFormChange: (updater: (prev: MiscLoadAuditFormState) => MiscLoadAuditFormState) => void;
  onSave: () => void;
  saving?: boolean;
};

export function MiscLoadAuditFormModal({ open, onOpenChange, form, onFormChange, onSave, saving = false }: Props) {
  if (!form) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{form.isNew ? "Add Misc Load Audit" : "Edit Misc Load Audit"}</DialogTitle>
        </DialogHeader>
        <MiscLoadAuditFormFields form={form} onFormChange={onFormChange} />
        <DialogFooter className="gap-2 sm:gap-0">
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
