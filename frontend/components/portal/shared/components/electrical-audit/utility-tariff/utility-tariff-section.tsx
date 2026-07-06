"use client";

import { canViewDocuments, type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
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
import {
  UtilityTariffDocument,
  type UtilityTariff,
  useCreateUtilityTariffMutation,
  useDeleteUtilityTariffMutation,
  useGetUtilityTariffsQuery,
  useLazyGetDeletedUtilityTariffLookupQuery,
  useRestoreUtilityTariffMutation,
  useUpdateUtilityTariffMutation,
  useUploadTariffDocumentsMutation,
} from "@/store/slices/electrical-audit/utilityTariffApiSlice";
import { toast } from "sonner";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { useAppSelector } from "@/store/hooks";
import {
  downloadUtilityTariffTemplate,
  parseUtilityTariffExcel,
} from "@/components/portal/lib/electrical-audit/utility-tariff-excel";
import { UTILITY_AUDIT_STEP_IDS } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked, isUtilityAuditSheetEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditSectionSkeleton } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-skeleton";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { UtilityTariffDisplayCard } from "./utility-tariff-display-card";
import { UtilityTariffDeletedRestorePanel } from "./utility-tariff-deleted-restore-panel";
import { UtilityTariffFormModal } from "./utility-tariff-form-modal";
import {
  buildTariffPayload,
  createEmptyTariffForm,
  tariffToForm,
  toDateInput,
  type TariffModalFormState,
} from "./utility-tariff-utils";

interface UtilityTariffSectionProps {
  utilityAccountId: string;
  auditStepLocked?: boolean;
}

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

export function UtilityTariffSection({
  utilityAccountId,
  auditStepLocked = false,
}: UtilityTariffSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetUtilityTariffsQuery({
    utility_account_id: utilityAccountId,
  });

  const [createUtilityTariff, { isLoading: isCreating }] =
    useCreateUtilityTariffMutation();
  const [updateUtilityTariff, { isLoading: isUpdating }] =
    useUpdateUtilityTariffMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updateUtilityTariff);
  const [restoreUtilityTariff, { isLoading: isRestoring }] =
    useRestoreUtilityTariffMutation();
  const [lookupDeletedTariff] = useLazyGetDeletedUtilityTariffLookupQuery();
  const [deleteUtilityTariff, { isLoading: isDeleting }] =
    useDeleteUtilityTariffMutation();
  const [uploadTariffDocuments, { isLoading: isUploadingDocs }] =
    useUploadTariffDocumentsMutation();

  const tariffs = data?.data || [];

  const latestTariff = useMemo(() => {
    if (!tariffs.length) return null;
    return [...tariffs].sort(
      (a, b) =>
        new Date(b.effective_from).getTime() -
        new Date(a.effective_from).getTime(),
    )[0];
  }, [tariffs]);
  const sheetEditsLocked = isUtilityAuditSheetEditsLocked(
    auditStepLocked,
    latestTariff ? [latestTariff] : [],
  );
  const recordEditsLocked = isUtilityAuditRecordEditsLocked(
    auditStepLocked,
    latestTariff?.is_completed,
  );

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<TariffModalFormState | null>(null);
  const [deletedTariffPreview, setDeletedTariffPreview] =
    useState<UtilityTariff | null>(null);
  const [deletedLookupLoading, setDeletedLookupLoading] = useState(false);
  const [excelImporting, setExcelImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<UtilityTariffDocument | null>(
    null,
  );
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const saving = isCreating || isUpdating || isDeleting || isRestoring;

  useEffect(() => {
    if (!formModalOpen || !modalForm?.isNew || !modalForm.effective_from.trim()) {
      setDeletedTariffPreview(null);
      return;
    }

    let cancelled = false;
    setDeletedLookupLoading(true);

    void lookupDeletedTariff({
      utility_account_id: utilityAccountId,
      effective_from: modalForm.effective_from,
    })
      .unwrap()
      .then((result) => {
        if (!cancelled) {
          setDeletedTariffPreview(result.data ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeletedTariffPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDeletedLookupLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    formModalOpen,
    modalForm?.isNew,
    modalForm?.effective_from,
    utilityAccountId,
    lookupDeletedTariff,
  ]);

  const openCreateModal = () => {
    setDeletedTariffPreview(null);
    setModalForm(createEmptyTariffForm());
    setFormModalOpen(true);
  };

  const openEditModal = () => {
    if (!latestTariff) return;
    setModalForm(tariffToForm(latestTariff));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
    setDeletedTariffPreview(null);
  };

  const handleModalFieldChange = (
    key: keyof TariffModalFormState,
    value: string,
  ) => {
    setModalForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    if (!modalForm.effective_from.trim()) {
      toast.error("Effective from date is required.");
      return;
    }

    const payload = buildTariffPayload(modalForm, utilityAccountId);
    const normalizedFrom = toDateInput(modalForm.effective_from);
    const conflictingTariff = tariffs.find(
      (tariff) =>
        toDateInput(tariff.effective_from) === normalizedFrom &&
        String(tariff._id) !== String(modalForm.id ?? ""),
    );

    if (!modalForm.isNew && conflictingTariff) {
      toast.error(
        `A tariff with effective from ${normalizedFrom} already exists for this utility account. Choose a different date.`,
      );
      return;
    }

    if (modalForm.isNew && deletedTariffPreview) {
      toast.error(
        "A deleted tariff exists for this date. Use Restore or change the effective from date.",
      );
      return;
    }

    const shouldCreate = modalForm.isNew && !conflictingTariff;
    const updateId = conflictingTariff?._id ?? modalForm.id;

    if (!shouldCreate && !updateId) {
      toast.error("Utility tariff ID is missing.");
      return;
    }

    if (modalForm.isNew && conflictingTariff) {
      toast.message(
        `A tariff for ${normalizedFrom} already exists. Updating that record.`,
      );
    }

    try {
      await toastHandler({
        action: () => {
          if (shouldCreate) {
            return createUtilityTariff(payload).unwrap();
          }
          return updateUtilityTariff({
            id: updateId as string,
            ...payload,
          }).unwrap();
        },
        loading: shouldCreate
          ? "Creating utility tariff..."
          : "Updating utility tariff...",
        success: shouldCreate
          ? "Utility tariff created successfully"
          : "Utility tariff updated successfully",
      });
      closeFormModal();
    } catch (error) {
      const message =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data &&
        typeof error.data.message === "string"
          ? error.data.message
          : error instanceof Error
            ? error.message
            : "Failed to save utility tariff.";
      toast.error(message);
      console.error("Failed to save utility tariff:", error);
    }
  };

  const handleLoadDeletedIntoForm = () => {
    if (!deletedTariffPreview) return;
    setModalForm({
      ...tariffToForm(deletedTariffPreview),
      isNew: true,
      id: undefined,
    });
  };

  const handleRestoreDeleted = async () => {
    if (!deletedTariffPreview?._id || !modalForm) return;

    const payload = buildTariffPayload(modalForm, utilityAccountId);

    try {
      await toastHandler({
        action: () =>
          restoreUtilityTariff({
            id: deletedTariffPreview._id,
            ...payload,
          }).unwrap(),
        loading: "Restoring utility tariff...",
        success: "Utility tariff restored successfully",
      });
      closeFormModal();
    } catch (error) {
      console.error("Failed to restore utility tariff:", error);
    }
  };

  const handleDelete = async () => {
    if (!latestTariff?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteUtilityTariff(latestTariff._id).unwrap(),
        loading: "Deleting utility tariff...",
        success: "Utility tariff deleted successfully",
      });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete utility tariff:", error);
    }
  };

  const handleDownloadExcelTemplate = () => {
    downloadUtilityTariffTemplate();
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
      const parsed = await parseUtilityTariffExcel(file);
      const keys = Object.keys(parsed);
      if (!keys.length) {
        toast.error("No recognized fields found. Use the downloaded template.");
        return;
      }

      setModalForm({
        ...(latestTariff ? tariffToForm(latestTariff) : createEmptyTariffForm()),
        ...parsed,
        isNew: !latestTariff,
        id: latestTariff?._id,
      });
      setFormModalOpen(true);
      toast.success("Form filled from Excel. Review and save.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not read that Excel file.",
      );
    } finally {
      setExcelImporting(false);
    }
  };

  const handleOpenUploadModal = () => {
    setUploadFiles([]);
    setIsUploadModalOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!latestTariff?._id || uploadFiles.length === 0) return;

    try {
      await toastHandler({
        action: () =>
          uploadTariffDocuments({
            id: latestTariff._id,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadFiles([]);
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (doc: UtilityTariffDocument, index: number) => {
    setPreviewDoc(doc);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleUpdateCaption = async () => {
    if (!latestTariff?._id || previewDocIndex === null || !previewDoc) return;

    const updatedDocs = (latestTariff.documents ?? []).map((doc, idx) =>
      idx === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateUtilityTariff({
            id: latestTariff._id,
            existing_documents: updatedDocs,
          }).unwrap(),
        loading: "Updating document caption...",
        success: "Caption updated successfully",
      });
      setPreviewDoc((prev) =>
        prev ? { ...prev, caption: editCaptionValue } : prev,
      );
    } catch (err) {
      console.error("Failed to update caption:", err);
    }
  };

  if (isLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className="relative space-y-4">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-foreground">
            Utility Tariff
          </h3>
          <p className="text-sm text-muted-foreground">
            Tariff details are read-only on the card. Use Add or Edit to open
            the form in a modal.
          </p>
        </div>

        <div
          className={cnHideUtilityAuditEdits(
            sheetEditsLocked,
            "flex flex-wrap items-center gap-2",
          )}
        >
          <input
            id="tariff-excel-import"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleExcelFileChange}
            disabled={excelImporting}
          />
          {!latestTariff && !sheetEditsLocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCreateModal}
              className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tariff
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadExcelTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel template
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={excelImporting}
            onClick={() =>
              document.getElementById("tariff-excel-import")?.click()
            }
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {excelImporting ? "Reading…" : "Import Excel"}
          </Button>
        </div>
      </div>

      {!latestTariff ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No utility tariff configured yet.
            </p>
            {!sheetEditsLocked ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openCreateModal}
                className="mx-auto border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Utility Tariff
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <UtilityTariffDisplayCard
          tariff={latestTariff}
          auditStepLocked={auditStepLocked}
          canDelete={canDeleteRecords}
          canViewDocuments={canViewDocumentsFlag}
          saving={saving}
          onEdit={openEditModal}
          onDelete={() => setDeleteDialogOpen(true)}
          onToggleCompleteness={() =>
            void handleToggleCompleteness(latestTariff)
          }
          togglingCompleteness={completenessTargetId === latestTariff._id}
          onUploadDocuments={handleOpenUploadModal}
          onPreviewDocument={handleOpenPreview}
        />
      )}

      <UtilityTariffFormModal
        open={formModalOpen}
        onOpenChange={(open) => {
          if (!open) closeFormModal();
          else setFormModalOpen(true);
        }}
        form={modalForm}
        onFieldChange={handleModalFieldChange}
        onSave={handleSaveModal}
        saving={isCreating || isUpdating}
        deletedTariffPreview={deletedTariffPreview}
        deletedLookupLoading={deletedLookupLoading}
        onRestoreDeleted={handleRestoreDeleted}
        onLoadDeletedIntoForm={handleLoadDeletedIntoForm}
        restoring={isRestoring}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete utility tariff record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the current utility tariff record.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isUploadModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsUploadModalOpen(false);
            setUploadFiles([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload Tariff Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50"
              onClick={() =>
                document.getElementById("tariff-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="tariff-doc-file-input"
                type="file"
                multiple
                accept=".pdf,image/*"
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
                      <Label htmlFor={`tariff-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`tariff-doc-caption-${item.id}`}
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
                type="button"
                variant="outline"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFiles([]);
                }}
                disabled={isUploadingDocs}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUploadSubmit}
                disabled={isUploadingDocs || uploadFiles.length === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingDocs ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewDoc !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDoc(null);
            setPreviewDocIndex(null);
            setEditCaptionValue("");
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewDoc?.fileName || "Document Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewDoc ? (
            <div className="space-y-4">
              {previewDoc.fileType === "image" ? (
                <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                  <img
                    src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                    alt={previewDoc.fileName || "Preview"}
                    className="max-h-[55vh] w-full object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                  title={previewDoc.fileName || "PDF Preview"}
                  className="h-[55vh] w-full rounded-lg border border-border"
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="tariff-doc-caption">Document Caption</Label>
                <div className="flex gap-2">
                  <Input
                    id="tariff-doc-caption"
                    placeholder="Enter document description/caption..."
                    value={editCaptionValue}
                    onChange={(e) => setEditCaptionValue(e.target.value)}
                    disabled={recordEditsLocked}
                    className="flex-1"
                  />
                  {!recordEditsLocked ? (
                    <Button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleUpdateCaption}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" className="gap-2" asChild>
                  <a
                    href={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download / Open
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
