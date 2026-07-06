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
import { Upload, X } from "lucide-react";
import { PumpFormFields } from "./pump-form-fields";
import type { PumpFormState } from "./pump-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PumpFormState | null;
  onFormChange: (updater: (prev: PumpFormState) => PumpFormState) => void;
  onSave: () => void;
  saving?: boolean;
};

export function PumpFormModal({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  saving = false,
}: Props) {
  if (!form) return null;

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    onFormChange((prev) => ({
      ...prev,
      documents: [...prev.documents, ...fileList],
    }));
  };

  const removeFile = (index: number) => {
    onFormChange((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {form.isNew ? "Create Pump" : "Edit Pump"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <PumpFormFields
            form={form}
            onChange={onFormChange}
            disabled={saving}
          />

          {form.isNew ? (
            <div className="space-y-2">
              <Label>Documents & Drawings</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={(e) => handleFileChange(e.target.files)}
                  disabled={saving}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>

              {form.documents.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Selected Files:
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {form.documents.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded border bg-muted/30 p-2 text-xs"
                      >
                        <span className="truncate font-medium">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          disabled={saving}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
