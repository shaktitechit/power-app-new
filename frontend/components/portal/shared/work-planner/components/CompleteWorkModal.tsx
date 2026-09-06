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
import { Textarea } from "@/components/portal/ui/textarea";
import { WorkItem } from "@/store/slices/workPlannerApiSlice";

export interface CompleteWorkModalProps {
  open: boolean;
  work?: WorkItem | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void | Promise<void>;
}

export function CompleteWorkModal({
  open,
  work,
  isSaving,
  onClose,
  onConfirm,
}: CompleteWorkModalProps) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!open) setRemarks("");
  }, [open]);

  const handleSubmit = async () => {
    await onConfirm(remarks.trim() || "Work task completed.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Work Task</DialogTitle>
          <DialogDescription>
            Record completion remarks for <strong>“{work?.title || "Work Task"}”</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="work-remarks">Completion Remarks</Label>
            <Textarea
              id="work-remarks"
              placeholder="What was accomplished or outcome of this task?"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSaving ? "Saving..." : "Mark Completed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
