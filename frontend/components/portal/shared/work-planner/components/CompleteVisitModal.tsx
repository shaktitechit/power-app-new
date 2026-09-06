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
import { Checkbox } from "@/components/portal/ui/checkbox";
import { VisitItem } from "@/store/slices/workPlannerApiSlice";

export interface CompleteVisitModalProps {
  open: boolean;
  visit?: VisitItem | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (payload: { outcome: string; notes?: string; status: "completed" }) => void | Promise<void>;
}

export function CompleteVisitModal({
  open,
  visit,
  isSaving,
  onClose,
  onConfirm,
}: CompleteVisitModalProps) {
  const [meetingWithDoctor, setMeetingWithDoctor] = useState(false);
  const [meetingWithPurchase, setMeetingWithPurchase] = useState(false);
  const [meetingWithFinance, setMeetingWithFinance] = useState(false);
  const [meetingWithEngineer, setMeetingWithEngineer] = useState(false);
  const [newProductIntroduced, setNewProductIntroduced] = useState(false);
  const [orderReceived, setOrderReceived] = useState(false);
  const [outcome, setOutcome] = useState("");

  useEffect(() => {
    if (!open) {
      setMeetingWithDoctor(false);
      setMeetingWithPurchase(false);
      setMeetingWithFinance(false);
      setMeetingWithEngineer(false);
      setNewProductIntroduced(false);
      setOrderReceived(false);
      setOutcome("");
    }
  }, [open]);

  const handleSubmit = async () => {
    const checkSummary = [
      meetingWithDoctor && "Doctor/Client Meeting",
      meetingWithPurchase && "Purchase Meeting",
      meetingWithFinance && "Finance Meeting",
      meetingWithEngineer && "Technical/Engineer Meeting",
      newProductIntroduced && "New Product Introduced",
      orderReceived && "Order Received",
    ].filter(Boolean).join(", ");

    const finalOutcome = checkSummary
      ? `Completed (${checkSummary}). ${outcome.trim()}`
      : outcome.trim() || "Visit completed successfully.";

    await onConfirm({ outcome: finalOutcome, status: "completed" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Site Visit</DialogTitle>
          <DialogDescription>
            Record meeting checkpoints and completion outcome for{" "}
            <strong>{visit?.facilityName || visit?.location || "Site Visit"}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2.5 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
            <span className="text-xs font-semibold text-purple-900 block">Meeting Checkpoints</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={meetingWithDoctor} onCheckedChange={(c) => setMeetingWithDoctor(!!c)} />
                <span>Doctor / Client</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={meetingWithPurchase} onCheckedChange={(c) => setMeetingWithPurchase(!!c)} />
                <span>Purchase Dept</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={meetingWithFinance} onCheckedChange={(c) => setMeetingWithFinance(!!c)} />
                <span>Finance Dept</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={meetingWithEngineer} onCheckedChange={(c) => setMeetingWithEngineer(!!c)} />
                <span>Engineer / Tech</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={newProductIntroduced} onCheckedChange={(c) => setNewProductIntroduced(!!c)} />
                <span>Product Introduced</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={orderReceived} onCheckedChange={(c) => setOrderReceived(!!c)} />
                <span>Order / Deal Closed</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-outcome">Outcome & Summary Notes</Label>
            <Textarea
              id="visit-outcome"
              placeholder="Detail the discussion, findings, and agreed next steps..."
              rows={3}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSaving ? "Saving..." : "Complete Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
