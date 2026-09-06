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
import { Edit3 } from "lucide-react";
import { useUpdateWorkPlanMutation, WorkPlan } from "@/store/slices/workPlannerApiSlice";
import { toast } from "sonner";

export interface EditPlanModalProps {
  open: boolean;
  onClose: () => void;
  plan: WorkPlan | null;
}

export function EditPlanModal({ open, onClose, plan }: EditPlanModalProps) {
  const [updateWorkPlan, { isLoading }] = useUpdateWorkPlanMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [planType, setPlanType] = useState<"visits" | "work_from_office" | "work_from_home" | "leave">("work_from_office");
  const [date, setDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    if (plan) {
      setTitle(plan.title || "");
      setDescription(plan.description || "");
      setPlanType(plan.planType || "work_from_office");
      setDate(plan.date ? new Date(plan.date).toISOString().split("T")[0] : "");
      setLeaveReason(plan.leaveReason || "");
    }
  }, [plan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    try {
      await updateWorkPlan({
        id: plan._id,
        title,
        description,
        planType,
        date: date || undefined,
        leaveReason: planType === "leave" ? leaveReason : undefined,
      }).unwrap();

      toast.success("Work plan updated successfully.");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update work plan.");
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" /> Edit Work Plan
          </DialogTitle>
          <DialogDescription>
            Update the core details of this work plan. Changes can be saved while the plan is awaiting approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="plan-title">Plan Title</Label>
            <Input
              id="plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Site Visit & Client Meeting"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-type">Plan Type</Label>
              <Select
                value={planType}
                onValueChange={(val: any) => setPlanType(val)}
              >
                <SelectTrigger id="plan-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visits">Site Visits</SelectItem>
                  <SelectItem value="work_from_office">Work From Office</SelectItem>
                  <SelectItem value="work_from_home">Work From Home</SelectItem>
                  <SelectItem value="leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-date">Target Date</Label>
              <Input
                id="plan-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {planType === "leave" && (
            <div className="space-y-2">
              <Label htmlFor="leave-reason">Leave Reason</Label>
              <Input
                id="leave-reason"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Reason for leave"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plan-description">Description / Notes</Label>
            <Textarea
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe main objectives for this plan..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
