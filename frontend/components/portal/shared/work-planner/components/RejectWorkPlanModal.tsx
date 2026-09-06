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

export interface RejectWorkPlanModalProps {
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function RejectWorkPlanModal({
  open,
  isSaving,
  onClose,
  onConfirm,
}: RejectWorkPlanModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleSubmit = async () => {
    await onConfirm(reason.trim() || "No rejection reason provided.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Work Plan</DialogTitle>
          <DialogDescription>
            Provide feedback or reason for rejecting this work plan submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Input
              id="rejection-reason"
              placeholder="e.g. Please revise site visit schedule / missing details..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !reason.trim()} variant="destructive">
            {isSaving ? "Rejecting..." : "Reject Work Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
