"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Button } from "@/components/portal/ui/button";
import { useAssignableUsersQuery } from "@/store/slices/userApiSlice";
import type { Enquiry } from "@/store/slices/enquiryApiSlice";
import { useAppSelector } from "@/store/hooks";
import {
  canAssignEnquiryRoles,
  resolveUserId,
} from "@/components/portal/lib/enquiryAccess";
import {
  ENQUIRY_UNASSIGNED,
  EnquiryAssignmentFields,
} from "./enquiry-assignment-fields";

interface EnquiryAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry: Enquiry | null | undefined;
  isSubmitting?: boolean;
  onSubmit: (payload: {
    assigned_to: string | null;
    assigned_manager_to: string | null;
    assigned_admin_to: string | null;
  }) => Promise<void> | void;
}

export function EnquiryAssignDialog({
  open,
  onOpenChange,
  enquiry,
  isSubmitting,
  onSubmit,
}: EnquiryAssignDialogProps) {
  const [assignedTo, setAssignedTo] = useState(ENQUIRY_UNASSIGNED);
  const [assignedManagerTo, setAssignedManagerTo] = useState(ENQUIRY_UNASSIGNED);
  const [assignedAdminTo, setAssignedAdminTo] = useState(ENQUIRY_UNASSIGNED);

  const { data: assignableRes } = useAssignableUsersQuery(undefined, {
    skip: !open,
  });
  const assignableUsers = assignableRes?.data ?? [];
  const currentUser = useAppSelector((state) => state.auth.user);
  const canAssignAll = canAssignEnquiryRoles(currentUser?.role);

  useEffect(() => {
    if (!open || !enquiry) return;
    setAssignedTo(resolveUserId(enquiry.assigned_to) ?? ENQUIRY_UNASSIGNED);
    setAssignedManagerTo(
      resolveUserId(enquiry.assigned_manager_to) ?? ENQUIRY_UNASSIGNED,
    );
    setAssignedAdminTo(
      resolveUserId(enquiry.assigned_admin_to) ?? ENQUIRY_UNASSIGNED,
    );
  }, [open, enquiry]);

  const handleSubmit = async () => {
    if (!canAssignAll) return;
    await onSubmit({
      assigned_to: assignedTo === ENQUIRY_UNASSIGNED ? null : assignedTo,
      assigned_manager_to:
        assignedManagerTo === ENQUIRY_UNASSIGNED ? null : assignedManagerTo,
      assigned_admin_to:
        assignedAdminTo === ENQUIRY_UNASSIGNED ? null : assignedAdminTo,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Assign enquiry</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <EnquiryAssignmentFields
            mode="edit"
            assignedTo={assignedTo}
            assignedManagerTo={assignedManagerTo}
            assignedAdminTo={assignedAdminTo}
            onAssignedToChange={setAssignedTo}
            onAssignedManagerToChange={setAssignedManagerTo}
            onAssignedAdminToChange={setAssignedAdminTo}
            assignableUsers={assignableUsers}
            currentUser={currentUser}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !canAssignAll}
          >
            {isSubmitting ? "Saving…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
