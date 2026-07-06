"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import {
  UTILITY_AUDIT_STEP_IDS,
  UTILITY_AUDIT_STEP_LABELS,
  getUtilityAuditStepState,
} from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { canUncompleteUtilityAuditStep } from "@/components/portal/lib/authRoles";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import { AuditStepCompleteConfirmation } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-step-complete-confirmation";
import { useMarkUtilityAuditStepUncompletedMutation } from "@/store/slices/electrical-audit/utilityApiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import { useAppSelector } from "@/store/hooks";

type AuditStepSubmitBarProps = {
  utilityAccountId: string;
  stepId: string;
  stepLabel?: string;
  utilityAccount?: UtilityAccount | null;
  /** Facility closure or final audit lock — blocks uncomplete */
  globalAuditLocked?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "compact";
};

const isEnergyAuditStepId = (stepId: string) =>
  stepId in UTILITY_AUDIT_STEP_LABELS &&
  stepId !== UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT;

export function AuditStepSubmitBar({
  utilityAccountId,
  stepId,
  stepLabel,
  utilityAccount,
  globalAuditLocked = false,
  disabled = false,
  className,
  variant = "default",
}: AuditStepSubmitBarProps) {
  const [open, setOpen] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const [markUncompleted, { isLoading: isUncompleting }] =
    useMarkUtilityAuditStepUncompletedMutation();

  if (!isEnergyAuditStepId(stepId) && stepId !== UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT) {
    return null;
  }

  const label =
    stepLabel ?? UTILITY_AUDIT_STEP_LABELS[stepId] ?? "This audit step";

  const isFinalSubmit = stepId === UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT;
  const stepState = getUtilityAuditStepState(utilityAccount, stepId);
  const stepCompleted = stepState.completed;
  const canUncomplete =
    canUncompleteUtilityAuditStep(user?.role) && !globalAuditLocked;

  const handleMarkUncompleted = async () => {
    try {
      await toastHandler({
        action: () =>
          markUncompleted({ utilityAccountId, step: stepId }).unwrap(),
        loading: "Marking as uncompleted…",
        success: `${label} marked as uncompleted. Editing is enabled again.`,
      });
    } catch {
      /* toastHandler surfaced the error */
    }
  };

  if (!isFinalSubmit && stepCompleted) {
    if (!canUncomplete) {
      return null;
    }

    return (
      <div className={className}>
        <Button
          type="button"
          variant={variant === "compact" ? "outline" : "secondary"}
          size={variant === "compact" ? "sm" : "default"}
          className={
            variant === "compact" ? "whitespace-nowrap text-xs sm:text-sm" : undefined
          }
          disabled={disabled || isUncompleting}
          onClick={() => void handleMarkUncompleted()}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {isUncompleting ? "Applying…" : "Mark uncompleted"}
        </Button>
      </div>
    );
  }

  const buttonLabel = isFinalSubmit ? "Final submit" : "Mark completed";

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant === "compact" ? "outline" : "default"}
        size={variant === "compact" ? "sm" : "default"}
        className={
          variant === "compact" ? "whitespace-nowrap text-xs sm:text-sm" : undefined
        }
        disabled={disabled || globalAuditLocked}
        onClick={() => setOpen(true)}
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isFinalSubmit ? "Submit final audit?" : `Complete ${label}?`}
            </DialogTitle>
          </DialogHeader>
          <AuditStepCompleteConfirmation
            utilityAccountId={utilityAccountId}
            stepId={stepId}
            stepLabel={label}
            disabled={disabled}
            layout="inline"
            onCancel={() => setOpen(false)}
            onCompleted={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
