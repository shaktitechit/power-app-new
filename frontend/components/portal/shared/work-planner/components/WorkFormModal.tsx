"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/portal/ui/dialog";
import { Button } from "@/components/portal/ui/button";
import { Label } from "@/components/portal/ui/label";
import { Input } from "@/components/portal/ui/input";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { WorkItem } from "@/store/slices/workPlannerApiSlice";

export interface WorkFormModalProps {
  open: boolean;
  initial?: WorkItem | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (work: WorkItem) => void | Promise<void>;
}

export function WorkFormModal({
  open,
  initial,
  isSaving,
  onClose,
  onConfirm,
}: WorkFormModalProps) {
  const [form, setForm] = useState<WorkItem>({
    title: "",
    description: "",
    category: "general",
    estimatedHours: 1,
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || "",
        description: initial.description || "",
        category: initial.category || "general",
        estimatedHours: initial.estimatedHours || 1,
        status: initial.status || "pending",
        notes: initial.notes || "",
      });
    } else {
      setForm({
        title: "",
        description: "",
        category: "general",
        estimatedHours: 1,
        status: "pending",
        notes: "",
      });
    }
  }, [initial, open]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    await onConfirm(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Work Item" : "Add Work Item"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update work task details." : "Add a task or responsibility for today."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Prepare Energy Audit Report"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category || "general"} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="report_writing">Report Writing</SelectItem>
                <SelectItem value="data_analysis">Data Analysis</SelectItem>
                <SelectItem value="client_meeting">Client Meeting</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              placeholder="Brief description..."
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Estimated Hours</Label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={form.estimatedHours || 1}
              onChange={(e) => setForm((f) => ({ ...f, estimatedHours: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Additional notes..."
              value={form.notes || ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.title.trim()}>
            {isSaving ? "Saving..." : initial ? "Save Changes" : "Add Work Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
