"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { canDeleteAuditRecords,
 } from "@/components/portal/lib/authRoles";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Card, CardContent } from "@/components/portal/ui/card";
import {
  Download,
  FileSpreadsheet,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";
import { CustomTabs } from "@/components/portal/ui/custom-tabs";
import { cn } from "@/components/portal/lib/utils";
import {
  useCreateUtilityBillingRecordMutation,
  useDeleteUtilityBillingRecordMutation,
  useGetUtilityBillingRecordsQuery,
  useUpdateUtilityBillingRecordMutation,
  useUploadBillingRecordDocumentsMutation,
  type UtilityBillingRecord,
  type UtilityBillingRecordDocument,
} from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { toast } from "sonner";
import { toastHandler } from "@/components/portal/lib/toast";
import { AuditSectionSkeleton } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-skeleton";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import {
  downloadUtilityBillingRecordTemplate,
  parseUtilityBillingRecordExcelBulk,
} from "@/components/portal/lib/electrical-audit/utility-billing-record-excel";
import { validateBillingRecordPeriod } from "@/components/portal/lib/electrical-audit/utility-billing-period-validation";
import { UTILITY_AUDIT_STEP_IDS } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { cnHideUtilityAuditEdits, isUtilityAuditSheetEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { useAppSelector } from "@/store/hooks";
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
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { UtilityBillingRecordDisplayCard } from "./utility-billing-record-display-card";
import { UtilityBillingRecordFormModal } from "./utility-billing-record-form-modal";
import {
  buildBillingRecordPayload,
  createEmptyBillingForm,
  getBillingRecordTabLabel,
  recalculateBillingForm,
  recordToForm,
  sortBillingRecordsStable,
  toDateInput,
  toNumber,
  updateBillingFormField,
  type BillingFormState,
} from "./utility-billing-record-utils";

type PendingUploadFile = {
  id: string;
  file: File;
  caption: string;
};

function newPendingUploadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface UtilityBillingRecordSectionProps {
  utilityAccountId: string;
  billingCycle?: "monthly" | "bi-monthly" | "quarterly";
  auditStepLocked?: boolean;
  maxBillingDays?: number | null;
  tariffPeriodStart?: string;
  tariffPeriodEnd?: string;
}

export function UtilityBillingRecordSection({
  utilityAccountId,
  billingCycle = "monthly",
  auditStepLocked = false,
  maxBillingDays = null,
  tariffPeriodStart,
  tariffPeriodEnd,
}: UtilityBillingRecordSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);

  const { data, isLoading } = useGetUtilityBillingRecordsQuery({
    utility_account_id: utilityAccountId,
  });

  const [createUtilityBillingRecord, { isLoading: isCreating }] =
    useCreateUtilityBillingRecordMutation();
  const [updateUtilityBillingRecord, { isLoading: isUpdating }] =
    useUpdateUtilityBillingRecordMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updateUtilityBillingRecord);
  const [deleteUtilityBillingRecord, { isLoading: isDeleting }] =
    useDeleteUtilityBillingRecordMutation();
  const [uploadBillingRecordDocuments, { isLoading: isUploadingDocs }] =
    useUploadBillingRecordDocumentsMutation();

  const billingRecords = useMemo(() => data?.data || [], [data]);
  const sortedRecords = useMemo(
    () => sortBillingRecordsStable(billingRecords),
    [billingRecords],
  );
  const sheetEditsLocked = isUtilityAuditSheetEditsLocked(
    auditStepLocked,
    sortedRecords,
  );

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<BillingFormState | null>(null);
  const [activeBillTabId, setActiveBillTabId] = useState<string>("");
  const [excelImporting, setExcelImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UtilityBillingRecord | null>(
    null,
  );
  const [uploadModalRecordId, setUploadModalRecordId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] =
    useState<UtilityBillingRecordDocument | null>(null);
  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const totalBillingDays = useMemo(
    () =>
      sortedRecords.reduce(
        (sum, record) => sum + (toNumber(String(record.billing_days ?? "")) || 0),
        0,
      ),
    [sortedRecords],
  );

  const hasBillingDayLimit = maxBillingDays !== null && maxBillingDays > 0;
  const isAtBillingDayLimit =
    hasBillingDayLimit && totalBillingDays >= maxBillingDays;
  const isOverBillingDayLimit =
    hasBillingDayLimit && totalBillingDays > maxBillingDays;
  const billingDayLimitLabel = hasBillingDayLimit ? String(maxBillingDays) : "—";

  const billTabs = useMemo(
    () =>
      sortedRecords.map((record, index) => ({
        id: record._id,
        label: getBillingRecordTabLabel(record, index),
      })),
    [sortedRecords],
  );

  const activeRecord = useMemo(
    () => sortedRecords.find((record) => record._id === activeBillTabId) ?? null,
    [sortedRecords, activeBillTabId],
  );

  useEffect(() => {
    if (!billTabs.length) {
      setActiveBillTabId("");
      return;
    }
    if (!billTabs.some((tab) => tab.id === activeBillTabId)) {
      setActiveBillTabId(billTabs[billTabs.length - 1].id);
    }
  }, [billTabs, activeBillTabId]);

  const openCreateModal = () => {
    if (!hasBillingDayLimit) {
        toast.error(
        "Configure utility tariff effective from and effective to dates before adding billing records.",
        );
        return;
      }
    if (isAtBillingDayLimit) {
        toast.error(
        `Cannot add more billing records. The total sum of billing days has reached ${totalBillingDays} / ${maxBillingDays} days.`,
        );
        return;
      }
    setModalForm(createEmptyBillingForm());
    setFormModalOpen(true);
  };

  const openEditModal = (record: UtilityBillingRecord) => {
    setModalForm(recordToForm(record));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
  };

  const handleModalFieldChange = (
    key: keyof BillingFormState,
    value: string,
  ) => {
    setModalForm((prev) =>
      prev ? updateBillingFormField(prev, key, value) : prev,
    );
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    if (
      !modalForm.billing_period_start.trim() ||
      !modalForm.billing_period_end.trim()
    ) {
      toast.error("Billing period start and end dates are required.");
      return;
    }

    const currentDays = toNumber(modalForm.billing_days) || 0;
    const savedRecordsDays = sortedRecords
      .filter((record) => record._id !== modalForm.id)
      .reduce(
        (sum, record) =>
          sum + (toNumber(String(record.billing_days ?? "")) || 0),
        0,
      );
    const totalDays = savedRecordsDays + currentDays;

    if (hasBillingDayLimit && totalDays > maxBillingDays) {
      toast.error(
        `The sum of billing days across records (${totalDays} days) cannot exceed the tariff period (${maxBillingDays} days).`,
      );
      return;
    }

    const periodValidation = validateBillingRecordPeriod({
      billingStart: modalForm.billing_period_start,
      billingEnd: modalForm.billing_period_end,
      tariffPeriodStart,
      tariffPeriodEnd,
      maxBillingDays,
      otherRecords: sortedRecords.map((record) => ({
        billing_period_start: toDateInput(record.billing_period_start),
        billing_period_end: toDateInput(record.billing_period_end),
        id: record._id,
        bill_no: record.bill_no,
      })),
      excludeId: modalForm.id,
    });

    if (!periodValidation.valid) {
      toast.error(periodValidation.message || "Invalid billing period.");
      return;
    }

    const payload = buildBillingRecordPayload(modalForm, utilityAccountId);

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createUtilityBillingRecord(payload).unwrap();
          }
          if (modalForm.id) {
            return updateUtilityBillingRecord({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(
            new Error("Utility billing record ID is missing."),
          );
        },
        loading: modalForm.isNew
          ? "Creating billing record..."
          : "Updating billing record...",
        success: modalForm.isNew
          ? "Billing record created successfully"
          : "Billing record updated successfully",
      });
      if (modalForm.isNew && result?.data?._id) {
        setActiveBillTabId(result.data._id);
      } else if (modalForm.id) {
        setActiveBillTabId(modalForm.id);
      }
      closeFormModal();
    } catch (error) {
      console.error("Failed to save utility billing record:", error);
    }
  };

  const handleDelete = (record: UtilityBillingRecord) => {
    if (!canDeleteRecords) return;
    setDeleteTarget(record);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () =>
          deleteUtilityBillingRecord(deleteTarget._id).unwrap(),
        loading: "Deleting billing record...",
        success: "Billing record deleted successfully",
      });
      if (activeBillTabId === deleteTarget._id) {
        const remaining = sortedRecords.filter(
          (record) => record._id !== deleteTarget._id,
        );
        setActiveBillTabId(remaining[remaining.length - 1]?._id ?? "");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete utility billing record:", error);
    }
  };

  const handleDownloadBillingExcelTemplate = async () => {
    const recordCount = sortedRecords.length || 12;
    await downloadUtilityBillingRecordTemplate({
      billingCycle,
      utilityAccountId,
      recordCount,
      rowPrefills: sortedRecords.map((record) => ({
        billing_period_start: toDateInput(record.billing_period_start),
        billing_period_end: toDateInput(record.billing_period_end),
        bill_no: record.bill_no,
        slotKey: record._id,
      })),
    });
  };

  const handleExcelFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("Please choose an Excel file (.xlsx or .xls).");
      return;
    }

    setExcelImporting(true);
    try {
      const rowPayloads = await parseUtilityBillingRecordExcelBulk(file);
      if (!rowPayloads.length) {
        toast.error(
          "No data rows found under the header. Fill the template and try again.",
        );
        return;
      }

      let createdCount = 0;
      let skippedCount = 0;
      let cumulativeDays = totalBillingDays;
      const importedRecords = [...sortedRecords];
      let lastCreatedId = "";

      for (const partial of rowPayloads) {
        if (!partial || Object.keys(partial).length === 0) {
          skippedCount += 1;
          continue;
        }

        const normalized = { ...partial };
        if (partial.billing_period_start) {
          normalized.billing_period_start = toDateInput(
            partial.billing_period_start,
          );
        }
        if (partial.billing_period_end) {
          normalized.billing_period_end = toDateInput(partial.billing_period_end);
        }

        const form = recalculateBillingForm({
          ...createEmptyBillingForm(),
          ...normalized,
        });

        const rowDays = toNumber(form.billing_days) || 0;
        const periodValidation = validateBillingRecordPeriod({
          billingStart: form.billing_period_start,
          billingEnd: form.billing_period_end,
          tariffPeriodStart,
          tariffPeriodEnd,
          maxBillingDays,
          otherRecords: importedRecords.map((record) => ({
            billing_period_start: toDateInput(record.billing_period_start),
            billing_period_end: toDateInput(record.billing_period_end),
            id: record._id,
            bill_no: record.bill_no,
          })),
        });

        if (
          !periodValidation.valid ||
          maxBillingDays === null ||
          cumulativeDays + rowDays > maxBillingDays
        ) {
          skippedCount += 1;
          continue;
        }

        const created = await createUtilityBillingRecord(
          buildBillingRecordPayload(form, utilityAccountId),
        ).unwrap();

        lastCreatedId = created.data._id;

        importedRecords.push({
          _id: created.data._id,
          billing_period_start: form.billing_period_start,
          billing_period_end: form.billing_period_end,
          bill_no: form.bill_no,
          billing_days: rowDays,
        } as UtilityBillingRecord);

        cumulativeDays += rowDays;
        createdCount += 1;
      }

      if (createdCount === 0) {
        toast.error(
          skippedCount > 0
            ? `No rows imported because they exceed the tariff period limit or have invalid/overlapping billing dates.`
            : "No values found in data rows. Enter data in the template and try again.",
        );
        return;
      }

      if (skippedCount > 0) {
        toast.warning(
          `Imported ${createdCount} record(s). ${skippedCount} row(s) were skipped.`,
        );
      } else {
        toast.success(`Imported ${createdCount} billing record(s).`);
      }
      if (lastCreatedId) {
        setActiveBillTabId(lastCreatedId);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not read that Excel file.",
      );
    } finally {
      setExcelImporting(false);
    }
  };

  const handleOpenUploadModal = (recordId: string) => {
    setUploadModalRecordId(recordId);
    setUploadFiles([]);
  };

  const handleUploadDocs = async () => {
    if (!uploadModalRecordId || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadBillingRecordDocuments({
            id: uploadModalRecordId,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadModalRecordId(null);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (
    doc: UtilityBillingRecordDocument,
    recordId: string,
    idx: number,
  ) => {
    setPreviewDoc(doc);
    setPreviewRecordId(recordId);
    setPreviewDocIndex(idx);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!previewRecordId || previewDocIndex === null || !previewDoc) return;
    const record = billingRecords.find((r) => r._id === previewRecordId);
    if (!record) return;

    const existingDocuments = (record.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateUtilityBillingRecord({
            id: previewRecordId,
            existing_documents: existingDocuments,
          }).unwrap(),
        loading: "Saving caption...",
        success: "Caption updated",
      });
      setPreviewDoc((prev) =>
        prev ? { ...prev, caption: editCaptionValue } : prev,
      );
    } catch (err) {
      console.error("Failed to save caption:", err);
    }
  };

  const saving = isCreating || isUpdating || isDeleting;

  if (isLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className="relative space-y-4">

      <div className="relative space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3
                  id="utility-billing-records-heading"
                  className="text-lg font-medium text-foreground"
                >
                  Utility Billing Records
                </h3>
                <div
                  className={cn(
                  "flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm transition",
                  isOverBillingDayLimit
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                    : isAtBillingDayLimit
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
                )}
              >
                Total Days: {totalBillingDays} / {billingDayLimitLabel}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
              {hasBillingDayLimit ? (
                <>
                  Switch between bills using the tabs below. Use Add or Edit to
                  open the form in a modal. Each period must fall within the
                  tariff window
                  {tariffPeriodStart && tariffPeriodEnd
                    ? ` (${tariffPeriodStart} to ${tariffPeriodEnd})`
                    : ""}
                  , must not overlap, and total days must not exceed{" "}
                  {maxBillingDays}.
                </>
              ) : (
                <>
                  Configure utility tariff effective from and effective to
                  dates first.
                </>
              )}
              </p>
            </div>

            <div
              className={cnHideUtilityAuditEdits(
              sheetEditsLocked,
                "flex flex-wrap items-center gap-2",
              )}
            >
              <input
                id="utility-billing-excel-import"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleExcelFileChange}
                disabled={excelImporting}
              />
            {!auditStepLocked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                onClick={openCreateModal}
                disabled={!hasBillingDayLimit || isAtBillingDayLimit}
                className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Billing Record
                </Button>
            ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadBillingExcelTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
              Excel template ({sortedRecords.length || 12} rows)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={excelImporting}
                onClick={() =>
                document.getElementById("utility-billing-excel-import")?.click()
                }
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              {excelImporting ? "Importing…" : "Bulk import"}
              </Button>
            </div>
          </div>

        {sortedRecords.length === 0 ? (
            <Card>
            <CardContent className="space-y-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No billing records available.
                </p>
              {!auditStepLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                  onClick={openCreateModal}
                  disabled={!hasBillingDayLimit || isAtBillingDayLimit}
                  className="mx-auto border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Billing Record
                  </Button>
              ) : null}
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-4">
            <CustomTabs
              tabs={billTabs}
              activeTab={activeBillTabId}
              onTabChange={setActiveBillTabId}
              className="rounded-lg border bg-muted/20"
            />

            {activeRecord ? (
              <UtilityBillingRecordDisplayCard
                key={activeRecord._id}
                record={activeRecord}
                auditStepLocked={auditStepLocked}
                canDelete={canDeleteRecords}
                saving={saving}
                onEdit={() => openEditModal(activeRecord)}
                onDelete={() => handleDelete(activeRecord)}
                onToggleCompleteness={() =>
                  void handleToggleCompleteness(activeRecord)
                }
                togglingCompleteness={completenessTargetId === activeRecord._id}
                onUploadDocuments={() => handleOpenUploadModal(activeRecord._id)}
                onPreviewDocument={handleOpenPreview}
              />
            ) : null}
            </div>
          )}
        </div>

      <UtilityBillingRecordFormModal
        open={formModalOpen}
        onOpenChange={(open) => {
          if (!open) closeFormModal();
          else setFormModalOpen(true);
        }}
        form={modalForm}
        onFieldChange={handleModalFieldChange}
        onSave={handleSaveModal}
        saving={isCreating || isUpdating}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete billing record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will permanently delete this
              utility billing record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!uploadModalRecordId}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalRecordId(null);
            setUploadFiles([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50"
              onClick={() =>
                document.getElementById("billing-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="billing-doc-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setUploadFiles((prev) => [
                    ...prev,
                    ...files.map((file) => ({
                      id: newPendingUploadId(),
                      file,
                      caption: "",
                    })),
                  ]);
                  e.target.value = "";
                }}
              />
            </div>
            {uploadFiles.length > 0 ? (
              <ul className="space-y-3">
                {uploadFiles.map((item) => (
                  <li
                    key={item.id}
                    className="space-y-2 rounded-md border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {item.file.name}
                      </span>
                    <button
                      type="button"
                      onClick={() =>
                          setUploadFiles((prev) =>
                            prev.filter((entry) => entry.id !== item.id),
                          )
                      }
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`billing-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`billing-doc-caption-${item.id}`}
                        value={item.caption}
                        onChange={(e) =>
                          setUploadFiles((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, caption: e.target.value }
                                : entry,
                            ),
                          )
                        }
                        placeholder="Add a caption for this document…"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadModalRecordId(null);
                  setUploadFiles([]);
                }}
                disabled={isUploadingDocs}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadDocs}
                disabled={uploadFiles.length === 0 || isUploadingDocs}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingDocs ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDoc(null);
            setPreviewRecordId(null);
            setPreviewDocIndex(null);
            setEditCaptionValue("");
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewDoc?.caption || previewDoc?.fileName || "Document Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewDoc ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                {previewDoc.fileType === "image" ? (
                    <img
                    src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                      alt={previewDoc.caption || previewDoc.fileName || "document"}
                      className="max-h-[55vh] w-full object-contain"
                    />
                  ) : (
                    <iframe
                    src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                      title={previewDoc.fileName || "document"}
                      className="h-[55vh] w-full"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editCaptionValue}
                      onChange={(e) => setEditCaptionValue(e.target.value)}
                      placeholder="Add a caption…"
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleSaveCaption}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
