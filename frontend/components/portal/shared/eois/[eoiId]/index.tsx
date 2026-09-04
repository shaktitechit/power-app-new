"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "@/components/portal/hooks/useParams";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
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
import { ArrowLeft, Check, Pencil, CircleSlash, Trash2 } from "lucide-react";
import {
  type EoiStatus,
  useGetEoiByIdQuery,
  useUpdateEoiStatusMutation,
  useDeleteEoiMutation,
  useApproveEoiSignatoryMutation,
} from "@/store/slices/eoiApiSlice";
import { EoiStatusPill } from "@/components/portal/shared/components/eoi/eoi-status-pill";
import { EoiPdfPreviewButton } from "@/components/portal/shared/components/eoi/eoi-pdf-preview";
import { EoiSendEmailButton } from "@/components/portal/shared/components/eoi/eoi-send-email-panel";
import { CreateEoiForm } from "@/components/portal/shared/components/eoi/create-eoi-form";
import {
  EOI_STATUS_TRANSITIONS,
  canEditEoi,
  canSendEoiEmail,
  eoiEnquiryId,
  eoiEnquiryLabel,
} from "@/components/portal/lib/eoiConstants";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";
import { toastHandler } from "@/components/portal/lib/toast";
import { RichText } from "@/components/portal/ui/rich-text";
import { useAppSelector } from "@/store/hooks";
import {
  ELECTRONIC_SIGNATORY_LABEL,
  isElectronicSignatory,
  signatoryPhone,
} from "@/components/portal/lib/signatoryDesignation";
import { SignatoryApprovalPill } from "@/components/portal/shared/components/signatory-approval-pill";
import { SignatoryApproveButton } from "@/components/portal/shared/components/signatory-approve-button";
import {
  CANCELLED_PDF_LOCKED_MESSAGE,
  SIGNATORY_APPROVAL_LOCKED_MESSAGE,
  SIGNATORY_EDIT_LOCKED_MESSAGE,
  canApproveAsSignatory,
  currentAuthUserId,
  isCancelledDocument,
  isSignatoryApproved,
  isSignatoryApprovalPending,
  isSignatoryContentLocked,
  signatoryDisplayNameFromDoc,
} from "@/components/portal/lib/signatoryApproval";

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

export default function EoiDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eoiId = String(params.eoiId || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<EoiStatus | null>(null);

  const user = useAppSelector((state) => state.auth.user);
  const canDelete = user?.role === "super_admin";

  const { data, isLoading, isError } = useGetEoiByIdQuery(eoiId, {
    skip: !eoiId,
  });
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateEoiStatusMutation();
  const [deleteEoi, { isLoading: deleting }] = useDeleteEoiMutation();
  const [approveEoiSignatory, { isLoading: approving }] = useApproveEoiSignatoryMutation();

  const eoi = data?.data;
  const enquiryId = eoi ? eoiEnquiryId(eoi) : undefined;

  const allowedNext = eoi ? EOI_STATUS_TRANSITIONS[eoi.status] ?? [] : [];

  const changeStatus = async (status: EoiStatus, success: string) => {
    if (!eoi) return;
    await toastHandler({
      loading: "Updating EOI…",
      success,
      action: () => updateStatus({ id: eoi._id, status }).unwrap(),
    });
  };

  const handleDelete = async () => {
    if (!eoi) return;
    await toastHandler({
      loading: "Deleting EOI…",
      success: "EOI deleted.",
      action: () => deleteEoi(eoi._id).unwrap(),
    });
    router.push("/eois");
  };

  const actionButtons = useMemo(() => {
    if (!eoi) return [];
    const buttons: {
      label: string;
      status: EoiStatus;
      success: string;
      variant?: "default" | "outline" | "destructive";
    }[] = [];
    if (allowedNext.includes("ACCEPTED")) {
      buttons.push({ label: "Accept", status: "ACCEPTED", success: "EOI accepted." });
    }
    if (allowedNext.includes("REJECTED")) {
      buttons.push({
        label: "Reject",
        status: "REJECTED",
        success: "EOI rejected.",
        variant: "outline",
      });
    }
    if (allowedNext.includes("CANCELLED")) {
      buttons.push({
        label: "Cancel",
        status: "CANCELLED",
        success: "EOI cancelled.",
        variant: "destructive",
      });
    }
    return buttons;
  }, [allowedNext, eoi]);

  if (!eoiId || isError) {
    return (
      <DashboardLayout title="EOI" subtitle="EOI not found">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">This EOI could not be found.</p>
          <Button asChild variant="outline">
            <Link href="/eois">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to EOIs
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading || !eoi) {
    return (
      <DashboardLayout title="EOI" subtitle="Loading EOI details">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={eoi.eoiRef} subtitle={eoi.subject}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 h-8 px-2">
            <Link href="/eois" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              All EOIs
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{eoi.eoiRef}</h2>
            <EoiStatusPill status={eoi.status} />
            <SignatoryApprovalPill doc={eoi} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{eoi.subject}</p>
          {isCancelledDocument(eoi) ? (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {CANCELLED_PDF_LOCKED_MESSAGE}
            </p>
          ) : isSignatoryApprovalPending(eoi) ? (
            <p className="mt-2 max-w-xl text-sm text-amber-800 dark:text-amber-200">
              {SIGNATORY_APPROVAL_LOCKED_MESSAGE} The assigned signatory (
              {signatoryDisplayNameFromDoc(eoi)}) can preview the PDF before approving.
            </p>
          ) : isSignatoryContentLocked(eoi) ? (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {SIGNATORY_EDIT_LOCKED_MESSAGE}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <EoiPdfPreviewButton eoi={eoi} />
          {canEditEoi(eoi.status, eoi) ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
          {canApproveAsSignatory(eoi, currentAuthUserId(user)) ? (
            <SignatoryApproveButton
              doc={eoi}
              documentLabel="EOI"
              refLabel={eoi.eoiRef}
              isLoading={approving}
              onApprove={() => approveEoiSignatory({ id: eoi._id }).unwrap()}
            />
          ) : null}
          {canSendEoiEmail(eoi.status) && isSignatoryApproved(eoi) ? (
            <EoiSendEmailButton
              eoi={eoi}
              mode={eoi.status === "DRAFT" ? "send" : "resend"}
            />
          ) : null}
          {actionButtons.map((action) => (
            <Button
              key={action.status}
              variant={action.variant ?? "default"}
              size="sm"
              disabled={updatingStatus}
              onClick={() => setStatusConfirm(action.status)}
            >
              {action.status === "ACCEPTED" ? <Check className="mr-1.5 h-3.5 w-3.5" /> : null}
              {action.status === "CANCELLED" || action.status === "REJECTED" ? (
                <CircleSlash className="mr-1.5 h-3.5 w-3.5" />
              ) : null}
              {action.label}
            </Button>
          ))}
          {canDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">EOI</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Date" value={formatDisplayDate(eoi.eoiDate)} />
            <Row
              label="Enquiry"
              value={
                enquiryId ? (
                  <Link href={`/enquiries/${enquiryId}`} className="text-primary hover:underline">
                    {eoiEnquiryLabel(eoi)}
                  </Link>
                ) : (
                  eoiEnquiryLabel(eoi)
                )
              }
            />
            {eoi.quotationId ? (
              <Row
                label="Quotation"
                value={
                  <Link
                    href={`/quotations/${eoi.quotationId}`}
                    className="text-primary hover:underline"
                  >
                    View quotation
                  </Link>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Recipient</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Designation" value={eoi.recipient?.designation || "—"} />
            <Row label="Organization" value={eoi.recipient?.organization || "—"} />
            <Row label="Address" value={eoi.recipient?.address || "—"} />
            <Row label="Email" value={eoi.recipient?.email || "—"} />
            <Row label="Phone" value={eoi.recipient?.phone || "—"} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 py-4">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-sm">Letter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 text-sm">
          <p className="text-foreground">{eoi.salutation || "—"}</p>
          {eoi.body ? (
            <RichText html={eoi.body} className="text-muted-foreground" />
          ) : (
            <p className="text-muted-foreground">No letter body.</p>
          )}
          <p className="whitespace-pre-line text-foreground">
            {eoi.complimentaryClose || "—"}
          </p>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Company</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Name" value={eoi.company?.name || "—"} />
            <Row label="Address" value={eoi.company?.address || "—"} />
            <Row label="Phone" value={eoi.company?.phone || eoi.company?.mobile || "—"} />
            <Row label="Email" value={eoi.company?.email || "—"} />
            <Row label="Website" value={eoi.company?.website || "—"} />
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Signatory</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Name" value={eoi.signatory?.name || "—"} />
            <Row label="Designation" value={eoi.signatory?.designation || "—"} />
            <Row label="Phone" value={signatoryPhone(eoi.signatory) || "—"} />
            <Row label="Company" value={eoi.signatory?.companyName || "—"} />
            {isElectronicSignatory(eoi.signatory) ? (
              <Row label="Signature" value={ELECTRONIC_SIGNATORY_LABEL} />
            ) : null}
            <Row
              label="Approval"
              value={
                isSignatoryApproved(eoi)
                  ? `Approved${eoi.signatoryApproval?.approvedAt ? ` · ${formatDisplayDate(eoi.signatoryApproval.approvedAt)}` : ""}`
                  : "Pending"
              }
            />
          </CardContent>
        </Card>
      </div>

      {eoi.internalNotes ? (
        <Card className="mt-4 py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-sm text-muted-foreground">
            {eoi.internalNotes}
          </CardContent>
        </Card>
      ) : null}

      <CreateEoiForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onComplete={() => setEditOpen(false)}
        eoi={eoi}
      />

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
    </DashboardLayout>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-foreground">{value}</span>
    </div>
  );
}
