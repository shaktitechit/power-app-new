"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "@/components/portal/hooks/useParams";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Button } from "@/components/portal/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Checkbox } from "@/components/portal/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { ArrowLeft, Building2, Check, Pencil, CircleSlash, Trash2 } from "lucide-react";
import {
  type QuotationStatus,
  type QuotationTerm,
  useGetQuotationByIdQuery,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useDeleteQuotationMutation,
} from "@/store/slices/quotationApiSlice";
import {
  type Enquiry,
  useGetEnquiryByIdQuery,
} from "@/store/slices/enquiryApiSlice";
import { useGetFacilitiesQuery } from "@/store/slices/facilityApiSlice";
import { useGetTermsConditionsQuery } from "@/store/slices/termsConditionsApiSlice";
import { QuotationStatusPill } from "@/components/portal/shared/components/quotation/quotation-status-pill";
import { QuotationPdfPreviewButton } from "@/components/portal/shared/components/quotation/quotation-pdf-preview";
import { QuotationSendEmailButton } from "@/components/portal/shared/components/quotation/quotation-send-email-panel";
import { CreateQuotationForm } from "@/components/portal/shared/components/quotation/create-quotation-form";
import { CreateFacilityForm } from "@/components/portal/shared/components/facility/create-facility-form";
import { EditFacilityForm } from "@/components/portal/shared/components/facility/edit-facility-form";
import { facilityExpectedValue } from "@/components/portal/lib/facilityConstants";
import {
  buildFacilitiesByEnquiryNumber,
  linkedFacilitiesForQuotation,
} from "@/components/portal/lib/facilityQuotationLink";
import {
  QUOTATION_STATUS_TRANSITIONS,
  canEditQuotation,
  canSendQuotationEmail,
  formatDisplayDate,
  formatInr,
  quotationEnquiryId,
  quotationEnquiryLabel,
} from "@/components/portal/lib/quotationConstants";
import { toastHandler } from "@/components/portal/lib/toast";
import { RichText } from "@/components/portal/ui/rich-text";
import { useAppSelector } from "@/store/hooks";

const STATUS_CONFIRM: Partial<
  Record<
    QuotationStatus,
    { title: string; description: (ref: string) => string; action: string; success: string }
  >
> = {
  ACCEPTED: {
    title: "Accept this quotation?",
    description: (ref) =>
      `${ref} will be marked as accepted. You can still resend the quotation email afterwards; cancelling is the only way to reverse this.`,
    action: "Accept quotation",
    success: "Quotation accepted.",
  },
  REJECTED: {
    title: "Reject this quotation?",
    description: (ref) =>
      `${ref} will be marked as rejected. You can later move it back to draft if needed.`,
    action: "Reject quotation",
    success: "Quotation rejected.",
  },
  CANCELLED: {
    title: "Cancel this quotation?",
    description: (ref) =>
      `${ref} will be cancelled. You can later restore it as a draft if needed.`,
    action: "Cancel quotation",
    success: "Quotation cancelled.",
  },
};

function groupQuotationTerms(terms: QuotationTerm[]) {
  const groups: { title: string; lines: QuotationTerm[] }[] = [];
  for (const term of terms) {
    const last = groups[groups.length - 1];
    if (last && last.title === term.title) {
      last.lines.push(term);
    } else {
      groups.push({ title: term.title, lines: [term] });
    }
  }
  return groups;
}

export default function QuotationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = String(params.quotationId || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createFacilityOpen, setCreateFacilityOpen] = useState(false);
  const [editFacilityOpen, setEditFacilityOpen] = useState(false);
  const [editFacilityId, setEditFacilityId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<QuotationStatus | null>(null);
  const [termsEditorOpen, setTermsEditorOpen] = useState(false);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);

  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "super_admin";
  const canDelete = isSuperAdmin;

  const { data, isLoading, isError, refetch: refetchQuotation } = useGetQuotationByIdQuery(quotationId, {
    skip: !quotationId,
  });
  const { data: facilitiesData, refetch: refetchFacilities } = useGetFacilitiesQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const { data: termsLibraryRes } = useGetTermsConditionsQuery();
  const [updateQuotation, { isLoading: updatingTerms }] = useUpdateQuotationMutation();
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateQuotationStatusMutation();
  const [deleteQuotation, { isLoading: deleting }] = useDeleteQuotationMutation();

  const quotation = data?.data;
  const enquiryId = quotation ? quotationEnquiryId(quotation) : undefined;

  const { data: enquiryDetailRes } = useGetEnquiryByIdQuery(enquiryId!, {
    skip: !createFacilityOpen || !enquiryId,
  });

  const enquiryForCreate = useMemo((): Enquiry | null => {
    const enquiry = enquiryDetailRes?.data;
    if (!enquiry || !quotation) return null;
    return {
      ...enquiry,
      accepted_quotation_id: quotation._id,
    };
  }, [enquiryDetailRes?.data, quotation]);

  const facilities = facilitiesData?.data ?? [];
  const facilitiesByEnquiryNumber = useMemo(
    () => buildFacilitiesByEnquiryNumber(facilities),
    [facilities],
  );

  const linkedFacilities = useMemo(() => {
    if (!quotation) return [];
    return linkedFacilitiesForQuotation(quotation, facilities, facilitiesByEnquiryNumber);
  }, [quotation, facilities, facilitiesByEnquiryNumber]);

  const refetchAll = async () => {
    await Promise.all([
      refetchQuotation(),
      ...(isSuperAdmin ? [refetchFacilities()] : []),
    ]);
  };

  const allowedNext = quotation
    ? QUOTATION_STATUS_TRANSITIONS[quotation.status] ?? []
    : [];

  const changeStatus = async (status: QuotationStatus, success: string) => {
    if (!quotation) return;
    await toastHandler({
      loading: "Updating quotation…",
      success,
      action: () => updateStatus({ id: quotation._id, status }).unwrap(),
    });
  };

  const handleDelete = async () => {
    if (!quotation) return;
    await toastHandler({
      loading: "Deleting quotation…",
      success: "Quotation deleted.",
      action: () => deleteQuotation(quotation._id).unwrap(),
    });
    router.push("/quotations");
  };

  const items = quotation?.items ?? [];
  const financials = quotation?.financials;
  const terms = quotation?.termsAndConditions ?? [];
  const termGroups = groupQuotationTerms(terms);
  const termsLibrary = termsLibraryRes?.data ?? [];
  const canEditTerms = quotation ? canEditQuotation(quotation.status) : false;

  useEffect(() => {
    if (!termsEditorOpen) return;
    const snapshotTitles = new Set(
      (quotation?.termsAndConditions ?? []).map((term) => term.title),
    );
    setSelectedTermIds(
      (termsLibraryRes?.data ?? [])
        .filter((set) => snapshotTitles.has(set.title))
        .map((set) => set._id),
    );
  }, [termsEditorOpen, quotation?.termsAndConditions, termsLibraryRes?.data]);

  const toggleTermId = (id: string) => {
    setSelectedTermIds((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  };

  const handleSaveTerms = async () => {
    if (!quotation) return;
    await toastHandler({
      loading: "Updating terms & conditions…",
      success: "Terms & conditions updated.",
      action: () =>
        updateQuotation({
          id: quotation._id,
          termsConditionsIds: selectedTermIds,
        }).unwrap(),
    });
    setTermsEditorOpen(false);
  };

  const actionButtons = useMemo(() => {
    if (!quotation) return [];
    const buttons: { label: string; status: QuotationStatus; success: string; variant?: "default" | "outline" | "destructive" }[] = [];
    if (allowedNext.includes("ACCEPTED")) {
      buttons.push({ label: "Accept", status: "ACCEPTED", success: "Quotation accepted." });
    }
    if (allowedNext.includes("REJECTED")) {
      buttons.push({
        label: "Reject",
        status: "REJECTED",
        success: "Quotation rejected.",
        variant: "outline",
      });
    }
    if (allowedNext.includes("CANCELLED")) {
      buttons.push({
        label: "Cancel",
        status: "CANCELLED",
        success: "Quotation cancelled.",
        variant: "destructive",
      });
    }
    return buttons;
  }, [allowedNext, quotation]);

  if (!quotationId || isError) {
    return (
      <DashboardLayout title="Quotation" subtitle="Quotation not found">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">This quotation could not be found.</p>
          <Button asChild variant="outline">
            <Link href="/quotations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to quotations
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading || !quotation) {
    return (
      <DashboardLayout title="Quotation" subtitle="Loading quotation details">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={quotation.quotationRef}
      subtitle={quotation.subject}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 h-8 px-2">
            <Link href="/quotations" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              All quotations
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{quotation.quotationRef}</h2>
            <QuotationStatusPill status={quotation.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{quotation.subject}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuotationPdfPreviewButton quotation={quotation} />
          {canEditQuotation(quotation.status) ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
          {canSendQuotationEmail(quotation.status) ? (
            <QuotationSendEmailButton
              quotation={quotation}
              mode={quotation.status === "DRAFT" ? "send" : "resend"}
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

      {isSuperAdmin && quotation.status === "ACCEPTED" ? (
        <Card className="mt-4 py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Facilities</CardTitle>
            <CardAction>
              {linkedFacilities.length === 0 ? (
                <Button
                  size="sm"
                  disabled={!enquiryId}
                  title={
                    enquiryId
                      ? "Create facility from accepted quotation"
                      : "Link an enquiry before creating a facility"
                  }
                  onClick={() => setCreateFacilityOpen(true)}
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Create facility
                </Button>
              ) : null}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3 px-4 text-sm">
            {linkedFacilities.length === 0 ? (
              <p className="text-muted-foreground">
                {enquiryId
                  ? "No facilities linked yet for this accepted quotation."
                  : "This quotation has no linked enquiry, so a facility cannot be created."}
              </p>
            ) : (
              <>
                <p className="text-emerald-700 dark:text-emerald-400">
                  {linkedFacilities.length > 1
                    ? `${linkedFacilities.length} facilities linked`
                    : "Facility linked"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {linkedFacilities.map((facility) => {
                    const expectedValue = facilityExpectedValue(facility);
                    return (
                      <div
                        key={facility._id}
                        className="flex min-w-[12rem] flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {facility.audit_type ?? "Facility"}
                          </p>
                          <p className="text-xs text-muted-foreground">{facility.name}</p>
                          {expectedValue != null ? (
                            <p className="mt-1 text-xs font-semibold text-primary">
                              {formatInr(expectedValue)}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-fit"
                          onClick={() => {
                            setEditFacilityId(facility._id);
                            setEditFacilityOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!enquiryId}
                  onClick={() => setCreateFacilityOpen(true)}
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Add another facility
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Quotation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Date" value={formatDisplayDate(quotation.quotationDate)} />
            <Row label="Valid until" value={formatDisplayDate(quotation.validUntil)} />
            <Row label="Reference" value={quotation.reference || "—"} />
            <Row
              label="Enquiry"
              value={
                enquiryId ? (
                  <Link href={`/enquiries/${enquiryId}`} className="text-primary hover:underline">
                    {quotationEnquiryLabel(quotation)}
                  </Link>
                ) : (
                  quotationEnquiryLabel(quotation)
                )
              }
            />
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Name" value={quotation.customer?.name || "—"} />
            <Row label="Kind attn" value={quotation.customer?.kindAttn || "—"} />
            <Row label="Address" value={quotation.customer?.address || "—"} />
            <Row label="Email" value={quotation.customer?.email || "—"} />
            <Row label="Phone" value={quotation.customer?.phone || quotation.customer?.mobile || "—"} />
            <Row label="GSTIN" value={quotation.customer?.gstin || "—"} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 py-4">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-sm">Line items</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-4">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 font-medium">HSN/SAC</th>
                <th className="py-2 pr-3 font-medium text-right">Qty</th>
                <th className="py-2 pr-3 font-medium">Unit</th>
                <th className="py-2 pr-3 font-medium text-right">Rate</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.srNo}-${item.description}`} className="border-b border-border/70">
                  <td className="py-2 pr-3 text-muted-foreground">{item.srNo}</td>
                  <td className="py-2 pr-3">{item.description}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{item.hsnSac || "—"}</td>
                  <td className="py-2 pr-3 text-right">{item.quantity}</td>
                  <td className="py-2 pr-3">{item.unit || "Nos"}</td>
                  <td className="py-2 pr-3 text-right">{formatInr(item.rate)}</td>
                  <td className="py-2 text-right font-medium">{formatInr(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto max-w-sm space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatInr(financials?.subtotal)} />
            {Number(financials?.cgst) > 0 ? (
              <Row label={`CGST (${(financials?.gstRate ?? 18) / 2}%)`} value={formatInr(financials?.cgst)} />
            ) : null}
            {Number(financials?.sgst) > 0 ? (
              <Row label={`SGST (${(financials?.gstRate ?? 18) / 2}%)`} value={formatInr(financials?.sgst)} />
            ) : null}
            {Number(financials?.igst) > 0 ? (
              <Row label={`IGST (${financials?.gstRate ?? 18}%)`} value={formatInr(financials?.igst)} />
            ) : null}
            <Row label="Total GST" value={formatInr(financials?.totalGst)} />
            <Row label="Grand total" value={formatInr(financials?.roundedGrandTotal ?? financials?.grandTotal)} />
            <p className="pt-1 text-xs text-muted-foreground">{financials?.amountInWords}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Bank details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Beneficiary" value={quotation.bankDetails?.beneficiaryName || "—"} />
            <Row label="Bank" value={quotation.bankDetails?.bankName || "—"} />
            <Row label="Account" value={quotation.bankDetails?.accountNo || "—"} />
            <Row label="IFSC" value={quotation.bankDetails?.ifscCode || "—"} />
            <Row label="Branch" value={quotation.bankDetails?.branch || "—"} />
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Signatory</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 text-sm">
            <Row label="Name" value={quotation.signatory?.name || "—"} />
            <Row label="Designation" value={quotation.signatory?.designation || "—"} />
            <Row label="Company" value={quotation.signatory?.companyName || "—"} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 py-4">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-sm">Terms & conditions</CardTitle>
          {canEditTerms && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setTermsEditorOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-4 px-4 text-sm">
          {termGroups.length === 0 ? (
            <p className="text-muted-foreground">No terms & conditions on this quotation.</p>
          ) : (
            termGroups.map((group) => (
              <div key={group.title}>
                <p className="font-medium text-foreground">{group.title}</p>
                <ol className="mt-2 list-decimal space-y-2 pl-5">
                  {group.lines.map((term) => (
                    <li key={term.termNo}>
                      <RichText html={term.content} className="text-muted-foreground" />
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {quotation.internalNotes ? (
        <Card className="mt-4 py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm">Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-sm text-muted-foreground">
            {quotation.internalNotes}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={termsEditorOpen} onOpenChange={setTermsEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit terms & conditions</DialogTitle>
          </DialogHeader>
          {termsLibrary.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No terms & conditions yet. Create them under Quotations → Terms & conditions.
            </p>
          ) : (
            <div className="space-y-2 py-2">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelectedTermIds(
                      selectedTermIds.length === termsLibrary.length
                        ? []
                        : termsLibrary.map((set) => set._id),
                    )
                  }
                >
                  {selectedTermIds.length === termsLibrary.length ? "Clear all" : "Select all"}
                </Button>
              </div>
              {termsLibrary.map((set) => {
                const checked = selectedTermIds.includes(set._id);
                return (
                  <label
                    key={set._id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleTermId(set._id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{set.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {set.lines.length} {set.lines.length === 1 ? "line" : "lines"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTermsEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTerms}
              disabled={updatingTerms || termsLibrary.length === 0}
            >
              Save terms
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateQuotationForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onComplete={() => setEditOpen(false)}
        quotation={quotation}
      />

      {isSuperAdmin ? (
        <>
          <CreateFacilityForm
            open={createFacilityOpen}
            fromEnquiry={enquiryForCreate}
            onOpenChange={setCreateFacilityOpen}
            onComplete={() => void refetchAll()}
          />

          <EditFacilityForm
            open={editFacilityOpen}
            onOpenChange={(open) => {
              setEditFacilityOpen(open);
              if (!open) setEditFacilityId(null);
            }}
            onComplete={() => void refetchAll()}
            facilityId={editFacilityId}
          />
        </>
      ) : null}

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
                ? STATUS_CONFIRM[statusConfirm]?.description(quotation.quotationRef)
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
            <AlertDialogTitle>Delete this quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              {quotation.quotationRef} will be removed from the quotations list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep quotation</AlertDialogCancel>
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
