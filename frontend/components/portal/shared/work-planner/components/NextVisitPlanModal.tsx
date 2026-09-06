"use client";

import React, { useState } from "react";
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
import { VisitItem } from "@/store/slices/workPlannerApiSlice";

export interface NextVisitPlanModalProps {
  open: boolean;
  visit?: VisitItem | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (payload: { date: string; purpose: string }) => void | Promise<void>;
}

export function NextVisitPlanModal({
  open,
  visit,
  isSaving,
  onClose,
  onConfirm,
}: NextVisitPlanModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [purpose, setPurpose] = useState("");

  const handleSubmit = async () => {
    await onConfirm({
      date,
      purpose: purpose.trim() || `Follow-up visit for ${visit?.facilityName || visit?.location || "site"}`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Next / Follow-Up Visit</DialogTitle>
          <DialogDescription>
            Schedule a follow-up visit for <strong>{visit?.facilityName || visit?.location || "Site Visit"}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="next-visit-date">Follow-Up Date</Label>
            <Input
              id="next-visit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next-visit-purpose">Purpose of Next Visit</Label>
            <Input
              id="next-visit-purpose"
              placeholder="e.g. Final verification / proposal presentation"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !date}>
            {isSaving ? "Scheduling..." : "Schedule Next Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
