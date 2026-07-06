"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { canUncompleteUtilityAuditStep } from "@/components/portal/lib/authRoles";
import { toastHandler } from "@/components/portal/lib/toast";
import { useOpenUtilityAuditMutation } from "@/store/slices/electrical-audit/utilityApiSlice";
import { useAppSelector } from "@/store/hooks";

type UtilityOpenAuditButtonProps = {
  utilityAccountId: string;
  accountNumber?: string;
  disabled?: boolean;
  className?: string;
  onOpened?: () => void;
};

export function UtilityOpenAuditButton({
  utilityAccountId,
  accountNumber,
  disabled = false,
  className,
  onOpened,
}: UtilityOpenAuditButtonProps) {
  const [open, setOpen] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const [openUtilityAudit, { isLoading }] = useOpenUtilityAuditMutation();

  const canOpen = canUncompleteUtilityAuditStep(user?.role);
  if (!canOpen) return null;

  const handleConfirm = async () => {
    try {
      await toastHandler({
        action: () =>
          openUtilityAudit({ utilityAccountId }).unwrap(),
        loading: "Re-opening utility audit…",
        success:
          "Utility audit is open again. All included records are marked pending.",
      });
      setOpen(false);
      onOpened?.();
    } catch {
      /* toastHandler surfaced the error */
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className}
        disabled={disabled || isLoading}
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Open audit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Open utility audit?</DialogTitle>
            <DialogDescription>
              This will re-open the submitted audit
              {accountNumber ? ` for account ${accountNumber}` : ""}. All audit
              sections included on this utility account will return to pending, and
              every related record will be marked pending so editing can continue.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disabled || isLoading}
              onClick={() => void handleConfirm()}
            >
              {isLoading ? "Opening…" : "Open audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
