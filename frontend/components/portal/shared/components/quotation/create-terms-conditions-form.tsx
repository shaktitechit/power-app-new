"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Button } from "@/components/portal/ui/button";
import { RichTextEditor } from "@/components/portal/ui/rich-text-editor";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TermsConditionsInput } from "@/store/slices/termsConditionsApiSlice";
import { isEmptyRichHtml } from "@/components/portal/lib/richText";

interface CreateTermsConditionsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: (TermsConditionsInput & { _id?: string }) | null;
  saving?: boolean;
  onSubmit: (value: TermsConditionsInput & { _id?: string }) => Promise<void> | void;
}

type LineDraft = {
  key: string;
  content: string;
};

function emptyLine(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: "",
  };
}

export function CreateTermsConditionsForm({
  open,
  onOpenChange,
  initial,
  saving,
  onSubmit,
}: CreateTermsConditionsFormProps) {
  const isEditing = Boolean(initial);
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title || "");
    setLines(
      initial?.lines?.length
        ? initial.lines.map((content) => ({ ...emptyLine(), content }))
        : [emptyLine()],
    );
  }, [open, initial]);

  const filledLines = lines
    .map((line) => line.content.trim())
    .filter((content) => !isEmptyRichHtml(content));
  const canSubmit = Boolean(title.trim()) && filledLines.length > 0;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Enter a title for these terms & conditions.");
      return;
    }
    if (filledLines.length === 0) {
      toast.error("Add at least one line.");
      return;
    }
    await onSubmit({
      ...(initial?._id ? { _id: initial._id } : {}),
      title: title.trim(),
      lines: filledLines,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit terms & conditions" : "Create terms & conditions"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Payment terms, Warranty, Delivery"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lines</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((current) => [...current, emptyLine()])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add line
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={line.key} className="flex items-start gap-2">
                  <span className="mt-2 w-6 shrink-0 text-xs text-muted-foreground">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <RichTextEditor
                      value={line.content}
                      onChange={(html) =>
                        setLines((current) =>
                          current.map((row) =>
                            row.key === line.key ? { ...row, content: html } : row,
                          ),
                        )
                      }
                      placeholder={`Line ${index + 1}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((current) => current.filter((row) => row.key !== line.key))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {isEditing ? "Save terms" : "Create terms"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
