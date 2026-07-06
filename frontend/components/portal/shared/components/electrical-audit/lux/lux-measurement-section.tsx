"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { CustomTabs } from "@/components/portal/ui/custom-tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
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
  Download,
  FileSpreadsheet,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";
import {
  canViewDocuments,
  type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { cnHideUtilityAuditEdits, isUtilityAuditSheetEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import {
  luxMeasurementFormToExcelPrefill,
  downloadLuxMeasurementExcelTemplate,
  parseLuxMeasurementExcel,
} from "@/components/portal/lib/electrical-audit/lux-measurement-excel";
import { toastHandler } from "@/components/portal/lib/toast";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { AuditSectionSkeleton } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-skeleton";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { AuditRecordsEmptyState } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-records-empty-state";
import { useAppSelector } from "@/store/hooks";
import {
  useCreateLuxMeasurementMutation,
  useDeleteLuxMeasurementMutation,
  useGetLuxMeasurementsQuery,
  useUpdateLuxMeasurementMutation,
  useUploadLuxMeasurementDocumentsMutation,
  type LuxMeasurementRecord,
  type LuxMeasurementDocument,
} from "@/store/slices/electrical-audit/luxMeasurementApiSlice";
import { toast } from "sonner";
import { LuxMeasurementDisplayCard } from "./lux-measurement-display-card";
import { LuxMeasurementFormModal } from "./lux-measurement-form-modal";
import {
  applyLuxMeasurementExcelParsed,
  auditToForm,
  buildLuxMeasurementPayload,
  createEmptyForm,
  getLuxMeasurementTabLabel,
  sortLuxMeasurementsStable,
  type LuxMeasurementFormState,
} from "./lux-measurement-utils";

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

interface LuxMeasurementSectionProps {
  facilityId: string;
  utilityAccountId: string;
  auditStepLocked?: boolean;
}

export function LuxMeasurementSection({
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
}: LuxMeasurementSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetLuxMeasurementsQuery({ facility_id: facilityId, utility_account_id: utilityAccountId });

  const [createLuxMeasurement, { isLoading: isCreating }] =
    useCreateLuxMeasurementMutation();
  const [updateLuxMeasurement, { isLoading: isUpdating }] =
    useUpdateLuxMeasurementMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updateLuxMeasurement);
  const [deleteLuxMeasurement, { isLoading: isDeleting }] =
    useDeleteLuxMeasurementMutation();
  const [uploadLuxMeasurementDocuments, { isLoading: isUploadingDocs }] =
    useUploadLuxMeasurementDocumentsMutation();

  const luxMeasurements = useMemo(() => data?.data || [], [data]);
  const sortedRecords = useMemo(
    () => sortLuxMeasurementsStable(luxMeasurements),
    [luxMeasurements],
  );
  const sheetEditsLocked = isUtilityAuditSheetEditsLocked(
    auditStepLocked,
    sortedRecords,
  );

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<LuxMeasurementFormState | null>(null);
  const [activeLuxTabId, setActiveLuxTabId] = useState<string>("");
  const [excelImporting, setExcelImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LuxMeasurementRecord | null>(null);
  const [uploadModalRecordId, setUploadModalRecordId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<LuxMeasurementDocument | null>(null);
  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const luxTabs = useMemo(
    () =>
      sortedRecords.map((record, index) => ({
        id: record._id,
        label: getLuxMeasurementTabLabel(record, index),
      })),
    [sortedRecords],
  );

  const activeRecordIndex = useMemo(
    () => sortedRecords.findIndex((record) => record._id === activeLuxTabId),
    [sortedRecords, activeLuxTabId],
  );

  const activeRecord = useMemo(
    () =>
      activeRecordIndex >= 0 ? sortedRecords[activeRecordIndex] : null,
    [sortedRecords, activeRecordIndex],
  );

  useEffect(() => {
    if (!luxTabs.length) {
      setActiveLuxTabId("");
      return;
    }
    if (!luxTabs.some((tab) => tab.id === activeLuxTabId)) {
      setActiveLuxTabId(luxTabs[0].id);
    }
  }, [luxTabs, activeLuxTabId]);

  const openCreateModal = () => {
    setModalForm(createEmptyForm(facilityId, utilityAccountId));
    setFormModalOpen(true);
  };

  const openEditModal = (record: LuxMeasurementRecord) => {
    setModalForm(auditToForm(record));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
  };

  const handleModalFormChange = (
    updater: (prev: LuxMeasurementFormState) => LuxMeasurementFormState,
  ) => {
    setModalForm((prev) => (prev ? updater(prev) : prev));
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    const payload = buildLuxMeasurementPayload(
      modalForm,
      facilityId,
      utilityAccountId,
    );

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createLuxMeasurement(payload).unwrap();
          }
          if (modalForm.id) {
            return updateLuxMeasurement({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(new Error("AC audit record ID is missing."));
        },
        loading: modalForm.isNew
          ? "Creating lux measurement..."
          : "Updating lux measurement...",
        success: modalForm.isNew
          ? "Lux measurement created successfully"
          : "Lux measurement updated successfully",
      });
      if (modalForm.isNew && result?.data?._id) {
        setActiveLuxTabId(result.data._id);
      } else if (modalForm.id) {
        setActiveLuxTabId(modalForm.id);
      }
      closeFormModal();
    } catch (error) {
      console.error("Failed to save AC audit record:", error);
    }
  };

  const handleDelete = (record: LuxMeasurementRecord) => {
    if (!canDeleteRecords) return;
    setDeleteTarget(record);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteLuxMeasurement(deleteTarget._id).unwrap(),
        loading: "Deleting lux measurement...",
        success: "Lux measurement deleted successfully",
      });
      if (activeLuxTabId === deleteTarget._id) {
        const remaining = sortedRecords.filter(
          (record) => record._id !== deleteTarget._id,
        );
        setActiveLuxTabId(remaining[0]?._id ?? "");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete AC audit record:", error);
    }
  };

  const handleDownloadLuxMeasurementExcel = () => {
    const source =
      modalForm ??
      (sortedRecords[0]
        ? auditToForm(sortedRecords[0])
        : createEmptyForm(facilityId, utilityAccountId));
    downloadLuxMeasurementExcelTemplate(
      luxMeasurementFormToExcelPrefill({ ...source } as Record<string, unknown>),
    );
  };

  const handleLuxMeasurementExcelImport = async (e: ChangeEvent<HTMLInputElement>) => {
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
      const parsed = await parseLuxMeasurementExcel(file);
      if (!Object.keys(parsed).length) {
        toast.error(
          "No recognized fields found. Use the downloaded template (2 sheets).",
        );
        return;
      }

      const base = modalForm ?? createEmptyForm(facilityId, utilityAccountId);
      setModalForm(applyLuxMeasurementExcelParsed(base, parsed));
      setFormModalOpen(true);
      toast.success("AC audit form updated from Excel.");
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
          uploadLuxMeasurementDocuments({
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
    doc: LuxMeasurementDocument,
    recordId: string,
    idx: number,
  ) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewRecordId(recordId);
    setPreviewDocIndex(idx);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!previewRecordId || previewDocIndex === null || !previewDoc) return;
    const record = luxMeasurements.find((r) => r._id === previewRecordId);
    if (!record) return;

    const existingDocuments = (record.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateLuxMeasurement({
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

  const saving = isCreating || isUpdating || isDeleting || isUploadingDocs;

  if (isLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className="relative space-y-4">

      <div className="relative space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-foreground">
              Lux Measurements
            </h3>
            <p className="text-sm text-muted-foreground">
              Switch between lux measurements using the tabs below. Use Add or
              Edit to open the form in a modal. Upload documents from the
              documents panel.
            </p>
          </div>

          <div
            className={cnHideUtilityAuditEdits(
              sheetEditsLocked,
              "flex flex-wrap items-center gap-2",
            )}
          >
            <input
              id="lux-audit-excel-import"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={handleLuxMeasurementExcelImport}
              disabled={excelImporting}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCreateModal}
              className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Lux Measurement
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadLuxMeasurementExcel}
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
                document.getElementById("lux-audit-excel-import")?.click()
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {excelImporting ? "Reading…" : "Import Excel"}
            </Button>
          </div>
        </div>

        {sortedRecords.length === 0 ? (
          <AuditRecordsEmptyState />
        ) : (
          <div className="space-y-4">
            <CustomTabs
              tabs={luxTabs}
              activeTab={activeLuxTabId}
              onTabChange={setActiveLuxTabId}
              className="rounded-lg border bg-muted/20"
            />

            {activeRecord && activeRecordIndex >= 0 ? (
              <LuxMeasurementDisplayCard
                key={activeRecord._id}
                record={activeRecord}
                tabLabel={getLuxMeasurementTabLabel(activeRecord, activeRecordIndex)}
                auditStepLocked={auditStepLocked}
                canDelete={canDeleteRecords}
                canViewDocuments={canViewDocumentsFlag}
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

      <LuxMeasurementFormModal
        open={formModalOpen}
        onOpenChange={(open) => {
          if (!open) closeFormModal();
          else setFormModalOpen(true);
        }}
        form={modalForm}
        onFormChange={handleModalFormChange}
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
            <AlertDialogTitle>Delete lux measurement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will permanently delete this lux measurement.
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
                document.getElementById("lux-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="lux-doc-file-input"
                type="file"
                multiple
                accept="image/*,.pdf"
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
                      <Label htmlFor={`lux-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`lux-doc-caption-${item.id}`}
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
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUploadModalRecordId(null);
                setUploadFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadDocs}
              disabled={uploadFiles.length === 0 || isUploadingDocs}
            >
              {isUploadingDocs ? "Uploading…" : "Upload"}
            </Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.fileName || "Document"}</DialogTitle>
          </DialogHeader>
          {previewDoc ? (
            <div className="space-y-4">
              {previewDoc.fileType === "image" ? (
                <img
                  src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                  alt={previewDoc.fileName || "Document"}
                  className="max-h-[60vh] w-full rounded-md object-contain"
                />
              ) : (
                <iframe
                  src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                  title={previewDoc.fileName || "Document"}
                  className="h-[60vh] w-full rounded-md border"
                />
              )}
              {!auditStepLocked ? (
                <div className="space-y-2">
                  <Label htmlFor="lux-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="lux-doc-preview-caption"
                      value={editCaptionValue}
                      onChange={(e) => setEditCaptionValue(e.target.value)}
                      placeholder="Document caption"
                    />
                    <Button type="button" onClick={handleSaveCaption}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
