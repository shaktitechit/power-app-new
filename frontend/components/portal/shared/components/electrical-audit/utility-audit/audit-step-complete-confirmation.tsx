"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/portal/ui/alert";
import { useMarkUtilityAuditStepCompletedMutation } from "@/store/slices/electrical-audit/utilityApiSlice";
import {
  UTILITY_AUDIT_STEP_IDS,
  UTILITY_AUDIT_STEP_LABELS,
} from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { toastHandler } from "@/components/portal/lib/toast";

type AuditStepCompleteConfirmationProps = {
  utilityAccountId: string;
  stepId: string;
  stepLabel?: string;
  disabled?: boolean;
  onCompleted?: () => void;
  onCancel?: () => void;
  layout?: "page" | "inline";
};

export function AuditStepCompleteConfirmation({
  utilityAccountId,
  stepId,
  stepLabel,
  disabled = false,
  onCompleted,
  onCancel,
  layout = "inline",
}: AuditStepCompleteConfirmationProps) {
  const [markCompleted, { isLoading: isSubmitting }] =
    useMarkUtilityAuditStepCompletedMutation();

  const label =
    stepLabel ?? UTILITY_AUDIT_STEP_LABELS[stepId] ?? "This audit step";

  const isFinalSubmit = stepId === UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT;

  const handleConfirmSubmit = async () => {
    try {
      await toastHandler({
        action: () =>
          markCompleted({ utilityAccountId, step: stepId }).unwrap(),
        loading: isFinalSubmit ? "Submitting final audit…" : "Marking as completed…",
        success: isFinalSubmit
          ? "Final audit submitted. This utility account is now locked for editing."
          : `${label} marked as completed.`,
      });
      onCompleted?.();
    } catch {
      /* toastHandler surfaced the error */
    }
  };

  return (
    <div className={layout === "page" ? "space-y-4" : "space-y-3"}>
      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle>
          {isFinalSubmit ? "Before final submit" : "Mark step as completed?"}
        </AlertTitle>
        <AlertDescription className="mt-1 text-amber-900/90 dark:text-amber-100/90">
          {isFinalSubmit ? (
            <>
              Submitting locks <span className="font-medium">{label}</span> for
              editing. Confirm only when all audit data is complete.
            </>
          ) : (
            <>
              Marking <span className="font-medium">{label}</span> as completed
              locks this section for editing. Admin, manager, or super admin can
              mark it uncompleted later if corrections are required.
            </>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={disabled || isSubmitting}
          onClick={() => void handleConfirmSubmit()}
        >
          {isSubmitting
            ? "Saving…"
            : isFinalSubmit
              ? "Final submit"
              : "Mark as completed"}
        </Button>
      </div>
    </div>
  );
}
