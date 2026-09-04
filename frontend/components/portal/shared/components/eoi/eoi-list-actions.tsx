"use client";

import { useMemo, useState } from "react";
import { Check, CircleSlash, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import {
  type EoiStatus,
  type ExpressionOfInterest,
  useDeleteEoiMutation,
  useUpdateEoiStatusMutation,
} from "@/store/slices/eoiApiSlice";
import { EoiPdfListActions } from "@/components/portal/shared/components/eoi/eoi-pdf-preview";
import { EoiSendEmailButton } from "@/components/portal/shared/components/eoi/eoi-send-email-panel";
import {
  EOI_STATUS_TRANSITIONS,
  canEditEoi,
  canSendEoiEmail,
} from "@/components/portal/lib/eoiConstants";
import { toastHandler } from "@/components/portal/lib/toast";
import { useAppSelector } from "@/store/hooks";

const STATUS_CONFIRM: Partial<
  Record<
    EoiStatus,
    { title: string; description: (ref: string) => string; action: string; success: string }
  >
> = {
  ACCEPTED: {
    title: "Accept this EOI?",
    description: (ref) =>
      `${ref} will be marked as accepted. You can still resend the EOI email afterwards; cancelling is the only way to reverse this.`,
    action: "Accept EOI",
    success: "EOI accepted.",
  },
  REJECTED: {
    title: "Reject this EOI?",
    description: (ref) =>
      `${ref} will be marked as rejected. You can later move it back to draft if needed.`,
    action: "Reject EOI",
    success: "EOI rejected.",
  },
  CANCELLED: {
    title: "Cancel this EOI?",
    description: (ref) =>
      `${ref} will be cancelled. You can later restore it as a draft if needed.`,
    action: "Cancel EOI",
    success: "EOI cancelled.",
  },
};

export function EoiListActions({
  eoi,
  canAct = true,
  onEdit,
}: {
  eoi: ExpressionOfInterest;
  canAct?: boolean;
  onEdit?: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<EoiStatus | null>(null);
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateEoiStatusMutation();
  const [deleteEoi, { isLoading: deleting }] = useDeleteEoiMutation();
  const canDelete = useAppSelector((state) => state.auth.user?.role === "super_admin");

  const allowedNext = EOI_STATUS_TRANSITIONS[eoi.status] ?? [];
  const actionButtons = useMemo(() => {
    const buttons: {
      label: string;
      status: EoiStatus;
      variant?: "default" | "outline" | "destructive";
    }[] = [];
    if (allowedNext.includes("ACCEPTED")) {
      buttons.push({ label: "Accept", status: "ACCEPTED" });
    }
    if (allowedNext.includes("REJECTED")) {
      buttons.push({ label: "Reject", status: "REJECTED", variant: "outline" });
    }
    if (allowedNext.includes("CANCELLED")) {
      buttons.push({
        label: "Cancel",
        status: "CANCELLED",
        variant: "destructive",
      });
    }
    return buttons;
  }, [allowedNext]);

  const changeStatus = async (status: EoiStatus, success: string) => {
    await toastHandler({
      loading: "Updating EOI…",
      success,
      action: () => updateStatus({ id: eoi._id, status }).unwrap(),
    });
  };

  const handleDelete = async () => {
    await toastHandler({
      loading: "Deleting EOI…",
      success: "EOI deleted.",
      action: () => deleteEoi(eoi._id).unwrap(),
    });
  };

  return (
    <>
      <div
        className="flex max-w-xl flex-wrap items-center gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <EoiPdfListActions eoi={eoi} />
        {canAct && onEdit && canEditEoi(eoi.status, eoi) ? (
          <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null}
        {canAct && canSendEoiEmail(eoi.status) ? (
          <EoiSendEmailButton
            eoi={eoi}
            mode={eoi.status === "DRAFT" ? "send" : "resend"}
          />
        ) : null}
        {canAct
          ? actionButtons.map((action) => (
              <Button
                key={action.status}
                variant={action.variant ?? "default"}
                size="sm"
                className="h-8"
                disabled={updatingStatus}
                onClick={() => setStatusConfirm(action.status)}
              >
                {action.status === "ACCEPTED" ? (
                  <Check className="mr-1 h-3.5 w-3.5" />
                ) : null}
                {action.status === "CANCELLED" || action.status === "REJECTED" ? (
                  <CircleSlash className="mr-1 h-3.5 w-3.5" />
                ) : null}
                {action.label}
              </Button>
            ))
          : null}
        {canDelete ? (
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        ) : null}
      </div>

      <AlertDialog
        open={Boolean(statusConfirm)}
        onOpenChange={(open) => {
          if (!open) setStatusConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirm ? STATUS_CONFIRM[statusConfirm]?.title : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirm
                ? STATUS_CONFIRM[statusConfirm]?.description(eoi.eoiRef)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingStatus}>Keep current status</AlertDialogCancel>
            <AlertDialogAction
              disabled={updatingStatus}
              className={
                statusConfirm === "CANCELLED" || statusConfirm === "REJECTED"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => {
                if (!statusConfirm) return;
                const copy = STATUS_CONFIRM[statusConfirm];
                if (!copy) return;
                void changeStatus(statusConfirm, copy.success);
              }}
            >
              {statusConfirm ? STATUS_CONFIRM[statusConfirm]?.action : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this EOI?</AlertDialogTitle>
            <AlertDialogDescription>
              {eoi.eoiRef} will be removed from the EOI list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep EOI</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
