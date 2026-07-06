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
import { DGSetFormFields } from "./dg-set-form-fields";
import type { DGSetFormState } from "./dg-set-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: DGSetFormState | null;
  onFormChange: (updater: (prev: DGSetFormState) => DGSetFormState) => void;
  onSave: () => void;
  saving?: boolean;
};

export function DGSetFormModal({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  saving = false,
}: Props) {
  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {form.isNew ? "Create DG Set" : "Edit DG Set"}
          </DialogTitle>
        </DialogHeader>
        <DGSetFormFields form={form} onFormChange={onFormChange} />
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
            {saving ? "Saving..." : form.isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
